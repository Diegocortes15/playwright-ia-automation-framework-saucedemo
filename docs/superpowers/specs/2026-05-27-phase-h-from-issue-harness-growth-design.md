# Phase H — Autonomous Harness Growth for `/from-issue` — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-27

## Goal

Make `/from-issue` grow the Playwright test harness (the project matrix + auth setup) **autonomously** when a ticket needs an authenticated-user project that isn't wired yet — instead of asking the user mid-run or recovering old config from git history. The harness becomes **data-driven from a single `AUTH_USERS` array**, so adding a user is a one-line append and the structure always supports N users.

## Context

The first authenticated-page ticket — SW-2 (footer on `/inventory.html`) — exposed a gap. The clean-room `playwright.config.ts` only had the `no-auth` project, and `/from-issue` had **no rule** for "this ticket needs a `standard` project + storageState that doesn't exist yet." It improvised in two ways the user flagged: it **asked mid-run** ("how should I grow the harness?") and **spelunked git history** to recover the pre-blank-slate multi-user config. Both break the autonomous, PR-is-the-review-gate model the skill is built on ([ADR-0011](../../adr/0011-jira-ticket-source.md), [ADR-0012](../../adr/0012-from-issue-conventions.md)).

`tests/auth.setup.ts` is already array-driven (`const users = ['standard']`); only `playwright.config.ts` is hardcoded. The pre-blank-slate `main` config was fully data-driven (`userProjects.map(...)`), so the shape is proven — it just isn't documented as a skill contract or wired to a single source of truth.

## Decisions

1. **Demand-driven growth.** A user's project is wired **only when a generated test specifically targets that user** (e.g. a `@problem` test for `problem_user`'s broken images). `@no-auth` tests need no user; user-agnostic tests (`@all-users`, `@standard`) need only `standard` and run on whatever users are already wired — so `@all-users` expands naturally as later tickets add users. Never pre-create unused projects.

2. **Single source of truth — `tests/users.ts` exporting `AUTH_USERS`.** A plain module (no path alias, so the Playwright config loader resolves it via a relative import). Seeded `['standard']` on the clean-room branch. Both the config and `auth.setup.ts` import it; appending one string grows both.

3. **Data-driven config + auth setup.** `playwright.config.ts` derives projects: `setup` + `no-auth` + `AUTH_USERS.map(u → { name: u, grep: /@all-users|@<u>/, dependencies: ['setup'], use: { ...Desktop Chrome, storageState: 'auth/<u>.json' } })`. `auth.setup.ts` loops `AUTH_USERS` to generate `auth/<u>.json`.

4. **Autonomous growth step in `/from-issue`.** After Step 6 (each test has a user + tags), compute the set of users the new tests require (the user behind each non-`@no-auth` test; default `standard`). For each required user not in `AUTH_USERS`, **append it — no mid-run question, no git-history recovery** — and stage `tests/users.ts` (plus first-time `auth.setup.ts`/config creation) in the Step 11 commit.

5. **PR side-effect note replaces the mid-run question.** A Notes-for-reviewer bullet: `⚙️ Harness grew: wired the <user> project + auth setup (first ticket needing <user>). Reviewer: confirm.` The decision lands in the PR, where review belongs.

6. **ADR-0004 guardrail restated in the skill.** No pre-created per-user×browser matrix; no `<browser>-<non-standard>` combos. Cross-browser (`firefox/webkit-standard`) and the `@sort-functional` grep nuance stay **out** of the core shape — orthogonal to the user-growth problem, still governed by [ADR-0004](../../adr/0004-cross-browser-smoke-pattern.md) (YAGNI).

7. **Retrofit the clean-room config now; leave `main`'s config alone.** The data-driven shape (seeded `['standard']`) is applied on the `e2e-jira-from-issues` line. `main`'s config is already full/data-driven and is out of scope.

8. **ADR-0014** records the autonomous-harness-growth decision and its relationship to ADR-0004 / ADR-0011 / ADR-0012.

## Canonical harness shape

```ts
// tests/users.ts — single source of truth
export const AUTH_USERS = ['standard'] as const; // grows per ticket (Phase H)

// playwright.config.ts (core, data-driven)
import { AUTH_USERS } from './tests/users';
// projects: setup, no-auth, ...AUTH_USERS.map(u => chromium project @all-users|@<u> + storageState)

// tests/auth.setup.ts
import { AUTH_USERS } from './users';
// for (const user of AUTH_USERS) setup(`authenticate as ${user}`, ...)
```

Adding a user = append to `AUTH_USERS`. No other edits.

## `/from-issue` workflow change

- **New step (after Step 6 "Analyze ACs"):** "Resolve & grow the harness." Compute required users → for each not in `AUTH_USERS`, append. Reference the canonical shape in the new `references/harness.md`. Emit a harness-growth side-effect note for the PR.
- **Step 11 (commit):** stage `tests/users.ts` (+ `tests/auth.setup.ts` / `playwright.config.ts` on first creation) alongside the spec + Page Object.
- **Step 5 (Page Object resolution):** unchanged — already defaults `storageState: auth/standard.json`; cross-reference the new step.
- **`pr-description-template.md`:** add the `⚙️ Harness grew` side-effect bullet to Notes-for-reviewer.

## Branch / sequencing

- **Skill + ADR** (`workflow.md`, new `references/harness.md`, `pr-description-template.md`, `docs/adr/0014-...`): built on `phase-h-harness-growth` off `main`, merged to `main` (local `--no-ff`), then `main` → `e2e-jira-from-issues`. Skill/doc files merge cleanly.
- **Clean-room config retrofit** (`tests/users.ts`, `playwright.config.ts`, `tests/auth.setup.ts`): applied on the `e2e` line, seeded `['standard']`. Since `main`'s config differs, this is seeded directly on `e2e` (not inherited from `main`); the plan spells out the exact merge/conflict handling.
- **SW-2 / PR #15 untouched** — it keeps its hardcoded config; the retrofit lands after Phase H's skill change.

## Alternatives considered

- **Eager: seed all five users on the first auth ticket.** Rejected: re-introduces the matrix the blank-slate removed; pays for projects/CI before any ticket needs them.
- **Standard-only unless a ticket names a user.** Rejected: `@all-users` loses its "every user" meaning; cross-user coverage never grows.
- **Append a hardcoded project block per user (not data-driven).** Rejected: doesn't deliver the "structure always supports N users" goal; verbose diffs; weaker single-source-of-truth.
- **Keep asking the user mid-run / keep recovering from git history.** Rejected: that's the very problem — it breaks autonomy.

## Scope / non-goals (YAGNI)

- No cross-browser (`firefox/webkit-standard`) or `@sort-functional` changes — separate ADR-0004 decision.
- No pre-populating users.
- No change to tag conventions, bucket, or smoke logic.
- No retrofit of `main`'s config.
- `/from-issue` still inspects the live app for real selectors (that's correct for generation; unrelated to the `/refine-ticket` no-live-app rule).

## Verification approach

Skill-documentation + a config retrofit, verified behaviorally on `e2e-jira-from-issues`:

1. **First auth ticket on a fresh clean-room** (e.g. re-run the SW-2 flow against a `no-auth`-only config) → confirm `/from-issue` wires `standard` autonomously (appends to `AUTH_USERS`, derives the project + auth setup), **no mid-run question, no git spelunk**, and emits the `⚙️ Harness grew` PR note.
2. **A user-specific ticket** (a hypothetical `@problem` AC) → confirm only `problem` is added, not the whole matrix.
3. **A `@no-auth` ticket** → confirm zero harness growth.
4. **Guardrail** → confirm the skill never proposes `firefox-problem`/`webkit-error`-style combos (ADR-0004).
5. **Retrofit sanity** → the retrofitted clean-room config runs the existing SW-1 + SW-2 tests green (`npm test`).
