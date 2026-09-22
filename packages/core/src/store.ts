import { normalizeRelationshipStrength, oppositeNodeId, touchesNode } from './graph.js';
import type { KnowledgeEdge, KnowledgeNode, KnowledgeNodeType } from './types.js';

export type FieldSearchOptions = {
  limit?: number;
  types?: KnowledgeNodeType[];
};

export type FieldSearchResult = {
  node: KnowledgeNode;
  score: number;
};

export type RelatedNode = {
  edge: KnowledgeEdge;
  node: KnowledgeNode;
};

/**
 * A dependency-free reference implementation of the Field graph contract.
 * This is not intended to replace production persistence; it gives Relay,
 * RAVIN, tests, and local tooling one predictable behavior to build against.
 */
export class InMemoryFieldGraph {
  private readonly nodes = new Map<string, KnowledgeNode>();
  private readonly edges = new Map<string, KnowledgeEdge>();

  upsertNode(node: KnowledgeNode): KnowledgeNode {
    const stored = structuredClone(node);
    this.nodes.set(node.id, stored);
    return structuredClone(stored);
  }

  upsertEdge(edge: KnowledgeEdge): KnowledgeEdge {
    if (!this.nodes.has(edge.sourceNodeId) || !this.nodes.has(edge.targetNodeId)) {
      throw new Error('Both edge endpoints must exist before an edge can be stored.');
    }

    const stored: KnowledgeEdge = {
      ...structuredClone(edge),
      strength: normalizeRelationshipStrength(edge.strength),
    };

    this.edges.set(edge.id, stored);
    return structuredClone(stored);
  }

  getNode(ownerId: string, nodeId: string): KnowledgeNode | null {
    const node = this.nodes.get(nodeId);
    if (!node || node.ownerId !== ownerId) return null;
    return structuredClone(node);
  }

  getRelated(ownerId: string, nodeId: string): RelatedNode[] {
    const node = this.getNode(ownerId, nodeId);
    if (!node) return [];

    const results: RelatedNode[] = [];

    for (const edge of this.edges.values()) {
      if (edge.ownerId !== ownerId || !touchesNode(edge, nodeId)) continue;

      const relatedId = oppositeNodeId(edge, nodeId);
      if (!relatedId) continue;

      const related = this.nodes.get(relatedId);
      if (!related || related.ownerId !== ownerId) continue;

      results.push({
        edge: structuredClone(edge),
        node: structuredClone(related),
      });
    }

    return results.sort((a, b) => b.edge.strength - a.edge.strength);
  }

  search(ownerId: string, query: string, options: FieldSearchOptions = {}): FieldSearchResult[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const tokens = normalized.split(/\s+/).filter(Boolean);
    const allowedTypes = options.types ? new Set(options.types) : null;
    const limit = Math.max(1, Math.min(options.limit ?? 10, 50));

    return [...this.nodes.values()]
      .filter((node) => node.ownerId === ownerId)
      .filter((node) => !allowedTypes || allowedTypes.has(node.type))
      .map((node) => ({
        node,
        score: scoreNode(node, normalized, tokens),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || b.node.updatedAt.localeCompare(a.node.updatedAt))
      .slice(0, limit)
      .map((result) => ({
        score: result.score,
        node: structuredClone(result.node),
      }));
  }

  removeNode(ownerId: string, nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.ownerId !== ownerId) return false;

    this.nodes.delete(nodeId);

    for (const [edgeId, edge] of this.edges) {
      if (edge.ownerId === ownerId && touchesNode(edge, nodeId)) {
        this.edges.delete(edgeId);
      }
    }

    return true;
  }

  snapshot(ownerId: string): { nodes: KnowledgeNode[]; edges: KnowledgeEdge[] } {
    return {
      nodes: [...this.nodes.values()]
        .filter((node) => node.ownerId === ownerId)
        .map((node) => structuredClone(node)),
      edges: [...this.edges.values()]
        .filter((edge) => edge.ownerId === ownerId)
        .map((edge) => structuredClone(edge)),
    };
  }
}

function scoreNode(node: KnowledgeNode, query: string, tokens: string[]): number {
  const title = node.title.toLowerCase();
  const text = (node.searchableText ?? '').toLowerCase();
  const source = `${node.source.product} ${node.source.sourceType ?? ''}`.toLowerCase();

  let score = 0;

  if (title === query) score += 100;
  else if (title.includes(query)) score += 50;

  for (const token of tokens) {
    if (title.includes(token)) score += 12;
    if (text.includes(token)) score += 4;
    if (source.includes(token)) score += 2;
  }

  return score;
}
