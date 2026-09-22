# Resonant Field

**Resonant Field** is the shared knowledge, relationship, retrieval, and context layer for Resonant Assist projects.

Field is **not intended to be a standalone consumer app**. Products such as Relay and RAVIN use Field as a module/service to represent notes, files, tasks, events, projects, AI memory, and other user-owned information as a connected knowledge graph.

## What Field owns

- Universal knowledge nodes and edges
- File/content ingestion interfaces
- Search and retrieval contracts
- Semantic relationship metadata
- Project/context boundaries
- Permission-aware access rules
- A reusable SDK for Resonant Assist products
- Field Explorer, a lightweight developer/debug interface

## What Field does not own

- Relay's main UI, chats, planner, or calendar UI
- RAVIN's model/provider logic
- Product-specific authentication screens
- Product-specific source-of-truth tables

Field references product data instead of replacing every product database.

## Repository layout

```text
apps/explorer/       Internal Field Explorer / GitHub Pages site
packages/core/       Shared graph types and core utilities
packages/sdk/        Client contract for apps such as Relay and RAVIN
schemas/             Portable JSON schemas
docs/                Architecture, roadmap, integrations, decisions
.github/workflows/   CI and GitHub Pages deployment
```

## Live prototype

Field Explorer: https://link9060.github.io/Resonant-Field/

The Explorer currently supports an interactive graph, search/filtering, relationship inspection, a RAVIN retrieval demo, and browser-local custom node creation.

## Current status

**Foundation / v0.1**

The initial goal is to establish a stable data contract before building storage, embeddings, ingestion, or the particle graph.

## First integration targets

Relay will be the first UI consumer, while RAVIN is a first-class AI consumer of the same Field contracts. The intended initial sources are:

1. Notes
2. Files
3. Todos
4. Calendar events
5. Projects
6. RAVIN conversations

Normal Relay chats should remain opt-in and disabled for Field access by default.

## Local checks

```bash
npm install
npm run check
```

## Field Explorer

`apps/explorer` is deliberately static and dependency-free so the development dashboard can deploy reliably through GitHub Pages even while the engine changes underneath it.

See [Architecture](docs/ARCHITECTURE.md), [Relay integration](docs/INTEGRATING_RELAY.md), [RAVIN integration](docs/INTEGRATING_RAVIN.md), and [Roadmap](docs/ROADMAP.md).
