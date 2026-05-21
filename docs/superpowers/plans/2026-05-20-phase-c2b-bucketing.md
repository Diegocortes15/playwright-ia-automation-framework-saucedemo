# Phase C.2.b — Positive/Negative/Edge Bucketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `/from-issue` (C.2.a) to organize generated tests into three nested describe blocks (`Positive`, `Negative`, `Edge`) based on LLM classification of each test. PR body's AC coverage table gains a `Bucket` column.

**Architecture:** Pure doc/skill phase. Adds 1 new reference doc (`bucket-classification.md`) and modifies 5 existing files inside the `from-issue` skill: `workflow.md` (Steps 6 + 7), `test-template.md` (Template + new Rule), `pr-description-template.md` (3→4 col AC coverage table), `SKILL.md` (one pointer line), `docs/from-issue.md` (paragraph + before/after snippet). Zero changes to `src/`, `tests/`, CLAUDE.md, ADR-0008, or the GitHub Issue Template.

**Tech Stack:** Claude Code skills (prose-only) · Markdown · Existing `/from-issue` skill (C.2.a) · Existing `gh` CLI.

**Spec:** [`docs/superpowers/specs/2026-05-20-phase-c2b-bucketing-design.md`](../specs/2026-05-20-phase-c2b-bucketing-design.md) (committed at `3f2e96c`)

---

## Pre-flight: branch + clean baseline

**Files:** None modified in pre-flight.

- [ ] **Step 1: Confirm we're on `phase-c2b-bucketing` with a clean tree**

```
git status
git branch --show-current
```

Expected: branch `phase-c2b-bucketing`, working tree clean (or only ignored files).

If on `main` or dirty: STOP and ask the human.

- [ ] **Step 2: Confirm baseline checks pass**

```
npm run typecheck
npm run lint
npm run format:check
```

All three must exit 0. (Skipping `npm test` here — this phase doesn't touch test-affecting code; the full matrix runs naturally during Task 7's smoke test against the generated PR.)

- [ ] **Step 3: Confirm `/from-issue` (C.2.a) is installed and discoverable**

```
ls .claude/skills/from-issue/SKILL.md
ls .claude/skills/from-issue/references/
```

Expected: `SKILL.md` exists; `references/` contains `workflow.md`, `test-template.md`, `pr-description-template.md`. (Note: `bucket-classification.md` does NOT exist yet — Task 1 creates it.)

If missing: STOP — C.2.a isn't merged.

- [ ] **Step 4: Confirm `gh` is authenticated**

```
gh auth status
```

Expected: shows an authenticated GitHub account with `repo` scope.

If unauthenticated: STOP — ask the human to run `gh auth login`.

---

## Task 1: NEW reference doc — `bucket-classification.md`

**Files:**

- Create: `.claude/skills/from-issue/references/bucket-classification.md`

This is the single source of truth for how the LLM classifies tests into Positive/Negative/Edge. Mirrors the structural pattern of C.1's `component-detection.md`.

- [ ] **Step 1: Verify the target file doesn't exist yet**

```
ls .claude/skills/from-issue/references/bucket-classification.md 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`. If it already exists: STOP and ask the controller.

- [ ] **Step 2: Write `references/bucket-classification.md`**

Use the Write tool to create `.claude/skills/from-issue/references/bucket-classification.md` with the EXACT following content verbatim:

````markdown
# Bucket Classification Reference

The `/from-issue` skill uses this doc to classify each generated test into one of three buckets: **Positive**, **Negative**, or **Edge**. The classification is recorded in the test's `bucket` field in Step 6 of [`workflow.md`](workflow.md), then drives the nested describe structure in Step 7 and the `Bucket` column in the PR description's AC coverage table (see [`pr-description-template.md`](pr-description-template.md)).

## Bucket definitions

### Positive

Tests that verify expected behavior under valid inputs and normal state. The happy path. The user does what they're supposed to do; the system responds correctly.

### Negative

Tests that verify expected failure modes under invalid inputs, missing required data, or unauthorized state. The user does something the system should reject; the system rejects cleanly with the right error.

### Edge

Tests that verify boundary conditions, unusual but valid inputs, performance assertions, or other "interesting" states that aren't strictly happy or sad path. The catch-all bucket for tests that don't cleanly fit Positive or Negative.

## Worked examples

### Positive (3 examples)

- AC: "Standard user logs in with valid credentials and lands on inventory page."
  → Test: `@no-auth standard_user logs in successfully and lands on inventory`
  → **Positive** — valid input, expected success.

- AC: "User can add a product to the cart and the cart badge increments."
  → Test: `@all-users add product increments cart badge`
  → **Positive** — normal happy-path flow.

- AC: "User sorts products by price descending and sees products in the expected order."
  → Test: `@standard sort by price descending shows products in order`
  → **Positive** — valid input, expected behavior verified.

### Negative (3 examples)

- AC: "Locked-out user sees the lockout error message."
  → Test: `@no-auth locked_out_user sees the lockout error`
  → **Negative** — expected failure, system rejects.

- AC: "Submitting checkout with missing postal code shows a validation error."
  → Test: `@standard checkout without postal code shows validation error`
  → **Negative** — invalid input, system rejects.

- AC: "User attempts to access cart without logging in and is redirected to the login page."
  → Test: `@no-auth unauthenticated cart access redirects to login`
  → **Negative** — unauthorized state, system rejects.

### Edge (3 examples)

- AC: "Username with leading/trailing whitespace is rejected the same way as malformed input."
  → Test: `@no-auth username with whitespace is rejected`
  → **Edge** — unusual input variation; tests boundary handling.

- AC: "Inventory page loads within 2 seconds on a cold cache."
  → Test: `@standard inventory page loads within 2 seconds`
  → **Edge** — performance assertion; not a happy/sad path behavior.

- AC: "Adding 100 products to the cart works without UI degradation."
  → Test: `@standard cart handles 100 items without degradation`
  → **Edge** — boundary condition; stress test of normal flow.

## Ambiguity rules

When a test could plausibly fit multiple buckets, apply these tiebreakers in order:

1. **Performance assertion** → Edge, NOT Negative. A slow page isn't "wrong behavior", it's a boundary check.
2. **Missing required input** → Negative, NOT Edge. Empty/missing fields are the canonical negative case.
3. **Multi-AC test spanning happy + sad path** → bucket by the _primary_ assertion. If the test's main `expect()` checks an error message, it's Negative. If it checks a success state, it's Positive. The presence of secondary happy-path setup steps doesn't change the bucket.
4. **Visual regression / accessibility check** → Edge, NOT Positive. These are auxiliary verifications, not flow-correctness.
5. **Locale / i18n / browser variation** → Edge. Variation across environments is by definition a boundary concern.

## When in doubt

Default to **Edge**. It's the catch-all bucket. Misclassifying a Positive test as Edge surfaces in PR review (reviewer can recategorize); misclassifying a Negative test as Positive silently hides the negative coverage.
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/references/bucket-classification.md
git commit -m "feat(c2b): add bucket-classification.md reference (Positive/Negative/Edge definitions + worked examples)"
```

---

## Task 2: MODIFY `workflow.md` — extend Step 6 + Step 7

**Files:**

- Modify: `.claude/skills/from-issue/references/workflow.md` (Step 6 record shape, validation note, Step 7 nesting rule)

Step 6 records gain a `bucket` field. Insert a "Validate bucket values" note. Step 7 documents the nested-describe rendering with omit-empty + fixed order.

- [ ] **Step 1: Read the current Step 6 and Step 7 in `workflow.md` for context**

Use the Read tool on `.claude/skills/from-issue/references/workflow.md` lines 100–127 to see the exact current text.

- [ ] **Step 2: Extend Step 6's record shape and add classification + validation guidance**

Use the Edit tool.

**old_string:**

````
### 6. Analyze ACs

Group the `worth_automating=true` AC records into a set of tests. One test may cover multiple ACs (spec §2 Decision 5 — adaptive multi-test). For each test, record:

```
{
  title: "<behavior-only description, e.g., 'remove single item from cart updates badge'>",
  covers: [1, 3],  // AC IDs
  user: "<saucedemo user>",
  tags: ["<auth-tag>", "<user-tag-if-not-no-auth>"]
}
```

Tag selection follows CLAUDE.md "Tag conventions" table. Title format follows [`references/test-template.md`](test-template.md) "Rules".
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
  bucket: "Positive" | "Negative" | "Edge"
}
```

Tag selection follows CLAUDE.md "Tag conventions" table. Title format follows [`references/test-template.md`](test-template.md) "Rules". Bucket assignment follows [`references/bucket-classification.md`](bucket-classification.md) — read it before classifying. The bucket lives on the test (not on the AC) because one test can cover multiple ACs; classify by the test's dominant behavior, using the ambiguity rules in bucket-classification.md as the tiebreaker.

**Validate bucket values before Step 7.** Each test's `bucket` must be one of `{Positive, Negative, Edge}`. If the LLM emits any other value (e.g., `"Boundary"`), default that test to `Edge` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid bucket "<value>" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`

**If `references/bucket-classification.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/bucket-classification.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules — the doc is the source of truth.
````

- [ ] **Step 3: Extend Step 7 to document nested-describe rendering**

Use the Edit tool.

**old_string:**

```
### 7. Render test file

Apply [`references/test-template.md`](test-template.md):

- Top-of-file 5-line provenance block (substitute today's date, issue number, URL, title)
- Imports: `@fixtures/test` (always), `@utils/env` (when password needed)
- Single `test.describe('<feature> (<auth-tag>)', ...)` wrap
- One `test(...)` per record from Step 6, ordered as emitted

Each `test(...)` title is constructed by prepending the test record's tags to the behavior description: `'<auth-tag> [<user-tag>] <behavior>'` (square brackets = optional; omit `<user-tag>` for user-agnostic tests like `@all-users`). This is the format defined in [`references/test-template.md`](test-template.md) "Rules".

Render to an in-memory string. Do NOT Write yet — Step 8 handles overwrite refusal first.
```

**new_string:**

```
### 7. Render test file

Apply [`references/test-template.md`](test-template.md):

- Top-of-file 5-line provenance block (substitute today's date, issue number, URL, title)
- Imports: `@fixtures/test` (always), `@utils/env` (when password needed)
- Single outer `test.describe('<feature> (<auth-tag>)', ...)` wrap
- Inside the outer describe, group tests by their `bucket` field into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', ...)` blocks
- Bucket describes appear in fixed order: **Positive → Negative → Edge** (even if Negative tests outnumber Positive)
- **Omit empty buckets entirely** — if no tests were classified into a bucket, don't emit its describe block at all
- Within each bucket describe, tests appear in their Step 6 emission order

Each `test(...)` title is constructed by prepending the test record's tags to the behavior description: `'<auth-tag> [<user-tag>] <behavior>'` (square brackets = optional; omit `<user-tag>` for user-agnostic tests like `@all-users`). This is the format defined in [`references/test-template.md`](test-template.md) "Rules".

Render to an in-memory string. Do NOT Write yet — Step 8 handles overwrite refusal first.
```

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(c2b): extend workflow Steps 6 + 7 for bucket classification + nested-describe rendering"
```

---

## Task 3: MODIFY `test-template.md` — update Template skeleton + add "Bucket structure" rule

**Files:**

- Modify: `.claude/skills/from-issue/references/test-template.md` (Template section + Rules section + Example section)

The template skeleton must show nested describes. A new Rule documents the nesting + fixed order + omit-empty. The worked example at the bottom of the file must also be updated to use nested describes (since it currently shows the flat C.2.a structure).

- [ ] **Step 1: Update the Template skeleton (replace the flat describe with nested describes)**

Use the Edit tool.

**old_string:**

````
test.describe('<feature> (<auth-tag>)', () => {
  test('<auth-tag> [<user-tag>] <behavior description>', async ({ <pageFixture>, page }) => {
    // Arrange
    await <pageFixture>.goto();
    await <pageFixture>.loginAs('<user>', env.password); // if @no-auth, omit this
    // Act
    await <pageFixture>.<action>();
    // Assert
    await expect(<pageFixture>.<locator>).toBeVisible();
  });

  // ... one `test(...)` per generated test, ordered as the orchestrator emitted them
});
````

**new_string:**

````
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
````

- [ ] **Step 2: Add a new "Bucket structure" rule to the Rules section**

Insert the rule immediately after the "Describe wrap" rule (line 38 area). Use the Edit tool.

**old_string:**

```
- **Describe wrap** — exactly one `test.describe('<feature> (<auth-tag>)', () => { ... })` block per file. `<feature>` matches the issue template's Feature field; `<auth-tag>` is the dominant auth tag across tests in the file (e.g., `@standard`, `@no-auth`).
```

**new_string:**

```
- **Describe wrap** — exactly one outer `test.describe('<feature> (<auth-tag>)', () => { ... })` block per file. `<feature>` matches the issue template's Feature field; `<auth-tag>` is the dominant auth tag across tests in the file (e.g., `@standard`, `@no-auth`).
- **Bucket structure** — inside the outer describe, group tests into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', () => { ... })` blocks. Order is fixed: **Positive → Negative → Edge**. Omit a bucket describe entirely if it has zero tests (do not render empty describes). The bucket label is exactly one of `Positive` / `Negative` / `Edge` — no other strings, no tags on the describe, no description suffix. Classification rules live in [`bucket-classification.md`](bucket-classification.md).
```

- [ ] **Step 3: Update the worked example at the bottom of the file to use nested describes**

Use the Edit tool.

**old_string:**

````
test.describe('login (@no-auth)', () => {
  test('@no-auth standard_user logs in successfully and lands on inventory', async ({
    loginPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.loginAs('standard_user', env.password);
    await expect(page).toHaveURL(/\/inventory\.html$/);
  });

  test('@no-auth locked_out_user sees the lockout error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('locked_out_user', env.password);
    await expect(loginPage.errorBanner).toBeVisible();
    expect(await loginPage.getErrorText()).toContain('locked out');
  });
});
````

**new_string:**

````
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
````

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/from-issue/references/test-template.md
git commit -m "feat(c2b): test-template — nested describes for Positive/Negative/Edge buckets"
```

---

## Task 4: MODIFY `pr-description-template.md` — 3-col → 4-col AC coverage table

**Files:**

- Modify: `.claude/skills/from-issue/references/pr-description-template.md` (Template AC coverage section + Rules + Example AC coverage section)

Both the Template and the worked Example need the new Bucket column. The Rules section gains one bullet about the Bucket column.

- [ ] **Step 1: Update the Template's AC coverage table (3→4 cols)**

Use the Edit tool. The current file uses compact column alignment (verified by Read).

**old_string:**

```
| AC | Test | Status |
|----|------|--------|
| AC 1: <truncated text> | `<test title>` | ✅ generated |
| AC 2: <truncated text> | `<test title>` | ✅ generated |
| AC 3: <truncated text> | — | ⚠️ skipped: <LLM rationale> |
```

**new_string:**

```
| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: <truncated text> | `<test title>` | Positive | ✅ generated |
| AC 2: <truncated text> | `<test title>` | Negative | ✅ generated |
| AC 3: <truncated text> | — | — | ⚠️ skipped: <LLM rationale> |
```

- [ ] **Step 2: Add a Bucket-column rule in the Rules section**

Use the Edit tool.

**old_string:**

```
- **AC coverage table**:
  - Truncate long AC text to ≤80 chars; reviewers can click through to the issue for full text.
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped.
  - "Status" column: `✅ generated` or `⚠️ skipped: <one-line rationale>`.
```

**new_string:**

```
- **AC coverage table**:
  - Truncate long AC text to ≤80 chars; reviewers can click through to the issue for full text.
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped.
  - "Bucket" column: exactly one of `Positive` / `Negative` / `Edge` for generated tests; em-dash `—` for skipped ACs. Classification follows [`bucket-classification.md`](bucket-classification.md).
  - "Status" column: `✅ generated` or `⚠️ skipped: <one-line rationale>`.
```

- [ ] **Step 3: Update the worked Example's AC coverage table (3→4 cols)**

Use the Edit tool. The current file uses compact column alignment (verified by Read).

**old_string:**

```
| AC | Test | Status |
|----|------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `@no-auth standard_user logs in successfully and lands on inventory` | ✅ generated |
| AC 2: Locked-out user sees an error message. | `@no-auth locked_out_user sees the lockout error` | ✅ generated |
```

**new_string:**

```
| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `@no-auth standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `@no-auth locked_out_user sees the lockout error` | Negative | ✅ generated |
```

- [ ] **Step 4: Run prettier on the file to normalize table alignment, then re-verify the result still represents 4 columns correctly**

```bash
npx prettier --write .claude/skills/from-issue/references/pr-description-template.md
npm run format:check
```

Expected: format:check passes. Open the file and visually confirm both tables now have 4 columns (AC | Test | Bucket | Status).

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(c2b): pr-description-template — add Bucket column to AC coverage table"
```

---

## Task 5: MODIFY `SKILL.md` — register the new reference doc

**Files:**

- Modify: `.claude/skills/from-issue/SKILL.md` (References section)

One-line addition: pointer to the new `bucket-classification.md`.

- [ ] **Step 1: Add the bucket-classification.md pointer to the References section**

Use the Edit tool.

**old_string:**

```
## References

- [`references/workflow.md`](references/workflow.md) — the 13-step procedural workflow
- [`references/test-template.md`](references/test-template.md) — canonical test-file template
- [`references/pr-description-template.md`](references/pr-description-template.md) — structured PR body template
```

**new_string:**

```
## References

- [`references/workflow.md`](references/workflow.md) — the 13-step procedural workflow
- [`references/test-template.md`](references/test-template.md) — canonical test-file template
- [`references/pr-description-template.md`](references/pr-description-template.md) — structured PR body template
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/from-issue/SKILL.md
git commit -m "docs(c2b): register bucket-classification.md in SKILL.md References"
```

---

## Task 6: MODIFY `docs/from-issue.md` — note the new bucket structure

**Files:**

- Modify: `docs/from-issue.md` (add a short paragraph in "What is `/from-issue`" + a before/after snippet in "Worked examples")

Update the learning guide so new readers know about bucketing.

- [ ] **Step 1: Add a paragraph about bucketing in the "What is `/from-issue`" section**

Use the Edit tool.

**old_string:**

```
The skill is **fully autonomous** by default. The PR is the review gate — no interactive checkpoints during execution.

Distinction from `/scaffold-page-object`: **`/from-issue` is the orchestrator** that generates tests. When the issue's Page Name field references a Page that doesn't yet exist in `src/pages/`, `/from-issue` invokes `/scaffold-page-object` to create it first, then generates tests against the resulting Page Object.
```

**new_string:**

```
The skill is **fully autonomous** by default. The PR is the review gate — no interactive checkpoints during execution.

**Test bucketing (since C.2.b):** Generated tests are grouped into up to three nested describe blocks — `Positive`, `Negative`, `Edge` — based on the LLM's classification of each test (rules in [`.claude/skills/from-issue/references/bucket-classification.md`](../.claude/skills/from-issue/references/bucket-classification.md)). Empty buckets are omitted. The PR description's AC coverage table includes a `Bucket` column so reviewers see the classification at a glance.

Distinction from `/scaffold-page-object`: **`/from-issue` is the orchestrator** that generates tests. When the issue's Page Name field references a Page that doesn't yet exist in `src/pages/`, `/from-issue` invokes `/scaffold-page-object` to create it first, then generates tests against the resulting Page Object.
```

- [ ] **Step 2: Add a new "Worked examples" entry showing the nested-describe output**

Use the Edit tool. Find the "Inspect a generated file's comment block" subsection (the last subsection of "Worked examples") and add a new subsection AFTER it.

**old_string:**

````
### Inspect a generated file's comment block

Open any file the skill produced. The first ~5 lines must be:

```ts
// Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
// Source: <issue-url>
// Title: <issue-title>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against the same issue will refuse to overwrite.
```

This block is mandatory per the skill's output template ([`.claude/skills/from-issue/references/test-template.md`](../.claude/skills/from-issue/references/test-template.md)). Future PR reviewers reading the file will know it was AI-generated, where the source issue is, and that edits are expected.
````

**new_string:**

````
### Inspect a generated file's comment block

Open any file the skill produced. The first ~5 lines must be:

```ts
// Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
// Source: <issue-url>
// Title: <issue-title>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against the same issue will refuse to overwrite.
```

This block is mandatory per the skill's output template ([`.claude/skills/from-issue/references/test-template.md`](../.claude/skills/from-issue/references/test-template.md)). Future PR reviewers reading the file will know it was AI-generated, where the source issue is, and that edits are expected.

### Inspect the bucket structure (C.2.b)

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

- [ ] **Step 3: Run prettier and verify format:check passes**

```bash
npx prettier --write docs/from-issue.md
npm run format:check
```

Expected: format:check passes.

- [ ] **Step 4: Commit**

```bash
git add docs/from-issue.md
git commit -m "docs(c2b): from-issue learning guide — note bucketing + nested-describe snippet"
```

---

## Task 7: Smoke test the bucketing end-to-end

**Files:** No code changes expected. Verifies the skill produces correctly-bucketed output and captures any defects to fix.

This task creates a real GitHub Issue with ACs spanning all three buckets, runs `/from-issue`, verifies the generated file + PR body, and cleans up. Same shape as C.2.a's Task 8.

- [ ] **Step 1: Pre-flight — confirm `LoginPage` exists (collision-reuse path)**

```
ls src/pages/LoginPage.ts
gh auth status
gh repo view --json nameWithOwner
```

Expected: file exists; `gh` authenticated.

- [ ] **Step 2: Create the test issue via `gh`**

```bash
gh issue create --title "[TBA] Login coverage with all three buckets" --label "to-be-automated" --body "$(cat <<'EOF'
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

Smoke test for /from-issue Phase C.2.b bucketing — will be closed after verification.
EOF
)"
```

Capture the issue number from the returned URL.

Verify:

```bash
gh issue view <num> --json title,labels,number,url
```

- [ ] **Step 3: Invoke `/from-issue` on the new issue**

Use the `Skill` tool with `skill: "from-issue"` and `args: "<issue-number>"`.

The skill should execute the full 13-step workflow autonomously.

- [ ] **Step 4: Verify the generated test file has the right bucket structure**

```bash
ls tests/login/
# Read the new file (slug derived from issue title)
```

Verify:

- File exists with a slug ≤ 40 chars.
- First 5 lines match the provenance block.
- Imports are from `@fixtures/test`.
- The outer `test.describe('login (@no-auth)', ...)` contains:
  - `test.describe('Positive', () => { ... })` with 1 test (AC 1)
  - `test.describe('Negative', () => { ... })` with 2 tests (AC 2 + AC 3)
  - `test.describe('Edge', () => { ... })` with 1 test (AC 4)
- Bucket order is exactly Positive → Negative → Edge.
- No empty bucket describes.
- Per-test titles are behavior-only (no AC numbers in titles).

Record any deviations as defects for Step 8.

- [ ] **Step 5: Verify the PR body has the 4-column AC coverage table**

```bash
gh pr list --head from-issue/<num>-<slug> --json number,title,body
gh pr view <pr-num> --json title,body
```

Verify:

- PR opens on branch `from-issue/<num>-<slug>`.
- Body has 5 sections in order: `What I understood` / `AC coverage` / `Verification` / `Collision warnings` / `Source`.
- AC coverage table is 4 columns (`AC | Test | Bucket | Status`).
- AC 1 → Bucket=`Positive`, AC 2 → `Negative`, AC 3 → `Negative`, AC 4 → `Edge`.
- Verification shows Typecheck ✅ + all 4 tests ✅.
- Collision warning present for `LoginPage`.
- Source line links back to the issue.

Record any deviations as defects for Step 8.

- [ ] **Step 6: Verify the source issue got a comment with the PR URL**

```bash
gh issue view <num> --comments
```

Latest comment should include the PR URL.

- [ ] **Step 7: Optional — second smoke run for omit-empty behavior**

Create a pure-Positive test issue (e.g., title `"[TBA] Pure positive coverage"`, ACs: `AC 1: User can view inventory after login.` + `AC 2: User can sort products by price.`). Run `/from-issue <num>`. Verify the generated file has ONLY the `Positive` inner describe — no empty `Negative` or `Edge` blocks. Clean up after (close PR, delete branches, close issue).

Skip if Step 4 already produced a clean three-bucket structure and you're confident in the omit-empty behavior.

- [ ] **Step 8: Triage defects (if any from Steps 4–6)**

If any verification surfaced a defect:

1. Capture the defect verbatim.
2. Determine which reference file owns the bug:
   - Output bucket label / ordering drift → `workflow.md` (Step 7) or `test-template.md` (Bucket structure rule)
   - 4-column table format drift → `pr-description-template.md`
   - Classification drift (LLM bucketed something obviously wrong) → `bucket-classification.md` (sharper examples or new ambiguity rule)
   - Invalid bucket fallback not working → `workflow.md` (Step 6 validation note)
3. Edit the file, commit with: `git commit -m "fix(c2b): <defect> in <file>"`.

Do not re-run the skill from Step 3 unless the defect is critical — log defects + fixes and we'll re-verify separately.

- [ ] **Step 9: Cleanup (REQUIRED — must run even if defects were found)**

```bash
# Close the PR(s)
gh pr close <pr-num> --comment "Smoke test for /from-issue Phase C.2.b bucketing — closing."

# Delete remote branch(es)
git push origin --delete from-issue/<num>-<slug>

# Switch back to working branch + delete local branch(es)
git checkout phase-c2b-bucketing
git branch -D from-issue/<num>-<slug>

# Close source issue(s)
gh issue close <num> --comment "Smoke test complete — closing."

# Verify no smoke artifacts on phase-c2b-bucketing
ls tests/login/   # should NOT show the new spec file
git status        # should be clean
```

If a generated test file accidentally landed on `phase-c2b-bucketing` (it shouldn't — it lives only on the deleted from-issue branch): `rm tests/login/<slug>.spec.ts`.

- [ ] **Step 10: Report**

Report back:

- Status: DONE | DONE_WITH_DEFECTS | BLOCKED
- Test issue URL(s) (now closed)
- PR URL(s) (now closed)
- Verification result per check in Steps 4–6
- Defects found + fixes applied (with commit SHAs)
- Confirmation cleanup completed (clean working tree on `phase-c2b-bucketing`)

---

## Done

After Task 7 passes cleanly:

- 1 new file: `.claude/skills/from-issue/references/bucket-classification.md`
- 5 modified files: `workflow.md`, `test-template.md`, `pr-description-template.md`, `SKILL.md`, `docs/from-issue.md`
- `phase-c2b-bucketing` branch holds the work, ready for merge to `main`
- A successful smoke run was demonstrated (three-bucket structure + 4-col PR table), then cleaned up
- Any defects found in the smoke run were fixed in the appropriate reference file

Hand off to `superpowers:finishing-a-development-branch` to integrate.
