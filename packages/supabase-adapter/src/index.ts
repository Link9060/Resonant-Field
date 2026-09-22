import type {
  FieldClient,
  FieldSearchHit,
  FieldSearchRequest,
} from '@resonant/field-sdk';

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

function throwIfError(error: unknown): void {
  if (!error) return;

  if (error instanceof Error) throw error;

  if (typeof error === 'object' && error !== null && 'message' in error) {
    throw new Error(String((error as { message: unknown }).message));
  }

  throw new Error('Field Supabase operation failed.');
}
