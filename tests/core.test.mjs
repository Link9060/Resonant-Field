import test from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryFieldGraph } from '../packages/core/dist/index.js';

const now = '2026-09-22T19:00:00.000Z';

function node(id, ownerId, type, title, searchableText = '') {
  return {
    id,
    ownerId,
    type,
    title,
    searchableText,
    source: { product: 'test', sourceId: id },
    metadata: {},
    createdAt: now,
    updatedAt: now,
  };
}

test('search is owner-scoped and title weighted', () => {
  const graph = new InMemoryFieldGraph();
  graph.upsertNode(node('n1', 'levi', 'note', 'Nova suspension', 'progressive leverage ratio'));
  graph.upsertNode(node('n2', 'levi', 'file', 'Leverage notes', 'Nova suspension analysis'));
  graph.upsertNode(node('n3', 'other', 'note', 'Nova private', 'should never leak'));

  const results = graph.search('levi', 'Nova suspension');

  assert.equal(results.length, 2);
  assert.equal(results[0].node.id, 'n1');
  assert.equal(results.some((result) => result.node.id === 'n3'), false);
});

test('related nodes are returned strongest first', () => {
  const graph = new InMemoryFieldGraph();
  graph.upsertNode(node('project', 'levi', 'project', 'Nova'));
  graph.upsertNode(node('note', 'levi', 'note', 'Geometry'));
  graph.upsertNode(node('file', 'levi', 'file', 'Analysis'));

  graph.upsertEdge({
    id: 'e1', ownerId: 'levi', sourceNodeId: 'project', targetNodeId: 'note',
    relationType: 'contains', strength: .7, origin: 'user', createdAt: now, updatedAt: now,
  });
  graph.upsertEdge({
    id: 'e2', ownerId: 'levi', sourceNodeId: 'project', targetNodeId: 'file',
    relationType: 'contains', strength: .95, origin: 'system', createdAt: now, updatedAt: now,
  });

  const related = graph.getRelated('levi', 'project');

  assert.deepEqual(related.map((item) => item.node.id), ['file', 'note']);
});

test('removing a node also removes its edges', () => {
  const graph = new InMemoryFieldGraph();
  graph.upsertNode(node('a', 'levi', 'project', 'A'));
  graph.upsertNode(node('b', 'levi', 'note', 'B'));
  graph.upsertEdge({
    id: 'edge', ownerId: 'levi', sourceNodeId: 'a', targetNodeId: 'b',
    relationType: 'contains', strength: 2, origin: 'user', createdAt: now, updatedAt: now,
  });

  assert.equal(graph.snapshot('levi').edges[0].strength, 1);
  assert.equal(graph.removeNode('levi', 'b'), true);
  assert.equal(graph.snapshot('levi').edges.length, 0);
});
