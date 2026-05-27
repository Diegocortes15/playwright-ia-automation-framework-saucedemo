# Phase H — Autonomous Harness Growth for `/from-issue` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/from-issue` grow the Playwright harness autonomously (data-driven from a single `AUTH_USERS` array) when a ticket needs an auth-user project that isn't wired — no mid-run question, no git-history recovery — and retrofit the clean-room config to that shape.

**Architecture:** Two parts. **Part 1** is skill-documentation (Markdown contracts under `.claude/skills/from-issue/` + a new ADR) — built on `phase-h-harness-growth` off `main`, merged to `main` then `e2e-jira-from-issues`. **Part 2** is a real TypeScript config retrofit applied **only on the `e2e` clean-room line** (seeded `['standard']`); `main`'s full config is untouched.

**Tech Stack:** Markdown skill references; Prettier (doc gate); TypeScript + Playwright (the config retrofit + suite gate).

**Spec:** [`docs/superpowers/specs/2026-05-27-phase-h-from-issue-harness-growth-design.md`](../specs/2026-05-27-phase-h-from-issue-harness-growth-design.md)

**Branch:** `phase-h-harness-growth` (off `main`; spec already committed).

**TDD note:** Part 1 is docs — gate is `npx prettier --check <file>` run **bare** (never piped to `tail`/`head`) + a `grep` consistency read. Part 2 is code — gate is `npx tsc --noEmit` + `npx playwright test` (full suite green) + `npx eslint`. Commits use **repeated `-m` flags**, never shell here-strings. Behavioral verification is the spec's 5 scenarios — post-merge, user-driven.

---

## File Structure

| File                                                                      | Part | Responsibility                                                             | Task |
| ------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------------- | ---- |
| `docs/adr/0014-from-issue-harness-growth.md` (new)                        | 1    | Record the autonomous, demand-driven harness-growth decision               | 1    |
| `.claude/skills/from-issue/references/harness.md` (new)                   | 1    | Canonical data-driven config/auth shape + growth rule + ADR-0004 guardrail | 2    |
| `.claude/skills/from-issue/references/workflow.md` (modify)               | 1    | New Step 6.5 (grow harness) + Step 11 staging + Step 5 cross-ref           | 3    |
| `.claude/skills/from-issue/references/pr-description-template.md`         | 1    | `⚙️ Harness grew` side-effect note                                         | 4    |
| `.claude/skills/from-issue/SKILL.md` + `docs/from-issue.md` + `CLAUDE.md` | 1    | Pointer to `harness.md` + one-line behavior note                           | 5    |
| `tests/users.ts` (new, e2e line)                                          | 2    | Single source of truth: `AUTH_USERS`                                       | 6    |
| `playwright.config.ts` (rewrite, e2e line)                                | 2    | Derive projects from `AUTH_USERS`                                          | 6    |
| `tests/auth.setup.ts` (modify, e2e line)                                  | 2    | Import `AUTH_USERS`                                                        | 6    |

---

## Execution & sequencing (read before starting)

This plan spans **two branches**. The controller handles the branch switches/merges between parts (subagents only ever edit the current branch).

1. **Part 1 (Tasks 1–5)** on `phase-h-harness-growth`. Each task: edit → `prettier --check` (bare) + `grep` → commit.
2. **Integration A (controller):** merge `phase-h-harness-growth` → `main` (`--no-ff`, push), then `main` → `e2e-jira-from-issues` (push). Phase H touches **no** config files, so the `main`→`e2e` merge keeps `e2e`'s own config (no clobber, no conflict).
3. **Precondition for Part 2:** SW-2 / PR #15 must be **merged into `e2e`** (it carries `tests/footer/footer.spec.ts`, `Footer`, `InventoryPage`, and the hardcoded config the retrofit replaces). If PR #15 is still open, merge it first. This is the "fix SW-2 if required" step — the retrofit _supersedes_ SW-2's hardcoded config; nothing in SW-2's test/PO code changes.
4. **Part 2 (Task 6)** on `e2e-jira-from-issues` (commit directly to the clean-room line, matching how SW-2's config landed). Gate: `tsc` + full Playwright suite green + `eslint`. Push `e2e`.
5. **Task 7:** final review + behavioral handoff (user-driven).

---

## Task 1: ADR-0014 — autonomous harness growth

**Files:** Create `docs/adr/0014-from-issue-harness-growth.md`

- [ ] **Step 1: Create the ADR** (Nygard format per `docs/adr/0000-template.md`, < 80 lines)

```markdown
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
```

- [ ] **Step 2: Format + commit**

```bash
npx prettier --check docs/adr/0014-from-issue-harness-growth.md
grep -n "demand-driven\|AUTH_USERS" docs/adr/0014-from-issue-harness-growth.md   # expect: present
git add docs/adr/0014-from-issue-harness-growth.md
git commit -m "docs(h): ADR-0014 — /from-issue autonomous harness growth" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `references/harness.md` — canonical shape + growth rule

**Files:** Create `.claude/skills/from-issue/references/harness.md`

- [ ] **Step 1: Write the harness reference**

````markdown
# Harness resolution & growth

How `/from-issue` resolves and **grows** the authenticated-test harness (the Playwright project matrix + auth setup) when a ticket needs a user whose project isn't wired yet. Per [ADR-0014](../../../../docs/adr/0014-from-issue-harness-growth.md). The harness is **data-driven and demand-driven**: autonomous, no mid-run questions, no recovering old config from git history.

## Single source of truth — `tests/users.ts`

```ts
// Single source of truth for the authenticated projects + auth setup.
// /from-issue appends a user here (and nowhere else) the first time a ticket
// needs that user's authenticated page (Phase H / ADR-0014). Grows one user at
// a time — do NOT pre-populate unused users (ADR-0004).
export const AUTH_USERS = ['standard'] as const;
```

`playwright.config.ts` and `tests/auth.setup.ts` both derive from `AUTH_USERS`. Adding a user is a **one-line append** — nothing else changes.

## Canonical config shape

```ts
import { AUTH_USERS } from './tests/users';
// projects: setup, no-auth, then one chromium project per user:
//   ...AUTH_USERS.map((user) => ({
//     name: user,
//     testIgnore: /.*\.setup\.ts/,
//     grep: new RegExp(`@all-users|@${user}`),
//     dependencies: ['setup'],
//     use: { ...devices['Desktop Chrome'], storageState: `auth/${user}.json` },
//   }))
```

`tests/auth.setup.ts` loops `AUTH_USERS`, logging each `<user>_user` in and saving `auth/<user>.json`.

## The growth rule (Step 6.5)

After Step 6 assigns each test a `user` + tags, compute the **required user set**:

- `@no-auth` tests → no user.
- user-agnostic tests (`@all-users`, `@standard`) → require only `standard`.
- a test that targets a specific user (e.g. an AC about `problem_user`'s broken images → `@problem`) → requires that user.

For each required user **not** already in `AUTH_USERS`, **append it.** Then:

- **First-time creation** (fresh/blank-slate repo with no `tests/users.ts` / data-driven config / `auth.setup.ts`): create all three from the canonical shapes above, seeded with the required users (always include `standard` once any auth test exists).
- **Existing harness**: edit only `tests/users.ts` (append the user) — the config and auth setup already derive.

Record a side-effect note for the PR (Step 12 / `pr-description-template.md`):
`⚙️ Harness grew: wired the <user> project + auth setup (first ticket needing <user>). Reviewer: confirm.`

## Guardrail (ADR-0004)

- **Never** pre-create users no test targets.
- **Never** add `<browser>-<non-standard>` projects (`firefox-problem`, `webkit-error`, …). Cross-browser is standard-only smoke and stays **out** of `/from-issue`'s growth — it's a separate [ADR-0004](../../../../docs/adr/0004-cross-browser-smoke-pattern.md) decision. Same for the `@sort-functional` grep nuance.

## Staging

Stage `tests/users.ts` (and, on first-time creation, `playwright.config.ts` + `tests/auth.setup.ts`) in the Step 11 commit alongside the spec + Page Object.
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/harness.md
grep -nE "AUTH_USERS|demand-driven|firefox-problem|Step 6.5" .claude/skills/from-issue/references/harness.md   # expect: present
git add .claude/skills/from-issue/references/harness.md
git commit -m "feat(h): from-issue harness.md — data-driven config + demand-driven growth" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `workflow.md` — Step 6.5 + Step 11 staging + Step 5 cross-ref

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`

- [ ] **Step 1: Insert the new Step 6.5** — between the end of Step 6 and the `### 7. Render test file` heading. Find:

```markdown
**If `references/smoke-policy.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules.

### 7. Render test file
```

Replace with:

```markdown
**If `references/smoke-policy.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules.

### 6.5. Resolve & grow the harness

Per [`references/harness.md`](harness.md) (read it before this step). From the Step 6 test records, compute the **required user set**: `@no-auth` tests need no user; user-agnostic tests (`@all-users`/`@standard`) need only `standard`; a test targeting a specific user needs that user.

For each required user **not** wired in `tests/users.ts` `AUTH_USERS`, **append it autonomously** — no mid-run question, no recovering config from git history. The data-driven `playwright.config.ts` + `tests/auth.setup.ts` derive the project + storageState from the array. If `tests/users.ts` / the data-driven config / `auth.setup.ts` don't exist yet, create all three from the canonical shapes in `harness.md`, seeded with the required users.

**Guardrail ([ADR-0004](../../../../docs/adr/0004-cross-browser-smoke-pattern.md)):** never pre-create unused users; never add `<browser>-<non-standard>` projects. Cross-browser stays out.

Record a side-effect note for the PR body: `⚙️ Harness grew: wired the <user> project + auth setup (first ticket needing <user>). Reviewer: confirm.`

### 7. Render test file
```

- [ ] **Step 2: Add harness staging to Step 11** — find the `git add <testfile>` block and add a harness-staging comment. Find:

```markdown
# If Step 7 externalized data per data-placement.md, also stage the data file(s) + loader:

# git add data/scenarios/<feature>/<name>.json data/shared/<name>.json data/fixtures.ts data/types.ts
```

Replace with:

```markdown
# If Step 7 externalized data per data-placement.md, also stage the data file(s) + loader:

# git add data/scenarios/<feature>/<name>.json data/shared/<name>.json data/fixtures.ts data/types.ts

# If Step 6.5 grew the harness (per harness.md), also stage the changed source of truth

# (and, on first-time creation, the config + auth setup):

# git add tests/users.ts

# git add playwright.config.ts tests/auth.setup.ts # first-time creation only
```

- [ ] **Step 3: Cross-reference from Step 5** — find the storageState bullet in Step 5 and append a pointer. Find:

```markdown
- storageState: `auth/standard.json` by default. Override only if ALL Step 4 AC records share the same non-standard user (the storageState is only used for the snapshot; tests pick their own user via tag→project mapping).
```

Replace with:

```markdown
- storageState: `auth/standard.json` by default. Override only if ALL Step 4 AC records share the same non-standard user (the storageState is only used for the snapshot; tests pick their own user via tag→project mapping). The project that actually runs each test is wired in Step 6.5 — see [`references/harness.md`](harness.md).
```

- [ ] **Step 4: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/workflow.md
grep -nE "6.5. Resolve & grow the harness|tests/users.ts|Harness grew" .claude/skills/from-issue/references/workflow.md   # expect: present
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(h): workflow Step 6.5 — autonomous harness growth + staging" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `pr-description-template.md` — harness side-effect note

**Files:** Modify `.claude/skills/from-issue/references/pr-description-template.md`

- [ ] **Step 1: Add the harness note to the Template's Notes-for-reviewer group** — find the `➕ Page Object additions` bullet in the Template block and add the harness bullet immediately after it. Find:

```markdown
- ➕ **Page Object additions:** appended `<members>` to `<PageObject>` for the new tests (existing members untouched).
```

Replace with:

```markdown
- ➕ **Page Object additions:** appended `<members>` to `<PageObject>` for the new tests (existing members untouched).
- ⚙️ **Harness grew:** wired the `<user>` project + auth setup (first ticket needing `<user>`) by appending to `tests/users.ts` `AUTH_USERS` (per [ADR-0014](../../../docs/adr/0014-from-issue-harness-growth.md)). Reviewer: confirm. _(Omit when no new user was wired.)_
```

- [ ] **Step 2: Add a Rules entry** — find the Notes-for-reviewer rules bullet that lists the emoji markers and add the `⚙️` marker. Find:

```markdown
- **Notes for reviewer**: include this section ONLY when the skill made side-effect file changes OR LLM-judgment calls (merge/split/skip per [`qa-analysis.md`](qa-analysis.md)) that the reviewer might disagree with. Each note is a bullet starting with an emoji marker (⚠️ for side effects, 📝 for judgment calls). If the workflow produced no side effects and no merge/split/skip decisions, OMIT this section entirely. Position: between `Verification` and `Collision warnings` per the Section order rule.
```

Replace with:

```markdown
- **Notes for reviewer**: include this section ONLY when the skill made side-effect file changes OR LLM-judgment calls (merge/split/skip per [`qa-analysis.md`](qa-analysis.md)) that the reviewer might disagree with. Each note is a bullet starting with an emoji marker (⚠️ for side effects, ⚙️ for harness growth per [`harness.md`](harness.md), 📝 for judgment calls). If the workflow produced no side effects and no merge/split/skip decisions, OMIT this section entirely. Position: between `Verification` and `Collision warnings` per the Section order rule.
```

- [ ] **Step 3: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/pr-description-template.md
grep -nE "Harness grew|AUTH_USERS" .claude/skills/from-issue/references/pr-description-template.md   # expect: present
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(h): PR template — harness-growth side-effect note" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: SKILL.md + docs/from-issue.md + CLAUDE.md pointers

**Files:** Modify `.claude/skills/from-issue/SKILL.md`, `docs/from-issue.md`, `CLAUDE.md`

- [ ] **Step 1: Add `harness.md` to the SKILL.md References list** — find the References list and append after the `data-placement.md` line. Find:

```markdown
- [`references/data-placement.md`](references/data-placement.md) — inline vs. externalized (`data/`) test data decision rule (D.1.4)
```

Replace with:

```markdown
- [`references/data-placement.md`](references/data-placement.md) — inline vs. externalized (`data/`) test data decision rule (D.1.4)
- [`references/harness.md`](references/harness.md) — data-driven config + autonomous harness growth (Phase H / ADR-0014)
```

- [ ] **Step 2: Add a behavior note to `docs/from-issue.md`** — find the parsing-robustness paragraph added in Phase F (it starts "The skill normalizes any ticket format/quality") and add a new paragraph after it:

```markdown
The skill also **grows the test harness autonomously**: when a ticket's tests need an authenticated user whose Playwright project isn't wired yet, it appends that user to `tests/users.ts` (`AUTH_USERS`) — from which `playwright.config.ts` and `tests/auth.setup.ts` derive — and notes it in the PR. No mid-run questions; growth is demand-driven, one user at a time (per [ADR-0014](adr/0014-from-issue-harness-growth.md)).
```

- [ ] **Step 3: Add a note to `CLAUDE.md`** — find the `/from-issue` bullet in the Custom skills list and append a sentence. Find:

```markdown
- **`/from-issue`** — generate a set of Playwright tests from a Jira ticket (read via the Atlassian MCP) and open a GitHub PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist. Full guide: [`docs/from-issue.md`](docs/from-issue.md).
```

Replace with:

```markdown
- **`/from-issue`** — generate a set of Playwright tests from a Jira ticket (read via the Atlassian MCP) and open a GitHub PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist, and grows the harness autonomously (data-driven `tests/users.ts` `AUTH_USERS`, [ADR-0014](docs/adr/0014-from-issue-harness-growth.md)) when a ticket needs an unwired auth user. Full guide: [`docs/from-issue.md`](docs/from-issue.md).
```

- [ ] **Step 4: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/SKILL.md docs/from-issue.md CLAUDE.md
grep -rn "harness.md\|AUTH_USERS" .claude/skills/from-issue/SKILL.md docs/from-issue.md CLAUDE.md   # expect: present in each
git add .claude/skills/from-issue/SKILL.md docs/from-issue.md CLAUDE.md
git commit -m "docs(h): point SKILL/guide/CLAUDE at harness growth" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Integration A (controller, between Part 1 and Part 2)

Not a subagent task — the controller runs this after Tasks 1–5 are committed and reviewed:

```bash
# merge Part 1 to main
git checkout main && git merge --no-ff phase-h-harness-growth -m "Merge phase-h-harness-growth: /from-issue autonomous harness growth (Phase H)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin main
# bring skill docs onto the clean-room line (no config touched by Phase H → e2e keeps its own config)
git checkout e2e-jira-from-issues && git merge main -m "Merge main into e2e-jira-from-issues: Phase H harness-growth skill docs" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin e2e-jira-from-issues
# delete the merged phase branch
git branch -d phase-h-harness-growth
```

**Precondition for Part 2:** confirm SW-2 / PR #15 is merged into `e2e` (`gh pr view 15 --json state`). If still open, merge it first (`gh pr merge 15 --merge`) so `tests/footer/footer.spec.ts`, `Footer`, `InventoryPage`, and the hardcoded config exist on `e2e`. Then `git pull` on `e2e`.

---

## Task 6: Clean-room config retrofit (on `e2e-jira-from-issues`)

**Files:** Create `tests/users.ts`; rewrite `playwright.config.ts`; modify `tests/auth.setup.ts`. **Runs on the `e2e` line, not `phase-h`.**

- [ ] **Step 1: Create `tests/users.ts`**

```ts
// Single source of truth for the authenticated Playwright projects + auth setup.
// /from-issue appends a user here (and nowhere else) the first time a ticket
// needs that user's authenticated page (Phase H / ADR-0014). The clean-room
// branch grows one user at a time — do NOT pre-populate unused users (ADR-0004).
export const AUTH_USERS = ['standard'] as const;
```

- [ ] **Step 2: Rewrite `playwright.config.ts`** to derive projects from `AUTH_USERS`

```ts
import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { AUTH_USERS } from './tests/users';

// Clean-room config (e2e-jira-from-issues), data-driven from tests/users.ts
// (Phase H / ADR-0014). Projects derive from AUTH_USERS, which /from-issue grows
// one user at a time as tickets require authenticated pages. Cross-browser
// (firefox/webkit-standard) + @sort-functional remain a separate ADR-0004 decision.

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'no-auth',
      testIgnore: /.*\.setup\.ts/,
      grep: /@no-auth/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...AUTH_USERS.map((user) => ({
      name: user,
      testIgnore: /.*\.setup\.ts/,
      grep: new RegExp(`@all-users|@${user}`),
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `auth/${user}.json`,
      },
    })),
  ],
});
```

- [ ] **Step 3: Point `tests/auth.setup.ts` at `AUTH_USERS`** — replace the inline `const users` array with the import. Find:

```ts
import { test as setup } from '@playwright/test';
import path from 'path';
import { env } from '@utils/env';

// Generates per-user storageState consumed by the authenticated projects in
// playwright.config.ts. The clean-room branch grows ticket-by-ticket: only
// `standard` is wired so far (first needed by SW-2 / footer). Add users here
// as later tickets introduce their projects.
const users = ['standard'] as const;

for (const user of users) {
```

Replace with:

```ts
import { test as setup } from '@playwright/test';
import path from 'path';
import { env } from '@utils/env';
import { AUTH_USERS } from './users';

// Generates per-user storageState consumed by the authenticated projects in
// playwright.config.ts. Both derive from tests/users.ts (AUTH_USERS) — the
// single source of truth /from-issue grows one user at a time (Phase H / ADR-0014).

for (const user of AUTH_USERS) {
```

- [ ] **Step 4: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint tests/users.ts playwright.config.ts tests/auth.setup.ts
```

Expected: both exit 0.

- [ ] **Step 5: Full suite green (no regression)**

```bash
npx playwright test --reporter=list
```

Expected: the existing SW-1 login (`@no-auth`) + SW-2 footer (`@standard`) tests all pass — same count as before the retrofit (the data-driven config must produce the identical `no-auth` + `standard` projects). If any test is missing/blocked, the derived projects or grep are wrong — fix before committing.

- [ ] **Step 6: Commit**

```bash
git add tests/users.ts playwright.config.ts tests/auth.setup.ts
git commit -m "refactor(h): data-driven harness from tests/users.ts AUTH_USERS" -m "Retrofits the clean-room config to the Phase H shape (ADR-0014): playwright.config.ts and tests/auth.setup.ts both derive from a single AUTH_USERS array, so /from-issue grows the harness by a one-line append. Seeded ['standard']; SW-1 + SW-2 suites stay green. Supersedes SW-2's hardcoded config." -m "Refs: SW-2" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin e2e-jira-from-issues
```

---

## Task 7: Final review + behavioral handoff

- [ ] **Step 1: Whole-change consistency sweep**

```bash
# docs present on e2e after the merge:
grep -rn "AUTH_USERS" .claude/skills/from-issue/ docs/adr/0014-from-issue-harness-growth.md tests/users.ts playwright.config.ts tests/auth.setup.ts
git -C . status --short   # expect: clean
git log --oneline -8
```

- [ ] **Step 2: Pause for the user** — the spec's 5 behavioral scenarios are post-merge + user-driven:
  1. First auth ticket on a fresh `no-auth`-only config → `standard` wired autonomously, **no mid-run question / no git spelunk**, `⚙️ Harness grew` PR note.
  2. A user-specific (`@problem`) ticket → only `problem` added, not the whole matrix.
  3. A `@no-auth` ticket → zero harness growth.
  4. Guardrail → skill never proposes `firefox-problem`/`webkit-error`.
  5. Retrofit sanity → `npm test` green on `e2e` (done in Task 6 Step 5).

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (demand-driven) → Task 2 + Task 3 (Step 6.5). Decision 2 (`tests/users.ts` source of truth) → Tasks 2, 6. Decision 3 (data-driven config/auth) → Task 6. Decision 4 (autonomous growth step) → Task 3. Decision 5 (PR note) → Task 4. Decision 6 (ADR-0004 guardrail) → Tasks 1, 2, 3. Decision 7 (retrofit e2e, leave main) → Task 6 + Execution/sequencing. Decision 8 (ADR-0014) → Task 1. Verification approach → Task 7. No gaps.

**Placeholder scan:** No "TBD/handle edge cases". `<user>`, `<KEY>`, `<feature>`, `<members>`, `<PageObject>` are intentional skill-template tokens. Every task has a bare `prettier --check`/`tsc`/test gate + a `grep` consistency check.

**Type consistency:** `AUTH_USERS` is the single exported name used identically across `harness.md`, ADR-0014, `tests/users.ts`, `playwright.config.ts` (`./tests/users`), and `tests/auth.setup.ts` (`./users`). The derived project fields (`name`, `grep` `@all-users|@<user>`, `storageState` `auth/<user>.json`, `dependencies: ['setup']`) match between `harness.md` and the Task 6 config. The `⚙️ Harness grew` note wording is identical in `harness.md`, `workflow.md` Step 6.5, and `pr-description-template.md`.
