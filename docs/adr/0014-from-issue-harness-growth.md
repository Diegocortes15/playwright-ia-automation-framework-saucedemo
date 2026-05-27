# 0014 — /from-issue grows the test harness autonomously (data-driven AUTH_USERS)

**Date:** 2026-05-27
**Status:** Accepted

## Context

The first authenticated-page ticket (SW-2, footer on `/inventory.html`) needed a `standard` Playwright project + storageState the clean-room config didn't have. `/from-issue` had no rule for this, so it asked the user mid-run and recovered the old config from git history — both break the autonomous, PR-is-the-review-gate model ([ADR-0011](0011-jira-ticket-source.md), [ADR-0012](0012-from-issue-conventions.md)).

## Decision

`/from-issue` grows the harness **autonomously and demand-driven**:

- The authenticated projects + auth setup are **data-driven from a single `tests/users.ts` `AUTH_USERS` array**. `playwright.config.ts` derives one chromium project per user (grep `@all-users|@<user>`, storageState `auth/<user>.json`, depends on `setup`); `tests/auth.setup.ts` loops the same array.
- When a generated test targets a user whose project isn't wired, `/from-issue` **appends that user to `AUTH_USERS`** (no mid-run question, no git-history recovery) and surfaces it as a PR side-effect note. `@no-auth` tests need no user; user-agnostic tests need only `standard`.
- Growth is **incremental** — only users that tests actually target get wired. No pre-created matrix.

## Consequences

- No mid-run infrastructure questions; the PR stays the review gate.
- The structure always supports N users; adding one is a one-line append — ready for "a new user suddenly arrives."
- Cross-browser (`firefox/webkit-standard`) and `@sort-functional` stay out — still governed by [ADR-0004](0004-cross-browser-smoke-pattern.md).
- The clean-room `e2e-jira-from-issues` config is retrofitted to this shape (seeded `['standard']`); `main`'s full config is unchanged.

## Alternatives considered

- **Eager seed of all five users** — rejected: re-introduces the matrix the blank-slate removed; pays before need.
- **Standard-only unless a ticket names a user** — rejected: `@all-users` loses its "every user" meaning.
- **Hardcoded per-user project blocks** — rejected: not "supports N users"; verbose diffs; two sources of truth.

## Related

- [ADR-0004](0004-cross-browser-smoke-pattern.md) — no per-user×browser matrix (the guardrail this respects).
- [ADR-0010](0010-from-issue-augment-mode.md) — augment mode (sibling "grow, don't recreate" behavior).
