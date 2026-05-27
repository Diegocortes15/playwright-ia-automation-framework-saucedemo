# 0015 — Spec tags via Playwright's `{ tag }` option (one feature file, many user-contexts)

**Date:** 2026-05-27
**Status:** Accepted

## Context

The framework baked the routing tag into the describe **title** (`test.describe('inventory @problem', …)`) with one outer describe per feature file. SW-4 (`@standard` inventory content) then had nowhere to go — `tests/inventory/inventory.spec.ts` already existed as SW-3's `@problem` spec, and a second user-context can't share that title-tagged describe. The wider Playwright idiom separates **behavior** (file + describe) from **context** (user/role → tags + projects), and Playwright ≥1.42 (repo on 1.59) offers a first-class `{ tag }` option.

## Decision

All spec tags move from the title into Playwright's **`{ tag }` option**:

- **Routing tags** (`@no-auth` / `@all-users` / `@standard` / `@problem` / `@performance_glitch` / `@error` / `@visual` / `@sort-functional`) go on the **`test.describe`**.
- **`@smoke`** goes on the individual **`test`**.
- A feature file holds **one sibling `test.describe('<feature> — <context-label>', { tag })` per user-context**; bucket describes (Positive/Negative/Edge) stay inside each. Titles are pure prose.
- `/from-issue` augments by **find-or-create on the routing tag**: insert into the matching context describe, or add a new sibling.

Project `grep` (`/@all-users|@<user>/`) still routes each describe to its project — **verified**: option-tags are matched by `grep`. Tags render as report chips natively.

## Consequences

- One feature = one file across all user-contexts; no per-user file splitting.
- The collision class (SW-4) is gone; `/from-issue` augment is context-aware.
- Titles are clean; no duplicate-chip / leaked-paren issues (the Phase-F "no parens in title" rule is retired).
- `npm run test:smoke` (`--grep @smoke`) still works (grep matches the option tag).

## Alternatives considered

- **Split by user into separate files** (`--new-file`). Rejected as primary: fragments a feature; user/role is a matrix dimension, not a file boundary. Kept as a manual escape hatch.
- **Move only the routing tag, keep `@smoke` in the title.** Rejected: mixed convention, dual template logic.

## Related

- Supersedes the tag-in-title rule in `.claude/skills/from-issue/references/test-template.md`.
- [ADR-0004](0004-cross-browser-smoke-pattern.md) (tag vocabulary), [ADR-0010](0010-from-issue-augment-mode.md) (augment), [ADR-0012](0012-from-issue-conventions.md) (from-issue conventions).
