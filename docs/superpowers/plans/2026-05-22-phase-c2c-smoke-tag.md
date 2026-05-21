# Phase C.2.c — `@smoke` Tag Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `/from-issue` to apply `@smoke` to a curated subset of generated tests via LLM judgment against a new `smoke-policy.md` reference doc. Add `npm run test:smoke` script + CLAUDE.md tag row to make smoke first-class.

**Architecture:** Pure doc/skill/config phase. Adds 1 new reference doc (`smoke-policy.md`) and modifies 7 existing files: `workflow.md` (Steps 6 + 7), `test-template.md` (Per-test title rule + Example), `pr-description-template.md` (⚡ marker rule + tables), `SKILL.md` (1 line pointer), `package.json` (1 npm script), `CLAUDE.md` (1 tag conventions row), `docs/from-issue.md` (paragraph + snippet + reviewer override note). Zero changes to `src/`, `tests/`, `playwright.config.ts`, ADR-0008, or the GitHub Issue Template.

**Tech Stack:** Claude Code skills (prose-only) · Markdown · npm scripts · Existing `/from-issue` skill (C.2.a + C.2.b) · Existing `gh` CLI.

**Spec:** [`docs/superpowers/specs/2026-05-22-phase-c2c-smoke-tag-design.md`](../specs/2026-05-22-phase-c2c-smoke-tag-design.md) (committed at `3271005`)

---

## Pre-flight: branch + clean baseline

**Files:** None modified in pre-flight.

- [ ] **Step 1: Confirm we're on `phase-c2c-smoke-tag` with a clean tree**

```
git status
git branch --show-current
```

Expected: branch `phase-c2c-smoke-tag`, working tree clean (or only ignored files). If on `main` or dirty: STOP and ask the human.

- [ ] **Step 2: Confirm baseline checks pass**

```
npm run typecheck
npm run lint
npm run format:check
```

All three must exit 0. (Skipping `npm test` here — this phase doesn't touch test-affecting code; the full matrix runs naturally during Task 9's smoke test against the generated PR.)

- [ ] **Step 3: Confirm `/from-issue` (through C.2.b) is installed and discoverable**

```
ls .claude/skills/from-issue/SKILL.md
ls .claude/skills/from-issue/references/
```

Expected: `SKILL.md` exists; `references/` contains `workflow.md`, `test-template.md`, `pr-description-template.md`, `bucket-classification.md`. (Note: `smoke-policy.md` does NOT exist yet — Task 1 creates it.)

If `bucket-classification.md` missing: STOP — C.2.b isn't merged.

- [ ] **Step 4: Confirm `gh` is authenticated**

```
gh auth status
```

Expected: shows an authenticated GitHub account with `repo` scope.

---

## Task 1: NEW reference doc — `smoke-policy.md`

**Files:**

- Create: `.claude/skills/from-issue/references/smoke-policy.md`

This is the single source of truth for how the LLM decides smoke vs not-smoke per test. Mirrors the structural pattern of `bucket-classification.md`.

- [ ] **Step 1: Verify the target file doesn't exist yet**

```
ls .claude/skills/from-issue/references/smoke-policy.md 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`. If it already exists: STOP and report BLOCKED.

- [ ] **Step 2: Write `references/smoke-policy.md` with this EXACT content (verbatim)**

Use the Write tool. Content:

```markdown
# Smoke Policy Reference

The `/from-issue` skill uses this doc to decide which generated tests get the `@smoke` tag. The decision is recorded in the test's `smoke: boolean` field in Step 6 of [`workflow.md`](workflow.md), then drives the `@smoke ` prepend in Step 7 and the `⚡` marker in the PR description's AC coverage table (see [`pr-description-template.md`](pr-description-template.md)).

## What `@smoke` means in this project

`@smoke` marks a test as a **build-verification candidate**. The smoke set should:

- **Cover critical user journeys** — the flows that, if broken, render the application unusable
- **Stay tight** — small enough to run in 1-2 minutes; meant for fast feedback on every push/PR
- **Be stable** — minimal flakiness so failures signal real regressions, not test brittleness
- **Run via `npm run test:smoke`** — which uses `playwright test --grep '@smoke'`

A test that's "happy path" but peripheral (e.g., sort by price) is NOT smoke. A test that's "negative" but covers critical regression risk (e.g., unauthenticated cart access is properly blocked) IS smoke. Bucket (Positive/Negative/Edge) is orthogonal to smoke status.

## Criteria for `smoke: true`

A test is smoke-worthy if at least one applies:

- **Core authentication or authorization flow** — login success/failure, session, route gating
- **Checkout completion or payment** — must-not-break revenue-critical paths
- **Data integrity assertion** — cart state, order persistence, user data correctness
- **Critical regression risk** — historically-broken flows where a bug would be customer-facing
- **Gateway to the rest of the app** — landing pages, primary navigation that other tests depend on

## Criteria for `smoke: false`

A test is NOT smoke-worthy if it primarily verifies:

- **UI nicety** — animations, hover states, visual polish
- **Sort/filter variation** — alternative orderings of the same data
- **Performance assertion** — load time, render time (these are Edge bucket, not smoke)
- **Visual regression** — pixel-perfect comparisons (separate concern from build verification)
- **Secondary error path** — when a more critical version of the same error is already smoke
- **Boundary nicety** — whitespace handling, character encoding, locale variations
- **Configuration variation** — same behavior tested under different valid configs

## Worked examples

### `smoke: true` (3 examples)

- AC: "Standard user logs in with valid credentials and lands on inventory page."
  → Test: `@no-auth standard_user logs in successfully and lands on inventory`
  → **smoke: true** — core auth flow; gateway to the rest of the app.

- AC: "Locked-out user sees the lockout error message."
  → Test: `@no-auth locked_out_user sees the lockout error`
  → **smoke: true** — critical auth-rejection regression risk; protects against silent permission failures.

- AC: "User can complete checkout with valid info and see the order confirmation."
  → Test: `@standard checkout with valid info completes successfully`
  → **smoke: true** — checkout completion (revenue-critical path).

### `smoke: false` (3 examples)

- AC: "User sorts products by price descending and sees products in the expected order."
  → Test: `@standard sort by price descending shows products in order`
  → **smoke: false** — sort variation; secondary to "user can browse products".

- AC: "Invalid password shows a generic error message."
  → Test: `@no-auth invalid password shows generic error`
  → **smoke: false** — secondary error path; the locked_out_user case already covers critical auth rejection in smoke.

- AC: "Inventory page loads within 2 seconds on a cold cache."
  → Test: `@standard inventory page loads within 2 seconds`
  → **smoke: false** — performance assertion (Edge bucket); not a flow-correctness concern.

## When in doubt

Default to **`smoke: false`**. Over-tagging makes the smoke set useless; under-tagging is recoverable (reviewer can add `@smoke` in the PR before merge). The smoke set should grow conservatively, not eagerly.

## Reviewer override

If a reviewer disagrees with the LLM's smoke pick on a PR, the workflow is: edit the generated test file directly in the PR — add `@smoke ` after the auth-tag, or remove it. The orchestrator does NOT re-run on the same issue. The PR is the curation gate; the LLM is just the first draft.
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/references/smoke-policy.md
git commit -m "feat(c2c): add smoke-policy.md reference (LLM judgment criteria + worked examples)"
```

---

## Task 2: MODIFY `workflow.md` — extend Steps 6 + 7 for smoke classification

**Files:**

- Modify: `.claude/skills/from-issue/references/workflow.md`

Step 6 records gain a `smoke: boolean` field with validation. Step 7 prepends `@smoke ` to titles when true.

- [ ] **Step 1: Extend Step 6's test record + add classification + validation**

Use the Edit tool with `replace_all: false`.

**old_string:**

````
### 6. Analyze ACs

Group the `worth_automating=true` AC records into a set of tests. One test may cover multiple ACs (spec §2 Decision 5 — adaptive multi-test). For each test, record:

```
{
  title: "<behavior-only description, e.g., 'remove single item from cart updates badge'>",
  covers: [1, 3],  // AC IDs
  user: "<saucedemo user>",
  tags: ["<auth-tag>", "<user-tag-if-not-no-auth>"],
  bucket: "Positive" | "Negative" | "Edge"
}
```

Tag selection follows CLAUDE.md "Tag conventions" table. Title format follows [`references/test-template.md`](test-template.md) "Rules". Bucket assignment follows [`references/bucket-classification.md`](bucket-classification.md) — read it before classifying. The bucket lives on the test (not on the AC) because one test can cover multiple ACs; classify by the test's dominant behavior, using the ambiguity rules in bucket-classification.md as the tiebreaker.

**Validate bucket values before Step 7.** Each test's `bucket` must be one of `{Positive, Negative, Edge}`. If the LLM emits any other value (e.g., `"Boundary"`), default that test to `Edge` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid bucket "<value>" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`

**If `references/bucket-classification.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/bucket-classification.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules — the doc is the source of truth.
````

**new_string:**

````
### 6. Analyze ACs

Group the `worth_automating=true` AC records into a set of tests. One test may cover multiple ACs (spec §2 Decision 5 — adaptive multi-test). For each test, record:

```
{
  title: "<behavior-only description, e.g., 'remove single item from cart updates badge'>",
  covers: [1, 3],  // AC IDs
  user: "<saucedemo user>",
  tags: ["<auth-tag>", "<user-tag-if-not-no-auth>"],
  bucket: "Positive" | "Negative" | "Edge",
  smoke: true | false
}
```

Tag selection follows CLAUDE.md "Tag conventions" table. Title format follows [`references/test-template.md`](test-template.md) "Rules". Bucket assignment follows [`references/bucket-classification.md`](bucket-classification.md) — read it before classifying. The bucket lives on the test (not on the AC) because one test can cover multiple ACs; classify by the test's dominant behavior, using the ambiguity rules in bucket-classification.md as the tiebreaker.

Smoke assignment follows [`references/smoke-policy.md`](smoke-policy.md) — read it before classifying. Smoke status is orthogonal to bucket: a Negative test can be smoke (critical regression risk) and a Positive test can be NOT-smoke (peripheral happy path). The default per smoke-policy.md is `false` ("when in doubt, NOT smoke").

**Validate bucket values before Step 7.** Each test's `bucket` must be one of `{Positive, Negative, Edge}`. If the LLM emits any other value (e.g., `"Boundary"`), default that test to `Edge` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid bucket "<value>" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`

**Validate smoke values before Step 7.** Each test's `smoke` must be exactly `true` or `false`. If the LLM emits any other value, default that test to `false` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid smoke value "<value>" for test "<title>" — defaulted to false. Reviewer: verify classification.`

**If `references/bucket-classification.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/bucket-classification.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules — the doc is the source of truth.

**If `references/smoke-policy.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules.
````

- [ ] **Step 2: Extend Step 7 to apply the @smoke prepend**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
Each `test(...)` title is constructed by prepending the test record's tags to the behavior description: `'<auth-tag> [<user-tag>] <behavior>'` (square brackets = optional; omit `<user-tag>` for user-agnostic tests like `@all-users`). This is the format defined in [`references/test-template.md`](test-template.md) "Rules".
```

**new_string:**

```
Each `test(...)` title is constructed by prepending the test record's tags to the behavior description: `'<auth-tag> [@smoke] [<user-tag>] <behavior>'` (square brackets = optional). If `smoke: true`, prepend `@smoke ` immediately after the auth-tag; if `smoke: false`, omit it. Omit `<user-tag>` for user-agnostic tests like `@all-users`. This is the format defined in [`references/test-template.md`](test-template.md) "Rules".
```

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(c2c): extend workflow Steps 6 + 7 for smoke classification + @smoke prepend"
```

---

## Task 3: MODIFY `test-template.md` — Per-test title rule + Example

**Files:**

- Modify: `.claude/skills/from-issue/references/test-template.md`

Update the Per-test title rule to show the `[@smoke]` slot. Update the Template skeleton's example test() titles. Update the worked Example at the bottom to include a smoke test.

- [ ] **Step 1: Update the Template skeleton's example test titles to show the new format**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
test.describe('<feature> (<auth-tag>)', () => {
  test.describe('Positive', () => {
    test('<auth-tag> [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
      // Arrange
      await <pageFixture>.goto();
      await <pageFixture>.loginAs('<user>', env.password); // if @no-auth, omit this
      // Act
      await <pageFixture>.<action>();
      // Assert
      await expect(<pageFixture>.<locator>).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('<auth-tag> [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
      // ... one `test(...)` per Negative record from Step 6
    });
  });

  test.describe('Edge', () => {
    test('<auth-tag> [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
      // ... one `test(...)` per Edge record from Step 6
    });
  });
  // Omit any bucket describe whose record list is empty.
});
```

**new_string:**

```
test.describe('<feature> (<auth-tag>)', () => {
  test.describe('Positive', () => {
    test('<auth-tag> [@smoke] [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
      // Arrange
      await <pageFixture>.goto();
      await <pageFixture>.loginAs('<user>', env.password); // if @no-auth, omit this
      // Act
      await <pageFixture>.<action>();
      // Assert
      await expect(<pageFixture>.<locator>).toBeVisible();
    });
  });

  test.describe('Negative', () => {
    test('<auth-tag> [@smoke] [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
      // ... one `test(...)` per Negative record from Step 6
    });
  });

  test.describe('Edge', () => {
    test('<auth-tag> [@smoke] [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
      // ... one `test(...)` per Edge record from Step 6
    });
  });
  // Omit any bucket describe whose record list is empty.
});
```

- [ ] **Step 2: Update the Per-test title rule to document the @smoke slot**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
- **Per-test title** — `'<auth-tag> [<user-tag>] <behavior description>'` (square brackets = optional). Examples:
  - `'@no-auth standard_user logs in successfully and lands on inventory'`
  - `'@standard remove single item from cart updates cart badge'`
  - The `<user-tag>` is the saucedemo user name (e.g., `standard_user`, `locked_out_user`); omit if the test is user-agnostic.
```

**new_string:**

```
- **Per-test title** — `'<auth-tag> [@smoke] [<user-tag>] <behavior description>'` (square brackets = optional). `@smoke` slots in immediately after the auth-tag when the test is smoke-worthy per [`smoke-policy.md`](smoke-policy.md); otherwise omit it. Examples:
  - `'@no-auth @smoke standard_user logs in successfully and lands on inventory'` (smoke = true)
  - `'@no-auth invalid password shows generic error'` (smoke = false; secondary error path)
  - `'@standard @smoke checkout with valid info completes successfully'` (smoke = true)
  - The `<user-tag>` is the saucedemo user name (e.g., `standard_user`, `locked_out_user`); omit if the test is user-agnostic.
```

- [ ] **Step 3: Update the worked Example at the bottom to include @smoke on the appropriate test**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
test.describe('login (@no-auth)', () => {
  test.describe('Positive', () => {
    test('@no-auth standard_user logs in successfully and lands on inventory', async ({
      loginPage,
      page,
    }) => {
      await loginPage.goto();
      await loginPage.loginAs('standard_user', env.password);
      await expect(page).toHaveURL(/\/inventory\.html$/);
    });
  });

  test.describe('Negative', () => {
    test('@no-auth locked_out_user sees the lockout error', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('locked_out_user', env.password);
      await expect(loginPage.errorBanner).toBeVisible();
      expect(await loginPage.getErrorText()).toContain('locked out');
    });
  });
  // Edge describe omitted — no edge tests for this issue.
});
```

**new_string:**

```
test.describe('login (@no-auth)', () => {
  test.describe('Positive', () => {
    test('@no-auth @smoke standard_user logs in successfully and lands on inventory', async ({
      loginPage,
      page,
    }) => {
      await loginPage.goto();
      await loginPage.loginAs('standard_user', env.password);
      await expect(page).toHaveURL(/\/inventory\.html$/);
    });
  });

  test.describe('Negative', () => {
    test('@no-auth @smoke locked_out_user sees the lockout error', async ({ loginPage }) => {
      await loginPage.goto();
      await loginPage.loginAs('locked_out_user', env.password);
      await expect(loginPage.errorBanner).toBeVisible();
      expect(await loginPage.getErrorText()).toContain('locked out');
    });
  });
  // Edge describe omitted — no edge tests for this issue.
});
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/from-issue/references/test-template.md
git commit -m "feat(c2c): test-template — add [@smoke] slot to title format + smoke-tagged worked example"
```

---

## Task 4: MODIFY `pr-description-template.md` — ⚡ marker for smoke tests

**Files:**

- Modify: `.claude/skills/from-issue/references/pr-description-template.md`

Three edits: Test column rule update, smoke-warnings Verification rule (parallel to bucket-warnings), Example AC coverage table shows `⚡` markers.

- [ ] **Step 1: Update the Test column rule to document the ⚡ marker**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped.
```

**new_string:**

```
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped. Prepend `⚡ ` INSIDE the backticks for smoke tests (those with `@smoke` in the title), e.g., `` `⚡ @no-auth @smoke standard_user logs in...` ``. Non-smoke tests have no prefix.
```

- [ ] **Step 2: Add a Verification — smoke warnings rule (parallel to existing bucket warnings)**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
- **Verification — bucket warnings**: If workflow Step 6 emitted any "invalid bucket" soft warnings (per [`bucket-classification.md`](bucket-classification.md)), append them as additional bullets at the END of the Verification section, after the Test run list. Example: `- ⚠️ LLM emitted invalid bucket "Boundary" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`
```

**new_string:**

```
- **Verification — bucket warnings**: If workflow Step 6 emitted any "invalid bucket" soft warnings (per [`bucket-classification.md`](bucket-classification.md)), append them as additional bullets at the END of the Verification section, after the Test run list. Example: `- ⚠️ LLM emitted invalid bucket "Boundary" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`
- **Verification — smoke warnings**: If workflow Step 6 emitted any "invalid smoke value" soft warnings (per [`smoke-policy.md`](smoke-policy.md)), append them as additional bullets at the END of the Verification section, after any bucket warnings. Example: `- ⚠️ LLM emitted invalid smoke value "maybe" for test "<title>" — defaulted to false. Reviewer: verify classification.`
```

- [ ] **Step 3: Update the worked Example's AC coverage table to show ⚡ on the smoke test**

Use the Edit tool with `replace_all: false`. The current file uses compact column alignment (`|----|------|--------|--------|`).

**old_string:**

```
| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `@no-auth standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `@no-auth locked_out_user sees the lockout error` | Negative | ✅ generated |
```

**new_string:**

```
| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `⚡ @no-auth @smoke standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `⚡ @no-auth @smoke locked_out_user sees the lockout error` | Negative | ✅ generated |
```

- [ ] **Step 4: Run prettier and verify format passes**

```bash
npx prettier --write .claude/skills/from-issue/references/pr-description-template.md
npx prettier --check .claude/skills/from-issue/references/pr-description-template.md && echo "OK"
```

Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(c2c): pr-description-template — add ⚡ marker for smoke tests + smoke-warnings rule"
```

---

## Task 5: MODIFY `SKILL.md` — register `smoke-policy.md` in References

**Files:**

- Modify: `.claude/skills/from-issue/SKILL.md`

One-line addition to the References section.

- [ ] **Step 1: Add the smoke-policy.md pointer**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)
```

**new_string:**

```
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)
- [`references/smoke-policy.md`](references/smoke-policy.md) — `@smoke` selection criteria + worked examples (C.2.c)
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/from-issue/SKILL.md
git commit -m "docs(c2c): register smoke-policy.md in SKILL.md References"
```

---

## Task 6: MODIFY `package.json` — add `test:smoke` script

**Files:**

- Modify: `package.json`

Insert the new `test:smoke` script after `test:headed` (keeps test-invocation scripts grouped before `report`/`codegen`).

- [ ] **Step 1: Add the `test:smoke` script**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
    "test:headed": "playwright test --project=standard --headed",
    "report": "playwright show-report",
```

**new_string:**

```
    "test:headed": "playwright test --project=standard --headed",
    "test:smoke": "playwright test --grep '@smoke'",
    "report": "playwright show-report",
```

- [ ] **Step 2: Verify the script is valid JSON and runs (will match zero tests pre-merge — that's fine)**

```bash
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8'))" && echo "JSON OK"
npm run test:smoke -- --list 2>&1 | tail -5
```

Expected: `JSON OK`. The `npm run test:smoke -- --list` should exit cleanly; it may print "0 tests" or similar — that's expected because no committed test file has `@smoke` yet.

- [ ] **Step 3: Run prettier and format check**

```bash
npx prettier --write package.json
npx prettier --check package.json && echo "OK"
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat(c2c): add npm run test:smoke script (playwright --grep @smoke)"
```

---

## Task 7: MODIFY `CLAUDE.md` — register `@smoke` in Tag conventions table

**Files:**

- Modify: `CLAUDE.md`

Append a new row to the Tag conventions table. Note: the table uses wide-aligned columns (padded with spaces). Match the existing alignment.

- [ ] **Step 1: Read the current Tag conventions table for context**

Use Read on `CLAUDE.md` lines 76-90 to see the exact current alignment of the table.

- [ ] **Step 2: Insert the `@smoke` row at the END of the Tag conventions table**

The current last row is `@sort-functional`. Add the `@smoke` row after it.

Use the Edit tool with `replace_all: false`.

**old_string:**

```
| `@sort-functional`    | `standard`, `performance_glitch`, `visual`, `firefox-standard`, `webkit-standard` | Sort tests (excluded from `problem`/`error` — saucedemo breaks the sort dropdown for those users) |
```

**new_string:**

```
| `@sort-functional`    | `standard`, `performance_glitch`, `visual`, `firefox-standard`, `webkit-standard` | Sort tests (excluded from `problem`/`error` — saucedemo breaks the sort dropdown for those users) |
| `@smoke`              | Cross-cutting (filtered via `--grep '@smoke'`)                                    | Build-verification candidates from /from-issue. Selected per `smoke-policy.md`. Run via `npm run test:smoke`. |
```

- [ ] **Step 3: Verify CLAUDE.md is still ≤150 lines**

```bash
wc -l CLAUDE.md
```

Expected: ≤150. If above: STOP — trim something less essential or push detail into a `docs/` file.

- [ ] **Step 4: Run prettier (CLAUDE.md may need column re-alignment)**

```bash
npx prettier --write CLAUDE.md
npx prettier --check CLAUDE.md && echo "OK"
```

Expected: `OK`. Prettier may adjust column widths in the table — that's fine, it preserves the row content.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): register @smoke in Tag conventions table"
```

---

## Task 8: MODIFY `docs/from-issue.md` — note smoke selection + update example + reviewer override

**Files:**

- Modify: `docs/from-issue.md`

Three edits: paragraph in "What is `/from-issue`", updated bucket-structure snippet to show ⚡, and a brief "Reviewer override" note.

- [ ] **Step 1: Add a smoke paragraph in "What is `/from-issue`"**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
**Test bucketing (since C.2.b):** Generated tests are grouped into up to three nested describe blocks — `Positive`, `Negative`, `Edge` — based on the LLM's classification of each test (rules in [`.claude/skills/from-issue/references/bucket-classification.md`](../.claude/skills/from-issue/references/bucket-classification.md)). Empty buckets are omitted. The PR description's AC coverage table includes a `Bucket` column so reviewers see the classification at a glance.
```

**new_string:**

```
**Test bucketing (since C.2.b):** Generated tests are grouped into up to three nested describe blocks — `Positive`, `Negative`, `Edge` — based on the LLM's classification of each test (rules in [`.claude/skills/from-issue/references/bucket-classification.md`](../.claude/skills/from-issue/references/bucket-classification.md)). Empty buckets are omitted. The PR description's AC coverage table includes a `Bucket` column so reviewers see the classification at a glance.

**Smoke tagging (since C.2.c):** A curated subset of generated tests receive the `@smoke` tag. Selection is LLM judgment per test against [`.claude/skills/from-issue/references/smoke-policy.md`](../.claude/skills/from-issue/references/smoke-policy.md) — default is NOT smoke. Smoke is orthogonal to bucket: a Negative test can be smoke (critical regression risk), a Positive test can be NOT-smoke (peripheral happy path). Run the smoke subset with `npm run test:smoke`. PR coverage table shows a `⚡` marker for smoke tests.
```

- [ ] **Step 2: Update the "Inspect the bucket structure" snippet to show @smoke on appropriate tests**

Use the Edit tool with `replace_all: false`.

**old_string:**

````
A generated file with mixed Positive + Negative tests looks like:

```ts
test.describe('login (@no-auth)', () => {
  test.describe('Positive', () => {
    test('@no-auth standard_user logs in successfully and lands on inventory', async ({
      loginPage,
      page,
    }) => {
      /* ... */
    });
  });

  test.describe('Negative', () => {
    test('@no-auth locked_out_user sees the lockout error', async ({ loginPage }) => {
      /* ... */
    });
  });
  // Edge describe omitted — no edge tests for this issue.
});
```

Bucket order is fixed (`Positive → Negative → Edge`). Empty buckets are omitted entirely (no empty describes left in the file). Reviewers can also see the per-test bucket in the PR body's AC coverage table (4-column: `AC | Test | Bucket | Status`).
````

**new_string:**

````
A generated file with mixed Positive + Negative tests + smoke selection looks like:

```ts
test.describe('login (@no-auth)', () => {
  test.describe('Positive', () => {
    test('@no-auth @smoke standard_user logs in successfully and lands on inventory', async ({
      loginPage,
      page,
    }) => {
      /* ... */
    });
  });

  test.describe('Negative', () => {
    test('@no-auth @smoke locked_out_user sees the lockout error', async ({ loginPage }) => {
      /* ... critical auth-rejection regression risk — selected as smoke */
    });
    test('@no-auth invalid password shows generic error', async ({ loginPage }) => {
      /* ... secondary error path — NOT smoke */
    });
  });
  // Edge describe omitted — no edge tests for this issue.
});
```

Bucket order is fixed (`Positive → Negative → Edge`). Empty buckets are omitted entirely. Reviewers see the per-test bucket in the PR body's AC coverage table (`AC | Test | Bucket | Status`) and smoke tests are flagged with `⚡` in the Test column.

### Reviewer override: changing the smoke set on a PR

If you disagree with the LLM's smoke picks on a PR, edit the generated file directly in the same PR — add `@smoke ` after the auth-tag of a test that should be smoke, or remove `@smoke ` from a test that shouldn't be. The orchestrator does NOT re-run on the same issue. The PR is the curation gate; the LLM is just the first draft.
````

- [ ] **Step 3: Run prettier on the file**

```bash
npx prettier --write docs/from-issue.md
npx prettier --check docs/from-issue.md && echo "OK"
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add docs/from-issue.md
git commit -m "docs(c2c): from-issue learning guide — note smoke tagging + reviewer override pattern"
```

---

## Task 9: Smoke test the smoke logic end-to-end

**Files:** No code changes expected. Verifies the skill produces correctly-tagged smoke tests and captures any defects to fix.

This task creates a real GitHub Issue with ACs designed to span both smoke=true and smoke=false outcomes, runs `/from-issue`, verifies the generated file + PR body + `npm run test:smoke` behavior, and cleans up.

- [ ] **Step 1: Pre-flight checks**

```bash
ls src/pages/LoginPage.ts
gh auth status
gh repo view --json nameWithOwner
```

Expected: file exists; `gh` authenticated. If anything fails: STOP and report BLOCKED.

- [ ] **Step 2: Create the test issue via `gh` (4 ACs designed for mixed smoke selection)**

```bash
gh issue create --title "[TBA] Login coverage with smoke selection" --label "to-be-automated" --body "$(cat <<'EOF'
### Feature

login

### Page Name

LoginPage

### User Story

_No response_

### Acceptance Criteria

AC 1: Standard user logs in with valid credentials and lands on inventory page.
AC 2: Locked-out user sees the lockout error message.
AC 3: Invalid password shows a generic error message.
AC 4: Username with leading whitespace is rejected the same as malformed input.

### Notes

Smoke test for /from-issue Phase C.2.c smoke selection — expecting AC1 + AC2 to be smoke, AC3 + AC4 to be not-smoke. Will be closed after verification.
EOF
)"
```

Capture the issue number from the returned URL.

Verify:

```bash
gh issue view <num> --json title,labels,number,url
```

- [ ] **Step 3: Invoke `/from-issue` on the new issue**

Use the `Skill` tool with `skill: "from-issue"` and `args: "<issue-number>"`. The skill should execute the full 13-step workflow autonomously.

- [ ] **Step 4: Verify the generated test file's smoke + bucket structure**

```bash
ls tests/login/
# Read the new file (slug derived from issue title)
```

Verify:

- File exists with slug ≤40 chars.
- First 5 lines match the provenance block.
- Imports from `@fixtures/test`.
- Outer `test.describe('login (@no-auth)', ...)` contains exactly 3 nested describes: Positive (1 test), Negative (2 tests), Edge (1 test).
- **Smoke tagging:**
  - Positive test (AC1, standard_user login) has `@smoke` in title.
  - First Negative test (AC2, locked_out) has `@smoke` in title (per smoke-policy.md ambiguity: critical auth-rejection regression).
  - Second Negative test (AC3, invalid password) does NOT have `@smoke` (secondary error path).
  - Edge test (AC4, whitespace) does NOT have `@smoke` (boundary nicety).
- Title format: `'<auth-tag> [@smoke] [<user-tag>] <behavior>'`.
- Bucket order Positive → Negative → Edge.

Record any deviations as defects for Step 8.

**Acceptable variation:** the LLM may make different smoke calls than the expected 2-smoke pattern above. If it selects 1, 2, or 3 smoke tests AND its rationale is defensible per smoke-policy.md, that's a PASS. Only flag as defect if it selects 0 or 4 (over- or under-tagged extremes), or if the @smoke placement in the title is wrong (e.g., before auth-tag, missing space).

- [ ] **Step 5: Verify the PR body shows ⚡ markers**

```bash
gh pr list --head from-issue/<num>-<slug> --json number,title,body
gh pr view <pr-num> --json title,body,headRefName
```

Verify:

- PR opens on branch `from-issue/<num>-<slug>`.
- Title starts with `feat: tests from #<num>`.
- Body has 5 sections in order (unchanged from C.2.b).
- AC coverage table is still 4 columns (`AC | Test | Bucket | Status` — no new column).
- For each smoke test, the Test column shows `⚡ ` prefix INSIDE the backticks.
- For non-smoke tests, the Test column has no prefix.
- Verification shows Typecheck ✅ + all 4 tests ✅ PASS.
- Collision warning present for `LoginPage`.

Record any deviations as defects.

- [ ] **Step 6: Verify `npm run test:smoke` filters correctly**

Switch to the from-issue branch temporarily to verify the smoke filter works on the generated tests:

```bash
git checkout from-issue/<num>-<slug>
npm run test:smoke -- --list 2>&1 | tail -20
git checkout phase-c2c-smoke-tag
```

Expected: the output lists exactly the smoke-tagged tests from the new file (and no others, since this is a fresh branch with no other `@smoke` tests). Verify the count matches what Step 4 showed in the generated file.

If `npm run test:smoke` lists ZERO tests despite the file containing `@smoke` titles: defect — likely the `--grep` is not finding the tag. Check the title placement (must be `@smoke` exactly, not `@Smoke` or `@SMOKE`).

- [ ] **Step 7: Verify source issue got a comment with the PR URL**

```bash
gh issue view <num> --comments
```

Latest comment should include the PR URL.

- [ ] **Step 8: Triage defects (if any from Steps 4-7)**

If any verification surfaced a defect:

1. Capture the defect verbatim.
2. Determine which reference file owns the bug:
   - Smoke placement / format drift → `workflow.md` (Step 7) or `test-template.md` (Per-test title rule)
   - Smoke classification drift (LLM tagged something obviously wrong) → `smoke-policy.md` (sharper examples or new ambiguity rule)
   - ⚡ marker format drift → `pr-description-template.md`
   - Invalid smoke fallback not working → `workflow.md` (Step 6 validation note)
   - `npm run test:smoke` not finding tests → check title format in workflow.md Step 7
3. Edit + commit with: `git commit -m "fix(c2c): <defect> in <file>"`.

Do NOT re-run the skill from Step 3 — log defects + fixes and we'll re-verify separately.

- [ ] **Step 9: Cleanup (REQUIRED — must run even if defects were found)**

```bash
# Close the PR
gh pr close <pr-num> --comment "Smoke test for /from-issue Phase C.2.c smoke tagging — closing."

# Delete remote branch
git push origin --delete from-issue/<num>-<slug>

# Switch back + delete local branch
git checkout phase-c2c-smoke-tag
git branch -D from-issue/<num>-<slug>

# Close source issue
gh issue close <num> --comment "Smoke test complete — closing."

# Verify no smoke artifacts on phase-c2c-smoke-tag
ls tests/login/   # should ONLY show the existing login.spec.ts
git status        # should be clean
```

If a generated test file accidentally landed on `phase-c2c-smoke-tag` (it shouldn't): `rm tests/login/<slug>.spec.ts`.

- [ ] **Step 10: Report back**

- Status: DONE | DONE_WITH_DEFECTS | BLOCKED
- Test issue URL (now closed)
- PR URL (now closed)
- Per-verification-step results from Steps 4-7 (be SPECIFIC about which checks passed/failed)
- Smoke selection observed (which ACs got `@smoke`, with rationale)
- Defects found + fixes applied (with commit SHAs)
- Confirmation cleanup completed (clean working tree on `phase-c2c-smoke-tag`)

---

## Done

After Task 9 passes cleanly:

- 1 new file: `.claude/skills/from-issue/references/smoke-policy.md`
- 7 modified files: `workflow.md`, `test-template.md`, `pr-description-template.md`, `SKILL.md`, `package.json`, `CLAUDE.md`, `docs/from-issue.md`
- `phase-c2c-smoke-tag` branch holds the work, ready for merge to `main`
- A successful smoke run was demonstrated (smoke selection + ⚡ marker + `npm run test:smoke` filter), then cleaned up
- Any defects found in the smoke run were fixed in the appropriate file

The C.2 arc is complete after this merges. Hand off to `superpowers:finishing-a-development-branch`.
