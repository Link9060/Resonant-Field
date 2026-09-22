# Relay Integration Strategy

Relay currently uses Next.js, React, TypeScript, and Supabase. Field should integrate without forcing Relay to move its source-of-truth data into a new database immediately.

## Adapter pattern

Product changes create/update a corresponding Field node.

```text
Relay action
    |
    +--> Relay database write
    |
    +--> Field adapter
             |
             +--> upsert KnowledgeNode
```

Planned adapter functions:

```ts
syncNoteToField(note)
syncTodoToField(todo)
syncCalendarEventToField(event)
syncProjectToField(project)
```

## Initial privacy defaults

| Source | Field | RAVIN | External AI |
| --- | --- | --- | --- |
| Notes | On | On | User-controlled |
| Files | On | On | User-controlled |
| Todos | On | On | User-controlled |
| Calendar | On | On | User-controlled |
| Projects | On | On | User-controlled |
| RAVIN conversations | On | On | User-controlled |
| Relay chats | Off | Off | Off |

These are design defaults, not permanent policy.
