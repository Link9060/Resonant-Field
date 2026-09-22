export const KNOWLEDGE_NODE_TYPES = [
  'note',
  'file',
  'todo',
  'calendar_event',
  'project',
  'ravin_conversation',
  'chat',
  'memory',
  'link',
  'other',
] as const;

export type KnowledgeNodeType = (typeof KNOWLEDGE_NODE_TYPES)[number];

export type KnowledgeSource = {
  product: string;
  sourceId: string;
  sourceType?: string;
};

export type KnowledgeNode = {
  id: string;
  ownerId: string;
  type: KnowledgeNodeType;
  title: string;
  searchableText?: string;
  source: KnowledgeSource;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export const KNOWLEDGE_EDGE_ORIGINS = ['user', 'system', 'ravin'] as const;
export type KnowledgeEdgeOrigin = (typeof KNOWLEDGE_EDGE_ORIGINS)[number];

export type KnowledgeEdge = {
  id: string;
  ownerId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  strength: number;
  origin: KnowledgeEdgeOrigin;
  createdAt: string;
  updatedAt: string;
};
