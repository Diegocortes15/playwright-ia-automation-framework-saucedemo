# 0002 — Multi-User via Playwright Projects + storageState + Role Tags

**Date:** 2026-05-09
**Status:** Accepted

## Context

Saucedemo provides 6 user accounts, each with different intentional behaviors. Tests need to:

- Run the same test against multiple users (e.g., "browse inventory" on all 5 authenticated users)
- Pin certain tests to specific users (e.g., "broken images" only makes sense on `problem_user`)
- Run login tests with no pre-existing session
- Be fast (auth-once, reuse session for the rest of the run)

Three approaches were evaluated.

## Decision

**Use Playwright Projects + `storageState` + role tags.**

- A `setup` project (`tests/auth.setup.ts`) logs in 5 users at the start of each run and saves session state to `auth/<user>.json` (gitignored)
- Each authenticated user has its own Playwright project (`standard`, `problem`, `performance_glitch`, `error`, `visual`) that loads its `storageState`
- A `no-auth` project handles login tests (no storageState; runs `locked_out_user` test and login error tests)
- Role tags (`@no-auth`, `@all-users`, `@standard`, `@problem`, etc.) declare which projects a test runs on; each project's `grep` regex selects matching tests
- `locked_out_user` is excluded from setup (login fails — no session to save)

## Consequences

- Tests authenticate once per run (5 logins total), not once per test (would be 100+ logins)
- Full multi-user matrix runs in CI by default; per-project filtering for local iteration
- Adding a new user = add a row to the setup users list + add a project to `playwright.config.ts`
- Adding a new tag = update the project's `grep` regex
- Tests must be tagged correctly or they won't run on the right project
- The `auth/` directory must be git-ignored (sessions are local, expire, and contain auth tokens)

## Alternatives considered

- **Custom `--runAs <user>` CLI flag** — rejected: the `--project` flag in Playwright already does this natively; a custom flag would duplicate Playwright's mechanism with worse IDE/UI integration
- **Per-test `test.use({ storageState })` annotations** — rejected: every test would need an annotation; high duplication; no good way to filter by user from the CLI
- **Login per test (no storageState)** — rejected: 5-10x slower; would dominate test runtime
