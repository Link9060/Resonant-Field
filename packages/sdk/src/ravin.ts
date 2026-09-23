import type { FieldClient, FieldSearchRequest } from './index.js';

export type RavinFieldToolResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
};

export type RavinFieldTools = {
  searchField(input: FieldSearchRequest): Promise<RavinFieldToolResult<unknown>>;
  getFieldNode(nodeId: string): Promise<RavinFieldToolResult<unknown>>;
  getFieldNodeContent(nodeId: string): Promise<RavinFieldToolResult<unknown>>;
  getRelatedContext(nodeId: string): Promise<RavinFieldToolResult<unknown>>;
};

/**
 * Wraps a Field client in a small, model-friendly tool surface for RAVIN.
 * The adapter is deliberately framework/provider agnostic: RAVIN can map
 * these functions to whichever LLM tool/function-calling format it uses.
 */
export function createRavinFieldTools(client: FieldClient): RavinFieldTools {
  return {
    async searchField(input) {
      try {
        return { ok: true, data: await client.search(input) };
      } catch (error) {
        return { ok: false, error: toMessage(error) };
      }
    },

    async getFieldNode(nodeId) {
      try {
        return { ok: true, data: await client.getNode(nodeId) };
      } catch (error) {
        return { ok: false, error: toMessage(error) };
      }
    },

    async getFieldNodeContent(nodeId) {
      if (!client.getNodeContent) {
        return { ok: false, error: 'This Field client does not support node content retrieval.' };
      }
      try {
        return { ok: true, data: await client.getNodeContent(nodeId) };
      } catch (error) {
        return { ok: false, error: toMessage(error) };
      }
    },

    async getRelatedContext(nodeId) {
      try {
        return { ok: true, data: await client.getRelated(nodeId) };
      } catch (error) {
        return { ok: false, error: toMessage(error) };
      }
    },
  };
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown Field error';
}
