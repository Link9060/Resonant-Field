# Integrating RAVIN

RAVIN is a first-class Field consumer alongside Relay.

The current RAVIN application is Node/Express with ES modules, so Field's public SDK intentionally avoids React, Next.js, Supabase, and browser-only dependencies. The compiled package is standard ESM and can be consumed by RAVIN directly once the Field service/API exists.

## Responsibility split

```text
RAVIN
  |
  | tool/function calls
  v
RAVIN Field adapter
  |
  v
Field SDK / Knowledge API
  |
  +-- search
  +-- nodes
  +-- relationships
  +-- project context
  +-- permissions
```

RAVIN should not query Relay's database tables directly. It should request context through Field. That preserves one retrieval/permission layer for Relay, RAVIN, and future external connectors.

## Initial RAVIN tool surface

The SDK exports `createRavinFieldTools(client)`, which exposes three model-friendly operations:

- `searchField(request)` — search user-authorized Field knowledge
- `getFieldNode(nodeId)` — retrieve one node
- `getRelatedContext(nodeId)` — follow relationships around a node

Example:

```js
import { createRavinFieldTools } from '@resonant/field-sdk';

const tools = createRavinFieldTools(fieldClient);
const result = await tools.searchField({
  query: 'Nova linkage decisions',
  limit: 8,
});
```

The adapter does **not** depend on any specific model/provider tool schema. RAVIN can map these operations to Cloudflare Workers AI, OpenAI-style function calling, or another provider without changing Field Core.

## Memory model

RAVIN memories should eventually become Field `memory` nodes with a source such as:

```json
{
  "product": "ravin",
  "sourceId": "memory_123",
  "sourceType": "permanent_memory"
}
```

RAVIN conversations can use the existing `ravin_conversation` node type. Field can relate memories and conversations to projects, files, people, notes, and plans without moving RAVIN's model/provider logic into Field.

## Permissions

RAVIN access must be checked per user and per source category. A node existing in Field does not automatically grant RAVIN access to it.

Recommended defaults:

- Notes: allowed when Field/RAVIN integration is enabled
- Files: allowed when Field/RAVIN integration is enabled
- Todos: allowed
- Calendar: allowed
- Projects: allowed
- RAVIN conversations/memories: allowed
- Relay private chats: disabled by default; explicit opt-in required

## Planned next step

When Field Service is implemented, add a real `FieldClient` implementation (likely HTTP first). RAVIN's server can initialize that client once at startup and expose the adapter methods to its AI orchestration layer.
