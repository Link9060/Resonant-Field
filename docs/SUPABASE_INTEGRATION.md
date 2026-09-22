# Supabase integration

Field includes a portable migration and a lightweight Supabase adapter.

## 1. Apply the migration

```text
supabase/migrations/0001_field_core.sql
```

The migration expects Supabase Auth (`auth.users`) and Storage. It does **not** require Relay tables.

Do not apply it blindly to a production project without reviewing the migration and taking a database backup.

## 2. Pass an existing Supabase client

Relay already has Supabase clients. It can pass one directly:

```ts
import { createSupabaseFieldClient } from '@resonant/field-supabase';

const field = createSupabaseFieldClient(supabase);

await field.search({
  query: 'Nova suspension',
  limit: 8,
});
```

## 3. RAVIN-safe retrieval

RAVIN should use the permission-filtered search RPC:

```ts
const ravinField = createSupabaseFieldClient(supabase, {
  searchMode: 'ravin',
});
```

That routes searches through `field_search_ravin`, which only returns nodes whose source type has `ravin_read = true`.

## 4. Source preferences

Before a source is exposed to RAVIN, the user/app should create a preference row.

Example:

```ts
await field.setSourcePreference({
  user_id: user.id,
  source_product: 'relay',
  source_type: 'note',
  indexed: true,
  ravin_read: true,
});
```

Private chats should remain disabled unless the user explicitly enables them.

## Important authentication rule

Never accept `user_id` from an untrusted request and then use a service-role client to write it directly. The normal path should use the authenticated user's Supabase session so RLS validates ownership.
