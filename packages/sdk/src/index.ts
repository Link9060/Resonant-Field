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

export type FieldContextRequest = {
  query: string;
  limit?: number;
  projectId?: string;
  includeRelated?: boolean;
};

export type FieldContextBundle = {
  query: string;
  hits: FieldSearchHit[];
  nodes: unknown[];
  related: unknown[];
};

/**
 * Stable consumer contract shared by Relay, RAVIN, and future Assist apps.
 * Implementations may talk to a local service or a remote Field API.
 */
export interface FieldClient {
  search(request: FieldSearchRequest): Promise<FieldSearchHit[]>;
  getNode(nodeId: string): Promise<unknown>;
  getRelated(nodeId: string): Promise<unknown[]>;
  getContext?(request: FieldContextRequest): Promise<FieldContextBundle>;
}

export * from './ravin.js';
