# Contributing

## Branches

Use short-lived feature branches and merge through pull requests once the project begins active development.

Recommended naming:

- `feat/node-storage`
- `feat/file-ingestion`
- `fix/search-permissions`
- `docs/architecture`

## Before merging

Run:

```bash
npm install
npm run check
```

Keep product-specific behavior out of `packages/core` unless it is part of the stable Field contract.
