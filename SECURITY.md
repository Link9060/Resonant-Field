# Security

Field is expected to handle private user knowledge. Security and permission checks are product requirements, not optional enhancements.

## Core principles

- Never trust a client-supplied `ownerId`.
- Resolve ownership from authenticated server context.
- Apply authorization before search/retrieval results are returned.
- Do not expose raw database access to RAVIN, ChatGPT, or other AI systems.
- External integrations should receive narrow tools/API methods.
- Read access and write access are separate permissions.
- Relay chats are not indexed by default.
- Secrets, tokens, and service keys must never be committed to this repository.

## Reporting

Until a dedicated security contact is established, keep security reports private rather than opening a public issue containing exploit details.
