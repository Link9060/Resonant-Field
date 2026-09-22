# Field security model

Field is expected to become one of the most sensitive shared components in Resonant Assist. The design therefore assumes **deny by default across app boundaries**.

## User isolation

Every persistent Field object carries `user_id`.

Postgres Row Level Security restricts normal authenticated clients to rows where:

```sql
auth.uid() = user_id
```

Edges use composite foreign keys `(node_id, user_id)`, so a malformed or malicious write cannot create a relationship into another user's graph.

## AI access is not the same as user access

A user being able to see an object does not automatically mean an AI consumer may retrieve it.

`field_source_preferences` separately controls:

- whether a source is indexed
- whether RAVIN may read it
- whether external AI may read it
- whether AI/app writeback is allowed

Private Relay chat should remain disabled by default.

## File isolation

The `field-files` storage bucket is private.

Object paths are namespaced:

```text
<user-uuid>/<object-id>/<filename>
```

Storage RLS verifies the first folder component equals the current authenticated user.

## Service-role warning

Supabase service-role credentials bypass RLS. A RAVIN backend or future connector that uses service-role access must perform equivalent authorization in the Field service and must never accept `user_id` blindly from an untrusted client.

Where practical, prefer delegating the end user's authenticated token so database RLS remains part of the enforcement chain.
