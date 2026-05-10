# 0005 — ESM Import Attributes for JSON

**Date:** 2026-05-10
**Status:** Accepted

## Context

`data/fixtures.ts` loads JSON files (`products.json`, scenario files). With `"type": "module"` in `package.json` and Node 22, native `import x from './x.json'` was not supported in earlier Node versions, requiring a CommonJS escape hatch via `createRequire(import.meta.url)`. This worked but mixed two module systems in one ESM file — a convention-drift trap for AI agents extending `data/fixtures.ts` in Phase C.

Node 22.13 and TypeScript 5.7+ added official support for ESM **import attributes** (`with { type: 'json' }`), which eliminate the need for the workaround.

## Decision

**Use ESM import attributes for all JSON imports in `data/fixtures.ts`:**

```ts
import productsJson from './shared/products.json' with { type: 'json' };
```

Replace the `createRequire` workaround entirely. Remove all CommonJS-style imports from this file.

## Consequences

- Single idiomatic pattern for AI agents to follow when adding new loaders
- File reads cleanly as ESM with no escape hatches
- Native browser/runtime support; no transpilation tricks
- Locks the framework to Node 22.13+ (already our baseline)
- Locks the framework to TypeScript 5.7+ (already our baseline at 5.9)
- If a future toolchain regression breaks the syntax, fallback is a single-file revert to `createRequire` (documented in Phase A.5 spec §6)

## Alternatives considered

- **Keep `createRequire` workaround** — rejected: convention-drift trap for AI agents; mixes module systems; the syntax was always intended as a temporary bridge
- **Switch `package.json` to `"type": "commonjs"`** — rejected: gives up ESM benefits; deviates from modern TypeScript defaults
- **Run a JSON-loading helper that reads file contents and parses at runtime** — rejected: loses type-checking via `resolveJsonModule`; adds I/O at every loader call
