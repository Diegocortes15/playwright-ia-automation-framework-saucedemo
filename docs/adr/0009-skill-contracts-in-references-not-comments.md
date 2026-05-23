# 0009 — Skill contracts must live in `references/`, not in code comments

**Status:** Accepted
**Date:** 2026-05-23

## Context

During Phase 1 of the `experiment-rebuild-from-scratch` empirical test (PR #8, closed after analysis), the `/from-issue` skill correctly updated `src/fixtures/test.ts` to register a newly-scaffolded `LoginPage` as a fixture. The skill succeeded because `src/fixtures/test.ts` contained a comment intended for human developers:

```
// Pattern when adding a page (manual step today — see GAPS.md):
//   1. import { LoginPage } from '@pages/LoginPage';
//   2. add `loginPage: LoginPage` to the Pages type
//   3. add a fixture entry: loginPage: async ({ page }, use) => { ... };
```

The LLM read this comment as instructions and followed them step-by-step. Functional success, but the skill's effective behavior is now implicit (driven by code comments) and fragile: if the comment is removed, refactored, contradicts another rule, or drifts from the actual desired behavior, the skill changes silently without anyone noticing.

## Decision

Skill behaviors that the AI relies on MUST live in `.claude/skills/<skill-name>/references/*.md`. Code comments in `src/`, `tests/`, `data/`, or any other application directory MUST NOT contain instructions intended for AI consumption.

If an existing code comment is currently being used as an implicit skill contract (the fixture comment is the known case), that behavior MUST be migrated into the appropriate skill reference doc. The code comment can then be removed without changing skill behavior.

## Consequences

**Positive:**

- Skill contract surface is well-defined: `references/` is the source of truth
- Code comments stay focused on human readers
- Skill behavior changes happen via PR to the skill files, not via PR to unrelated source code
- Future skill maintainers know where to look for the contract

**Negative:**

- Slight duplication risk: a pattern explained in code comments AND in `references/` can drift
- Migration cost: existing instructive comments need to be moved (small one-time cost — the fixture comment is the only known case as of D.1)

## Verification

After D.1 ships, the `src/fixtures/test.ts` comment that drives `/scaffold-page-object`'s registration behavior MUST be removed. Re-running `/from-issue` on a fresh blank-slate branch must still produce a working test — proving the behavior is now driven by [`scaffold-page-object/references/workflow.md`](../../.claude/skills/scaffold-page-object/references/workflow.md) Step 11.5, not the comment.

## Related

- [ADR-0008](0008-custom-skills-pattern.md) — custom skills pattern (parent decision)
- Phase D.1 design spec — `docs/superpowers/specs/2026-05-23-phase-d1-skill-hardening-design.md`
