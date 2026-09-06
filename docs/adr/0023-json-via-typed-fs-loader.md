# 0023 — JSON loads through a typed fs loader (supersedes ADR-0005)

**Date:** 2026-09-06
**Status:** Accepted. Supersedes [ADR-0005](0005-esm-import-attributes-for-json.md).
**Enforced by:** `no-restricted-syntax` in `eslint.config.js` — an `ImportDeclaration` carrying import attributes fails the build.

## Context

ADR-0005 chose ESM import attributes (`import x from './x.json' with { type: 'json' }`) for JSON, and they were implemented in `66a88ad`. They were removed on 2026-05-24 in `63fae8e` during the phase-E blank slate: they proved brittle through Playwright's ESM loader. `data/fixtures.ts` has read JSON through `fs` ever since, and its own comment says why.

The ADR stayed `Accepted` for three and a half months. Nothing caught it. Four files cite ADR-0005 — `docs/architecture.md`, ADR-0003, and two planning docs — but every one of them merely _discusses_ the decision. The file it governs never named it, and no check tested it. A reader following the ADRs today would conclude `data/fixtures.ts` is in violation and "fix" it back into the shape that was already rejected.

## Decision

- **JSON is read through the typed loader in `data/fixtures.ts`**: `readFileSync` + `JSON.parse`, resolved relative to `import.meta.url`, exposed as typed named exports. Specs import datasets from `@data/fixtures` and never read JSON directly.
- **Import attributes are banned by lint**, not by prose. The rule names this ADR in its message, so the next person to try one is told why in the place they are trying it.

## Consequences

- The decision cannot silently drift again: reintroducing an import attribute fails CI.
- The loader costs a function call per dataset at import time, which is irrelevant next to browser startup.
- `createRequire` is not needed, so the file stays pure ESM — the original point of ADR-0005 survives even though its mechanism did not.
- ADR-0005 is now marked superseded rather than edited, per the template rule.

## Alternatives considered

- **Keep ADR-0005 and restore import attributes.** Rejected: they were removed for a concrete reason that still holds — Playwright's ESM loader.
- **Edit ADR-0005 in place to describe the fs loader.** Rejected: CLAUDE.md and the ADR template both require a superseding record. The history of a reversed decision is the part worth keeping; three months of silent drift is exactly the thing a reader needs to see.
- **Leave it as prose with no lint rule.** Rejected — that is what produced this ADR. An invariant a machine can check should be checked by one.
