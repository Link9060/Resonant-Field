# ADR 0002 — Reference product data instead of replacing it

**Status:** Accepted

## Decision

Existing product tables remain the source of truth. Field nodes reference product objects through `source` metadata.

## Why

This allows Field to be adopted incrementally and avoids rewriting Relay features such as todos, notes, and calendar before the graph layer is proven.
