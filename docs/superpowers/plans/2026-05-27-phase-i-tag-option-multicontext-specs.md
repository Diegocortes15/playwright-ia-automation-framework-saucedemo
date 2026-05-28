# Phase I — Playwright `tag` Option for Multi-Context Feature Specs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all spec tags from the describe/test title into Playwright's `{ tag }` option so one feature file can hold multiple user-context describes — fixing the SW-4 collision and making `/from-issue` augment across contexts.

**Architecture:** Two parts. **Part 1** = skill-doc edits (Markdown, no runtime code) on `phase-i-spec-tags` off `main`, merged to `main` then `e2e-jira-from-issues`. **Part 2** = retrofit the 3 clean-room specs (real TypeScript) on the `e2e` line. `main`'s original suite is untouched.

**Tech Stack:** Markdown skill refs; Prettier (doc gate); TypeScript + Playwright (retrofit + suite gate).

**Spec:** [`docs/superpowers/specs/2026-05-27-phase-i-tag-option-multicontext-specs-design.md`](../specs/2026-05-27-phase-i-tag-option-multicontext-specs-design.md)

**Branch:** `phase-i-spec-tags` (off `main`; spec already committed).

**Verified linchpin:** project `grep` matches `{ tag }`-option tags (probe: `--project=standard`→only `@standard` describe; `--project=problem`→only `@problem`; `--project=no-auth`→neither). Routing needs zero config change. The Part 2 green full-suite run re-confirms end-to-end.

**TDD note:** Part 1 docs — gate `npx prettier --check <file>` **bare** (never piped) + `grep`. Part 2 code — `npx tsc --noEmit` + `npx playwright test` (full suite, same pass count) + `npx eslint`. Commits use repeated `-m` flags, never here-strings.

---

## Execution & sequencing (read first)

Spans two branches; controller handles switches/merges.

1. **Part 1 (Tasks 1–5)** on `phase-i-spec-tags`: edit → `prettier --check` + `grep` → commit.
2. **Integration A (controller):** merge `phase-i-spec-tags` → `main` (`--no-ff`, push), then `main` → `e2e-jira-from-issues` (push). Phase I touches only docs/skill files; the 3 e2e specs are unchanged by `main`, so the merge keeps e2e's specs (resolve any spec conflict in favor of e2e — don't let `main`'s original `login.spec.ts` clobber e2e's SW-1 version).
3. **Part 2 (Task 6)** on `e2e-jira-from-issues`: retrofit the 3 specs; gate `tsc` + full Playwright suite green + `eslint`; push.
4. **Task 7:** final sweep + SW-4 handoff (user-driven, not executed here).

---

## File Structure

| File                                                              | Part | Responsibility                                         | Task |
| ----------------------------------------------------------------- | ---- | ------------------------------------------------------ | ---- |
| `docs/adr/0015-spec-tags-via-tag-option.md` (new)                 | 1    | Record the tag-option convention                       | 1    |
| `.claude/skills/from-issue/references/test-template.md` (rewrite) | 1    | Canonical tag-option shape + context-label mapping     | 2    |
| `.claude/skills/from-issue/references/workflow.md` (modify)       | 1    | Step 7 render + Step 8/8.5 find-or-create-by-tag       | 3    |
| `.claude/skills/from-issue/references/pr-description-template.md` | 1    | Prose titles; `⚡` keys off the `@smoke` tag           | 4    |
| `CLAUDE.md` (modify)                                              | 1    | Tag-conventions note: applied via the `{ tag }` option | 5    |
| `tests/login/login.spec.ts` (e2e)                                 | 2    | Retrofit `@no-auth` → tag option                       | 6    |
| `tests/footer/footer.spec.ts` (e2e)                               | 2    | Retrofit `@standard` → tag option                      | 6    |
| `tests/inventory/inventory.spec.ts` (e2e)                         | 2    | Retrofit `@problem` → tag option                       | 6    |

---

## Task 1: ADR-0015 — spec tags via the `{ tag }` option

**Files:** Create `docs/adr/0015-spec-tags-via-tag-option.md`

- [ ] **Step 1: Create the ADR** (Nygard, < 80 lines)

```markdown
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
```

- [ ] **Step 2: Format + commit**

```bash
npx prettier --check docs/adr/0015-spec-tags-via-tag-option.md
grep -n "{ tag }\|find-or-create\|sibling" docs/adr/0015-spec-tags-via-tag-option.md   # expect: present
git add docs/adr/0015-spec-tags-via-tag-option.md
git commit -m "docs(i): ADR-0015 — spec tags via the tag option" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `test-template.md` — rewrite to the tag-option shape

**Files:** Modify `.claude/skills/from-issue/references/test-template.md` (full rewrite)

- [ ] **Step 1: Replace the entire file contents** with EXACTLY:

````markdown
# Test File Output Template

The `/from-issue` skill renders generated test files following this template. The top-of-file comment block is **mandatory** and identical across every freshly-generated file (only the date, ticket key, source URL, and title vary; augmented files additionally gain an `Augmented by:` line — see Rules).

## Template

```typescript
// Generated by /from-issue on YYYY-MM-DD from Jira <KEY>.
// Source: <jira-issue-url>
// Title: <summary>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against a contributing issue will refuse to overwrite.

import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';

// One tagged describe per user-context. The routing tag lives in the { tag }
// OPTION (not the title) — Playwright's project grep matches option-tags, and
// they render as report chips. A SECOND context for the same feature is a
// sibling describe in THIS file, never a new file (see Rules).
test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, () => {
  test.describe('Positive', () => {
    test('<behavior description>', async ({ <pageFixture>, page }) => {
      // Specs DO NOT use test.step. Named, timed report steps come from the
      // Page Object's composed action methods. The spec calls those + asserts.
      await <pageFixture>.goto();
      await <pageFixture>.<action>(); // e.g. loginAs('<user>', env.password)
      await expect(<pageFixture>.<locator>).toBeVisible();
    });

    test('<behavior description>', { tag: '@smoke' }, async ({ <pageFixture> }) => {
      // A smoke test carries @smoke via the test-level { tag } option.
    });
  });

  test.describe('Negative', () => {
    test('<behavior description>', async ({ <pageFixture> }) => {
      // ... one test(...) per Negative record (no spec-level test.step)
    });
  });

  test.describe('Edge', () => {
    test('<behavior description>', async ({ <pageFixture> }) => {
      // ... one test(...) per Edge record
    });
  });
  // Omit any bucket describe whose record list is empty.
});
```

## Rules

- **Comment block at top** — mandatory. On first generation it is 5 lines with `YYYY-MM-DD`, `<KEY>`, `<jira-issue-url>`, and `<summary>` substituted:

  ```ts
  // Generated by /from-issue on YYYY-MM-DD from Jira <KEY>.
  // Source: <jira-issue-url>
  // Title: <summary>
  // Manual edits are welcome — this file is not regenerated automatically.
  // Re-running /from-issue against a contributing issue will refuse to overwrite.
  ```

  When the file is **augmented** by a later ticket (per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md)), a `// Augmented by:` line is inserted directly below `// Title:`, listing each augmenting ticket as `<KEY> (YYYY-MM-DD)`, comma-separated:

  ```ts
  // Title: <summary>
  // Augmented by: SW-456 (2026-05-26), SW-789 (2026-06-02)
  ```

  The **contributor set** the skill uses for idempotency (Step 8) = the origin `<KEY>` on line 1 ∪ every key on the `Augmented by:` line. The last header line reads `against a contributing issue` (not `against the same issue`) to reflect that any contributor re-run refuses.

- **Imports**:
  - Always `import { test, expect } from '@fixtures/test'` — NEVER from `@playwright/test` (per CLAUDE.md "Where things live").
  - `import { env } from '@utils/env'` only when a test calls `loginAs(...)` and needs the password.

- **Describe wrap — one tagged describe per user-context** (per [ADR-0015](../../../../docs/adr/0015-spec-tags-via-tag-option.md)). Each context is a `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, () => { ... })`. The routing tag lives in the **`{ tag }` option, NOT the title** — Playwright's project `grep` matches option-tags (verified) and renders them as report chips. The title is human prose: `'<feature> — <context-label>'`.

- **Context-label mapping** (routing tag → label in the describe title):

  | Routing tag           | Context label             |
  | --------------------- | ------------------------- |
  | `@no-auth`            | `no auth`                 |
  | `@all-users`          | `all users`               |
  | `@standard`           | `standard_user`           |
  | `@problem`            | `problem_user`            |
  | `@performance_glitch` | `performance_glitch_user` |
  | `@error`              | `error_user`              |
  | `@visual`             | `visual_user`             |

  `@sort-functional` is a secondary routing tag — combine it via an array on the relevant context, e.g. `{ tag: ['@standard', '@sort-functional'] }` (label by the user: `'inventory — standard_user'`).

- **Multiple contexts in one file** — when a feature has tests for more than one user-context, emit **one sibling `test.describe` per context** in the same file, each with its own `{ tag }` and bucket children. Do NOT split into per-user files. `/from-issue` augment (workflow Step 8.5) finds-or-creates the context describe by its tag.

- **Bucket structure** — inside each context describe, group tests into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', () => { ... })` blocks. Order is fixed: **Positive → Negative → Edge**. Omit a bucket describe with zero tests. The bucket label is exactly `Positive` / `Negative` / `Edge` — no tags on the bucket describe. Classification rules: [`bucket-classification.md`](bucket-classification.md).

- **Per-test title — pure prose, NO tags in the string.** Behavior-only (AC traceability lives in the PR's AC-coverage table). `@smoke` (and any other test-level tag) goes in the test's **`{ tag }` option**, never the title:
  - smoke: `test('standard_user logs in and lands on inventory', { tag: '@smoke' }, async ({ loginPage, page }) => { ... })`
  - not smoke: `test('invalid password shows generic error', async ({ loginPage }) => { ... })`

  Do NOT put the routing tag on the test — it's already on the context describe (Playwright merges describe + test tags).

- **Tag selection** — per CLAUDE.md "Tag conventions" table; applied via the `{ tag }` option:
  - routing tag on the **describe**: `@no-auth` / `@all-users` / `@standard` / `@problem` / `@error` / `@performance_glitch` / `@visual` / `@sort-functional`
  - `@smoke` on the individual **test** (per [`smoke-policy.md`](smoke-policy.md))

- **Page fixture injection** — destructure the page fixture from the test args (e.g., `{ cartPage, page }`) — NEVER `new CartPage(page)` directly. The fixture is auto-injected from [`src/fixtures/test.ts`](../../../../src/fixtures/test.ts).
- **No raw Locators in tests** — per ADR-0001 rule #4. Tests interact through Page methods, not `page.locator(...)`.
- **No `await page.waitForTimeout(...)`** — per CLAUDE.md "What to NEVER do". Use Playwright auto-waiting assertions (`await expect(...).toBeVisible()`).
- **Selector preference order** is the Page Object's concern, not the test's.

## Auth resolution and storageState

Saucedemo's per-user storageState files live under `auth/<user>.json` (e.g., `auth/standard.json`). The orchestrator does NOT load storageState explicitly in the test code — the describe's routing tag routes the test to the matching Playwright project, whose `storageState` config (derived from `tests/users.ts` `AUTH_USERS`, per [ADR-0014](../../../../docs/adr/0014-from-issue-harness-growth.md)) wires the session.

If the AC text doesn't declare a user, default to `standard_user` (spec §2 Decision 13).

## Example: multi-context inventory file (two user-contexts, one file)

```typescript
// Generated by /from-issue on 2026-05-26 from Jira SW-3.
// Source: https://diegocortes15.atlassian.net/browse/SW-3
// Title: [SW][QA][Inventory] problem_user sees broken product images
// Augmented by: SW-4 (2026-05-27)
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against a contributing issue will refuse to overwrite.

import { test, expect } from '@fixtures/test';

test.describe('inventory — problem_user', { tag: '@problem' }, () => {
  test.describe('Edge', () => {
    test('every product image is the same broken placeholder', async ({ inventoryPage }) => {
      await inventoryPage.goto();
      const sources = await inventoryPage.getProductImageSources();
      expect(new Set(sources).size).toBe(1);
    });
  });
});

test.describe('inventory — standard_user', { tag: '@standard' }, () => {
  test.describe('Positive', () => {
    test('all six product titles render exactly', async ({ inventoryPage }) => {
      await inventoryPage.goto();
      expect(await inventoryPage.getProductNames()).toEqual([
        'Sauce Labs Backpack',
        'Sauce Labs Bike Light',
        'Sauce Labs Bolt T-Shirt',
        'Sauce Labs Fleece Jacket',
        'Sauce Labs Onesie',
        'Test.allTheThings() T-Shirt (Red)',
      ]);
    });
  });
});
```

The report's named steps come from the Page Object's composed methods (each wraps its body in one `test.step`), not the spec. Tag chips (`@problem`, `@standard`, `@smoke`) come from the `{ tag }` options.
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/test-template.md
grep -nE "\{ tag: '<routing-tag>' \}|context-label|sibling describe per context|pure prose" .claude/skills/from-issue/references/test-template.md   # expect: present
grep -n "NO PARENTHESES\|<feature> <auth-tag>\|\[@smoke\] \[<user-tag>\]" .claude/skills/from-issue/references/test-template.md   # expect: none (old rules gone)
git add .claude/skills/from-issue/references/test-template.md
git commit -m "feat(i): test-template — tag option + sibling context describes" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `workflow.md` — Step 7 render + Step 8/8.5 find-or-create-by-tag

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`. Read it first; apply both edits verbatim.

- [ ] **Step 1: Replace the Step 7 render bullets + per-test-title paragraph.**

FIND:

```markdown
- Single outer `test.describe('<feature> <auth-tag>', ...)` wrap — **NO parentheses** around the auth-tag (a `(@no-auth)` wrap leaks the closing paren into Playwright's tag chip as `@no-auth)`; see test-template.md)
- Inside the outer describe, group tests by their `bucket` field into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', ...)` blocks
```

REPLACE WITH:

```markdown
- One `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, ...)` per user-context (per [ADR-0015](../../../../docs/adr/0015-spec-tags-via-tag-option.md)) — the routing tag lives in the **`{ tag }` option, not the title** (see test-template.md for the context-label mapping). Multiple contexts in one feature = sibling tagged describes in the same file.
- Inside each context describe, group tests by their `bucket` field into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', ...)` blocks
```

- [ ] **Step 2: Replace the per-test-title paragraph.**

FIND:

```markdown
Each `test(...)` title is `'[@smoke] [<user-tag>] <behavior>'` (square brackets = optional). **Do NOT repeat the `<auth-tag>` in the test title** — it lives on the outer describe only; repeating it renders a duplicate tag chip in the Playwright report. If `smoke: true`, prepend `@smoke `; if `smoke: false`, omit it. Omit `<user-tag>` for user-agnostic tests like `@all-users`. This is the format defined in [`references/test-template.md`](test-template.md) "Rules".
```

REPLACE WITH:

```markdown
Each `test(...)` title is **pure prose** (behavior-only) — NO tags in the title. If `smoke: true`, attach `{ tag: '@smoke' }` as the test's options arg: `test('<behavior>', { tag: '@smoke' }, async (...) => {...})`; if `smoke: false`, omit the options arg entirely. The routing tag is NOT repeated on the test — it's on the context describe. This is the format defined in [`references/test-template.md`](test-template.md) "Rules".
```

- [ ] **Step 3: Replace the Step 8.5 "auth-tag match" pre-check with find-or-create-by-tag.**

FIND:

```markdown
**Pre-check — auth-tag match.** The outer describe of the existing file carries one auth-tag (`test.describe('<feature> <auth-tag>', ...)`). If the new tests' dominant auth-tag differs (e.g. the file is `@no-auth` but the new ACs are `@standard`), they cannot share one describe — **abort**: _"new tests are `<tag>` but `<testfile>` is `<existing-tag>`; re-run with `--new-file`."_
```

REPLACE WITH:

```markdown
**Resolve the context describe by tag (per [ADR-0015](../../../../docs/adr/0015-spec-tags-via-tag-option.md)).** The file holds one `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, ...)` per user-context. Find the sibling describe whose `{ tag }` equals the new tests' routing tag:

- **Match found** → insert the new tests into THAT describe's bucket blocks (the bucket logic below operates within it).
- **No match** → add a NEW sibling `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, ...)` (with its own bucket children) after the existing context describes. This is the multi-user case (e.g. file has `@problem`, new tests are `@standard`) — no abort, no `--new-file` needed.
```

- [ ] **Step 4: Update the Step 8.5 "Locate the bucket" instruction to be context-scoped.**

FIND:

```markdown
2. **Locate the bucket.** Find the `test.describe('Positive' | 'Negative' | 'Edge', () => { ... })` block matching the record's `bucket`.
```

REPLACE WITH:

```markdown
2. **Locate the bucket** _within the resolved context describe_ (above). Find the `test.describe('Positive' | 'Negative' | 'Edge', () => { ... })` block matching the record's `bucket`.
```

- [ ] **Step 5: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/workflow.md
grep -nE "context-label|find the sibling describe whose|\{ tag: '@smoke' \}" .claude/skills/from-issue/references/workflow.md   # expect: present
grep -n "auth-tag match\|<feature> <auth-tag>\|\[@smoke\] \[<user-tag>\]" .claude/skills/from-issue/references/workflow.md   # expect: none
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(i): workflow — tag-option render + find-or-create-by-tag augment" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `pr-description-template.md` — prose titles + tag-based smoke marker

**Files:** Modify `.claude/skills/from-issue/references/pr-description-template.md`. Read first; apply both edits.

- [ ] **Step 1: Update the AC-coverage "Test" column rule** (the `⚡` smoke marker keys off the tag, not the title).

FIND:

```markdown
- "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped. Prepend `⚡ ` INSIDE the backticks for smoke tests (those with `@smoke` in the title), e.g., `` `⚡ @no-auth @smoke standard_user logs in...` ``. Non-smoke tests have no prefix.
```

REPLACE WITH:

```markdown
- "Test" column: backtick-wrapped **prose** test title for generated ACs (titles no longer contain tags — tags live in the `{ tag }` option per [ADR-0015](../../../docs/adr/0015-spec-tags-via-tag-option.md)); em-dash `—` for skipped. Prepend `⚡ ` INSIDE the backticks for tests tagged `@smoke` (the test's `{ tag }`), e.g., `` `⚡ standard_user logs in and lands on inventory` ``. Non-smoke tests have no prefix.
```

- [ ] **Step 2: Update the example AC-coverage rows** to prose titles + `⚡`.

FIND:

```markdown
| AC 1: User can log in with standard_user / secret_sauce and lands... | `⚡ @no-auth @smoke standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `⚡ @no-auth @smoke locked_out_user sees the lockout error` | Negative | ✅ generated |
```

REPLACE WITH:

```markdown
| AC 1: User can log in with standard_user / secret_sauce and lands... | `⚡ standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `⚡ locked_out_user sees the lockout error` | Negative | ✅ generated |
```

- [ ] **Step 3: Update the example Verification test-run lines** to prose titles.

FIND:

```markdown
- `@no-auth standard_user logs in successfully and lands on inventory` — ✅ PASS
- `@no-auth locked_out_user sees the lockout error` — ✅ PASS
```

REPLACE WITH:

```markdown
- `standard_user logs in successfully and lands on inventory` — ✅ PASS
- `locked_out_user sees the lockout error` — ✅ PASS
```

- [ ] **Step 4: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/pr-description-template.md
grep -n "tagged \`@smoke\`\|prose" .claude/skills/from-issue/references/pr-description-template.md   # expect: present
grep -n "@no-auth @smoke standard_user\|@smoke locked_out_user sees" .claude/skills/from-issue/references/pr-description-template.md   # expect: none
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(i): PR template — prose test titles + tag-based smoke marker" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `CLAUDE.md` — tag-conventions note

**Files:** Modify `CLAUDE.md`. Read the "Tag conventions" section first.

- [ ] **Step 1: Add a note under the Tag conventions table heading.** Find the heading line:

```markdown
## Tag conventions (Playwright Projects + storageState + role tags)
```

Immediately after it (before the table), insert:

```markdown
> Tags are applied via Playwright's **`{ tag }` option** — routing tags on `test.describe`, `@smoke` on the `test` — NOT in the title string (per [ADR-0015](docs/adr/0015-spec-tags-via-tag-option.md)). Project `grep` matches option-tags, so routing is unchanged. One feature file holds one tagged describe per user-context.
```

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check CLAUDE.md
grep -n "{ tag } option\|ADR-0015" CLAUDE.md   # expect: present
git add CLAUDE.md
git commit -m "docs(i): CLAUDE.md — tags via the tag option (ADR-0015)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Integration A (controller, between Part 1 and Part 2)

```bash
git checkout main && git merge --no-ff phase-i-spec-tags -m "Merge phase-i-spec-tags: Playwright tag option for multi-context specs (Phase I)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin main
git checkout e2e-jira-from-issues && git merge main -m "Merge main into e2e-jira-from-issues: Phase I tag-option skill docs" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
# If the merge reports a conflict on tests/login/login.spec.ts (main's original vs e2e's SW-1 version),
# resolve in favor of e2e's version: git checkout --ours tests/login/login.spec.ts && git add it.
git push origin e2e-jira-from-issues
git branch -d phase-i-spec-tags
```

Then Part 2 runs on `e2e-jira-from-issues`.

---

## Task 6: Retrofit the 3 clean-room specs (on `e2e-jira-from-issues`)

**Files:** Modify `tests/login/login.spec.ts`, `tests/footer/footer.spec.ts`, `tests/inventory/inventory.spec.ts`. **Runs on the `e2e` line.** The transform: outer `test.describe('<feature> <tag>', () => {` → `test.describe('<feature> — <context-label>', { tag: '<tag>' }, () => {`; any `@smoke` in a test title → a `{ tag: '@smoke' }` options arg + prose title.

- [ ] **Step 1: `tests/login/login.spec.ts`** — replace the describe header + the two smoke usages.

  a) FIND `test.describe('login @no-auth', () => {` → REPLACE `test.describe('login — no auth', { tag: '@no-auth' }, () => {`

  b) The Positive loop interpolates `@smoke ` into the title. FIND:

  ```ts
      for (const user of validUsers) {
        // Keep the smoke set tight: only the canonical standard_user gates builds.
        const smoke = user === 'standard_user' ? '@smoke ' : '';
        test(`${smoke}${user} logs in successfully and lands on inventory`, async ({
          loginPage,
          page,
        }) => {
  ```

  REPLACE WITH:

  ```ts
      for (const user of validUsers) {
        // Keep the smoke set tight: only the canonical standard_user gates builds.
        test(`${user} logs in successfully and lands on inventory`, user === 'standard_user' ? { tag: '@smoke' } : {}, async ({
          loginPage,
          page,
        }) => {
  ```

  c) FIND `test('@smoke invalid credentials are rejected', async ({ loginPage }) => {` → REPLACE `test('invalid credentials are rejected', { tag: '@smoke' }, async ({ loginPage }) => {`

- [ ] **Step 2: `tests/footer/footer.spec.ts`** — only the describe header changes (no `@smoke`, titles already prose).

  FIND `test.describe('footer @standard', () => {` → REPLACE `test.describe('footer — standard_user', { tag: '@standard' }, () => {`

- [ ] **Step 3: `tests/inventory/inventory.spec.ts`** — only the describe header changes.

  FIND `test.describe('inventory @problem', () => {` → REPLACE `test.describe('inventory — problem_user', { tag: '@problem' }, () => {`

- [ ] **Step 4: Format + typecheck + lint**

```bash
npx prettier --write tests/login/login.spec.ts tests/footer/footer.spec.ts tests/inventory/inventory.spec.ts
npx prettier --check tests/login/login.spec.ts tests/footer/footer.spec.ts tests/inventory/inventory.spec.ts
npx tsc --noEmit
npx eslint tests/login/login.spec.ts tests/footer/footer.spec.ts tests/inventory/inventory.spec.ts
```

Expected: all pass. (Note: `test(title, {}, fn)` — empty options object for non-smoke loop iterations — is valid Playwright; tsc accepts it.)

- [ ] **Step 5: Full suite green + routing intact**

```bash
npx playwright test --reporter=list
```

Expected: **16 passed** (same as before Phase I) — `setup` (standard + problem), login `@no-auth` (9), footer `@standard` (4), inventory `@problem` (1). Each test still routes to its project, proving option-tags drive `grep`. Also confirm smoke routing:

```bash
npx playwright test --grep @smoke --list
```

Expected: lists the `@smoke`-tagged tests (standard_user login + invalid-credentials) — proving `@smoke` in the `{ tag }` option is grep-selectable. If any test is missing/misrouted, the transform is wrong — fix before committing.

- [ ] **Step 6: Commit + push**

```bash
git add tests/login/login.spec.ts tests/footer/footer.spec.ts tests/inventory/inventory.spec.ts
git commit -m "refactor(i): retrofit clean-room specs to the tag option" -m "login/footer/inventory move their routing tag (@no-auth/@standard/@problem) and @smoke from the describe/test TITLE into Playwright's { tag } option (ADR-0015). Titles are now prose; routing + smoke grep unchanged; suite stays green (16 passed). Unblocks SW-4 (a @standard sibling describe can now live in inventory.spec.ts)." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin e2e-jira-from-issues
```

---

## Task 7: Final sweep + SW-4 handoff

- [ ] **Step 1: Consistency sweep**

```bash
# No tag-in-title remnants in the retrofitted specs:
grep -rnE "describe\('(login|footer|inventory) @" tests/   # expect: none
# Option-tags present:
grep -rn "{ tag:" tests/login/login.spec.ts tests/footer/footer.spec.ts tests/inventory/inventory.spec.ts   # expect: present
git status --short   # expect: clean
git log --oneline -6
```

- [ ] **Step 2: Pause for the user — SW-4 re-run (user-driven).** With the convention live and `inventory.spec.ts` retrofitted, `/from-issue SW-4` now augments it: it finds no `@standard` sibling describe → adds `test.describe('inventory — standard_user', { tag: '@standard' }, ...)` alongside the existing `@problem` one, inserts SW-4's 6 ACs (Positive titles/descriptions/prices/images/add-to-cart + an Edge hover-color test), appends `// Augmented by: SW-4 (…)`, and runs green. No collision, no `--new-file`. (Also exercises Phase H if SW-4 ever needs a new user — it won't, `standard` is wired.)

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (all tags → option) → Tasks 2, 3, 6. Decision 2 (sibling tagged describes) → Tasks 2, 3. Decision 3 (context-label mapping) → Task 2. Decision 4 (prose titles + `@smoke` option) → Tasks 2, 3, 4, 6. Decision 5 (augment find-or-create by tag) → Task 3. Decision 6 (retrofit 3 e2e specs, main untouched) → Task 6 + Integration A note. Decision 7 (ADR-0015) → Task 1. Verification approach → Task 6 Step 5 (suite + smoke grep) + Task 7 (SW-4). No gaps.

**Placeholder scan:** No "TBD/handle edge cases". Angle-bracket tokens (`<feature>`, `<context-label>`, `<routing-tag>`, `<KEY>`, `<behavior description>`, `<pageFixture>`) are intentional skill-template tokens. Every task has a bare `prettier --check`/`tsc`/test gate + a `grep` consistency check.

**Type consistency:** The describe shape `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, …)` and the test-level `{ tag: '@smoke' }` are identical across test-template.md (Task 2), workflow.md (Task 3), ADR-0015 (Task 1), and the retrofit (Task 6). The context-label mapping is defined once (Task 2) and referenced by workflow.md. `getProductNames()` appears only in the test-template example (illustrative) — SW-4's real run (Task 7, user-driven) will add it to InventoryPage; it is NOT a Phase I deliverable, so no task defines it (intentional — the example is illustrative of shape, not a contract).
