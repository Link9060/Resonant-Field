# Architecture

## Position in Resonant Assist

```text
                     Resonant Assist
                           |
                     Field Engine
                ___________|___________
               |           |           |
             Relay       RAVIN     Future apps
               |           |
               |      retrieval/tools
               |
          Relay Field UI
```

Field is a shared platform module. It should expose stable contracts while allowing each product to keep its own domain-specific storage and UI.

## Layers

### 1. Field Core

Framework-independent TypeScript types and graph behavior:

- `KnowledgeNode`
- `KnowledgeEdge`
- RAVIN-compatible consumer contracts
- node/edge validation
- relationship strengths
- source/origin metadata

### 2. Field Service

Planned server-side capabilities:

- persistence
- permissions
- ingestion
- file chunking
- keyword search
- vector search
- hybrid ranking
- relationship discovery

The first production implementation will likely sit alongside the existing Supabase-based Relay stack, but the core package must not depend on Supabase.

### 3. Field SDK

A stable, framework-independent API consumed by Relay, RAVIN, and future Resonant Assist apps. RAVIN uses a thin tool adapter over the same client contract rather than querying product databases directly.

Example future calls:

```ts
field.search({ query: 'Nova suspension' });
field.getNode(nodeId);
field.getRelated(nodeId);
field.getProjectContext(projectId);
```

### 4. Field Explorer

An internal developer/debug UI for inspecting:

- node counts
- edge counts
- ingestion health
- search results
- graph structure
- permission behavior

It is not the consumer-facing Relay Field experience.

## Source-of-truth rule

Field does not automatically become the source of truth for existing product objects.

For example, Relay keeps its todo row. Field creates a node referencing that row:

```text
Relay todo row
      |
      +---- Field KnowledgeNode
```

This avoids a dangerous rewrite of mature product features.

## Security boundary

Every node belongs to an owner or an explicitly authorized scope. External AI access must be permission-gated separately from whether an item exists in Field.

Chats should be disabled for external/AI retrieval by default until a user explicitly opts in.
