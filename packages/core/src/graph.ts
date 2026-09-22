import type { KnowledgeEdge } from './types.js';

export function normalizeRelationshipStrength(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function touchesNode(edge: KnowledgeEdge, nodeId: string): boolean {
  return edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId;
}

export function oppositeNodeId(edge: KnowledgeEdge, nodeId: string): string | null {
  if (edge.sourceNodeId === nodeId) return edge.targetNodeId;
  if (edge.targetNodeId === nodeId) return edge.sourceNodeId;
  return null;
}
