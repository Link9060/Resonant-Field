# Field production data model

Field's first production persistence target is PostgreSQL/Supabase because Relay already uses Supabase Auth and Postgres. The schema is intentionally **not Relay-specific**.

## Tables

### `field_nodes`

Universal searchable representation of a Resonant object.

Important rule: the original product remains the source of truth. A Relay todo still lives in Relay's todo table; Field stores a searchable reference to it.

### `field_edges`

Relationships between nodes. Composite foreign keys include `user_id`, preventing an edge from ever linking two users' graphs.

### `field_source_preferences`

User-controlled source permissions.

Example:

| Product | Source type | Indexed | RAVIN read | External AI |
| --- | --- | ---: | ---: | ---: |
| relay | note | Yes | Yes | No |
| relay | todo | Yes | Yes | No |
| relay | chat | No | No | No |
| ravin | permanent_memory | Yes | Yes | No |

### `field_files`

Metadata for private uploaded files. Actual bytes live in the private `field-files` Supabase Storage bucket.

Object paths must begin with the authenticated user's UUID.

### `field_chunks`

Extracted text chunks belonging to a node. Embeddings are intentionally not in v0.1 because choosing a vector dimension before choosing the embedding provider would unnecessarily lock the schema.

## Search

Two initial SQL RPCs are included:

- `field_search_nodes` — normal owner-scoped search.
- `field_search_ravin` — owner-scoped search that additionally requires the source to grant RAVIN read permission.

Both rely on RLS and PostgreSQL full-text search.

## Why auth.users instead of Relay profiles?

Field is a Resonant Assist module, not a Relay subsystem. Referencing `auth.users` allows the same storage schema to serve Relay, RAVIN, and future Resonant products that share authentication without requiring Relay's profile table.
