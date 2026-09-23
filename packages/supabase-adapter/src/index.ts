export type FieldSearchRequest = {
  query: string;
  limit?: number;
  types?: string[];
  projectId?: string;
};

export type FieldSearchHit = {
  nodeId: string;
  title: string;
  type: string;
  score: number;
  snippet?: string;
};

export interface FieldClient {
  search(request: FieldSearchRequest): Promise<FieldSearchHit[]>;
  getNode(nodeId: string): Promise<unknown>;
  getRelated(nodeId: string): Promise<unknown[]>;
  getNodeContent?(nodeId: string): Promise<FieldNodeContentBundle | null>;
}

export type FieldNodeContentBundle = {
  node: any;
  content: any | null;
  file: any | null;
  previewUrl: string | null;
};

export type FieldFileUpload = {
  userId: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes: number;
  body: Blob | ArrayBuffer | Uint8Array;
  sourceProduct?: string;
  sourceType?: string;
  title?: string;
  metadata?: Record<string, unknown>;
};

export type FieldSearchMode = 'owner' | 'ravin';

export type SupabaseLikeClient = {
  from(table: string): any;
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<{
    data: any;
    error: any;
  }>;
  storage?: {
    from(bucket: string): any;
  };
};

export type SupabaseFieldClientOptions = {
  searchMode?: FieldSearchMode;
};

export type FieldNodeWrite = {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  searchable_text?: string | null;
  source_product: string;
  source_id: string;
  source_type?: string;
  metadata?: Record<string, unknown>;
};

export type FieldEdgeWrite = {
  id?: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  strength?: number;
  origin?: 'user' | 'system' | 'ravin';
  metadata?: Record<string, unknown>;
};

export type FieldSourcePreferenceWrite = {
  user_id: string;
  source_product: string;
  source_type: string;
  indexed?: boolean;
  ravin_read?: boolean;
  external_ai_read?: boolean;
  allow_writeback?: boolean;
};

/**
 * Thin adapter over the Field Supabase schema.
 *
 * It deliberately accepts a structural Supabase-like client rather than
 * importing @supabase/supabase-js directly. Relay can pass its existing
 * browser/server Supabase client; RAVIN can pass whichever authenticated
 * client it creates for the current user.
 */
export class SupabaseFieldClient implements FieldClient {
  private readonly searchMode: FieldSearchMode;

  constructor(
    private readonly supabase: SupabaseLikeClient,
    options: SupabaseFieldClientOptions = {},
  ) {
    this.searchMode = options.searchMode ?? 'owner';
  }

  async search(request: FieldSearchRequest): Promise<FieldSearchHit[]> {
    const rpcName = this.searchMode === 'ravin'
      ? 'field_search_ravin'
      : 'field_search_nodes';

    const { data, error } = await this.supabase.rpc(rpcName, {
      p_query: request.query,
      p_limit: request.limit ?? 20,
      p_types: request.types ?? null,
    });

    throwIfError(error);

    return (data ?? []).map((row: any) => ({
      nodeId: row.id,
      title: row.title,
      type: row.type,
      score: Number(row.score ?? 0),
      snippet: undefined,
    }));
  }

  async getNode(nodeId: string): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('field_nodes')
      .select('*')
      .eq('id', nodeId)
      .maybeSingle();

    throwIfError(error);
    return data ?? null;
  }

  async getNodeContent(nodeId: string): Promise<FieldNodeContentBundle | null> {
    const node = await this.getNode(nodeId) as any;
    if (!node) return null;

    const [{ data: content, error: contentError }, { data: file, error: fileError }] = await Promise.all([
      this.supabase
        .from('field_node_content')
        .select('*')
        .eq('node_id', nodeId)
        .maybeSingle(),
      this.supabase
        .from('field_files')
        .select('*')
        .eq('node_id', nodeId)
        .maybeSingle(),
    ]);

    throwIfError(contentError);
    throwIfError(fileError);

    let previewUrl: string | null = null;
    const previewBucket = content?.preview_bucket_id ?? file?.bucket_id ?? null;
    const previewPath = content?.preview_object_path ?? file?.object_path ?? null;

    if (previewBucket && previewPath && this.supabase.storage) {
      const { data, error } = await this.supabase.storage
        .from(previewBucket)
        .createSignedUrl(previewPath, 300);
      throwIfError(error);
      previewUrl = data?.signedUrl ?? null;
    }

    return {
      node,
      content: content ?? null,
      file: file ?? null,
      previewUrl,
    };
  }

  async uploadFile(input: FieldFileUpload): Promise<FieldNodeContentBundle> {
    if (!this.supabase.storage) {
      throw new Error('This Supabase client does not expose Storage.');
    }

    if (input.sizeBytes < 0 || input.sizeBytes > 52_428_800) {
      throw new Error('Field files must be 50 MB or smaller.');
    }

    const cleanName = sanitizeFileName(input.fileName);
    const objectId = crypto.randomUUID();
    const objectPath = `${input.userId}/${objectId}/${cleanName}`;
    const mimeType = input.mimeType ?? 'application/octet-stream';
    const sourceProduct = input.sourceProduct ?? 'field';
    const sourceType = input.sourceType ?? (mimeType.startsWith('image/') ? 'image' : 'file');

    const { error: uploadError } = await this.supabase.storage
      .from('field-files')
      .upload(objectPath, input.body, {
        contentType: mimeType,
        upsert: false,
      });

    throwIfError(uploadError);

    let node: any = null;

    try {
      node = await this.upsertNode({
        user_id: input.userId,
        type: 'file',
        title: input.title?.trim() || cleanName,
        searchable_text: cleanName,
        source_product: sourceProduct,
        source_id: objectId,
        source_type: sourceType,
        metadata: {
          ...(input.metadata ?? {}),
          file_name: cleanName,
          mime_type: mimeType,
          size_bytes: input.sizeBytes,
        },
      }) as any;

      const { error: fileError } = await this.supabase
        .from('field_files')
        .insert({
          user_id: input.userId,
          node_id: node.id,
          bucket_id: 'field-files',
          object_path: objectPath,
          file_name: cleanName,
          mime_type: mimeType,
          size_bytes: input.sizeBytes,
          extraction_status: mimeType.startsWith('text/') ? 'pending' : 'ready',
        });

      throwIfError(fileError);

      const contentKind = mimeType.startsWith('image/') ? 'image' : 'file';
      const { error: contentError } = await this.supabase
        .from('field_node_content')
        .upsert({
          node_id: node.id,
          user_id: input.userId,
          content_kind: contentKind,
          text_content: null,
          structured_content: {
            file_name: cleanName,
            size_bytes: input.sizeBytes,
          },
          mime_type: mimeType,
          preview_bucket_id: mimeType.startsWith('image/') ? 'field-files' : null,
          preview_object_path: mimeType.startsWith('image/') ? objectPath : null,
          preview_alt: mimeType.startsWith('image/') ? cleanName : null,
        }, {
          onConflict: 'node_id',
        });

      throwIfError(contentError);

      const bundle = await this.getNodeContent(node.id);
      if (!bundle) throw new Error('Field file was created but could not be reloaded.');
      return bundle;
    } catch (error) {
      if (node?.id) {
        try { await this.deleteNode(node.id); } catch {}
      }
      try {
        await this.supabase.storage.from('field-files').remove([objectPath]);
      } catch {}
      throw error;
    }
  }

  async getRelated(nodeId: string): Promise<unknown[]> {
    const { data: edgeRows, error: edgeError } = await this.supabase
      .from('field_edges')
      .select('*')
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
      .order('strength', { ascending: false });

    throwIfError(edgeError);

    const edges = edgeRows ?? [];
    const relatedIds = [...new Set(
      edges.map((edge: any) =>
        edge.source_node_id === nodeId
          ? edge.target_node_id
          : edge.source_node_id
      )
    )];

    if (relatedIds.length === 0) return [];

    const { data: nodeRows, error: nodeError } = await this.supabase
      .from('field_nodes')
      .select('*')
      .in('id', relatedIds);

    throwIfError(nodeError);

    const nodesById = new Map(
      (nodeRows ?? []).map((node: any) => [node.id, node])
    );

    return edges.flatMap((edge: any) => {
      const relatedId = edge.source_node_id === nodeId
        ? edge.target_node_id
        : edge.source_node_id;
      const node = nodesById.get(relatedId);
      return node ? [{ edge, node }] : [];
    });
  }

  async upsertNode(node: FieldNodeWrite): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('field_nodes')
      .upsert({
        ...node,
        source_type: node.source_type ?? 'default',
        metadata: node.metadata ?? {},
      }, {
        onConflict: 'user_id,source_product,source_id',
      })
      .select('*')
      .single();

    throwIfError(error);
    return data;
  }

  async upsertEdge(edge: FieldEdgeWrite): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('field_edges')
      .upsert({
        ...edge,
        strength: edge.strength ?? 1,
        origin: edge.origin ?? 'system',
        metadata: edge.metadata ?? {},
      }, {
        onConflict: 'user_id,source_node_id,target_node_id,relation_type',
      })
      .select('*')
      .single();

    throwIfError(error);
    return data;
  }

  async setSourcePreference(
    preference: FieldSourcePreferenceWrite,
  ): Promise<unknown> {
    const { data, error } = await this.supabase
      .from('field_source_preferences')
      .upsert({
        indexed: true,
        ravin_read: false,
        external_ai_read: false,
        allow_writeback: false,
        ...preference,
      }, {
        onConflict: 'user_id,source_product,source_type',
      })
      .select('*')
      .single();

    throwIfError(error);
    return data;
  }

  async deleteNode(nodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('field_nodes')
      .delete()
      .eq('id', nodeId);

    throwIfError(error);
  }
}

export function createSupabaseFieldClient(
  supabase: SupabaseLikeClient,
  options?: SupabaseFieldClientOptions,
): SupabaseFieldClient {
  return new SupabaseFieldClient(supabase, options);
}

function sanitizeFileName(value: string): string {
  const trimmed = value.trim().slice(0, 180) || 'file';
  return trimmed.replace(/[^a-zA-Z0-9._ -]/g, '_');
}

function throwIfError(error: unknown): void {
  if (!error) return;

  if (error instanceof Error) throw error;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    throw new Error(String((error as { message: unknown }).message));
  }

  throw new Error('Field Supabase operation failed.');
}
