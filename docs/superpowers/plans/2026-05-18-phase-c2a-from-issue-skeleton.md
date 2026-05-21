# Phase C.2.a — `/from-issue` Orchestrator Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a custom Claude Code skill `/from-issue <issue-number>` that reads a `to-be-automated`-labeled GitHub Issue, generates a set of Playwright tests against the framework's Page Objects (composing `/scaffold-page-object` when a target Page doesn't exist), and opens a PR with a structured description.

**Architecture:** Pure docs + config + skill phase. Adds 6 new files (compact `SKILL.md` + 3 references + 1 learning guide + 1 GitHub Issue Template), modifies 1 (`CLAUDE.md` to register the skill in the "Custom skills" section). Zero changes to `src/`, `tests/`, `data/`, `playwright.config.ts`, `package.json`, or CI.

**Tech Stack:** Claude Code skills (prose-only) · YAML (GitHub Issue Forms) · Markdown · Existing `/scaffold-page-object` skill (from C.1) · Existing `gh` CLI.

**Spec:** [`docs/superpowers/specs/2026-05-18-phase-c2a-from-issue-skeleton-design.md`](../specs/2026-05-18-phase-c2a-from-issue-skeleton-design.md) (committed at `2292de6`)

---

## Pre-flight: branch + clean baseline

**Files:** None modified in pre-flight.

- [ ] **Step 1: Confirm we're on `phase-c2a-from-issue-skeleton` with a clean tree**

```
git status
git branch --show-current
```

Expected: branch `phase-c2a-from-issue-skeleton`, working tree clean (or only ignored files).

If on `main` or dirty: STOP and ask the human.

- [ ] **Step 2: Confirm baseline checks pass**

```
npm run typecheck
npm run lint
npm run format:check
```

All three must exit 0. (Skipping `npm test` here — this phase doesn't touch test-affecting code; the full matrix runs naturally during Task 8's smoke test against the generated PR.)

- [ ] **Step 3: Confirm `gh` is authenticated**

```
gh auth status
```

Expected: shows an authenticated GitHub account with `repo` scope. The skill uses `gh` for issue fetch, PR create, and issue comment.

If unauthenticated: STOP — ask the human to run `gh auth login`.

- [ ] **Step 4: Confirm `/scaffold-page-object` (C.1) is installed and discoverable**

```
ls .claude/skills/scaffold-page-object/SKILL.md
ls .claude/skills/scaffold-page-object/references/
```

Expected: `SKILL.md` exists; `references/` contains `workflow.md`, `page-object-template.md`, `component-detection.md`.

If missing: STOP — C.1 isn't merged.

---

## Task 1: GitHub Issue Template (`to-be-automated.yml`)

**Files:**

- Create: `.github/ISSUE_TEMPLATE/to-be-automated.yml`

This task adds the YAML form BAs/reporters fill out when filing an issue that should produce automated tests. Five structured fields per spec §2 Decision 2.

- [ ] **Step 1: Verify `.github/ISSUE_TEMPLATE/` exists or create it**

```
ls .github/ISSUE_TEMPLATE/ 2>/dev/null || mkdir -p .github/ISSUE_TEMPLATE
```

Expected: directory exists (created or pre-existing).

- [ ] **Step 2: Write the issue template YAML**

Use the Write tool to create `.github/ISSUE_TEMPLATE/to-be-automated.yml`:

```yaml
name: To Be Automated
description: File a feature/test request that should be turned into Playwright tests via /from-issue.
title: '[TBA] '
labels: ['to-be-automated']
body:
  - type: markdown
    attributes:
      value: |
        Fill out this form to request automated test coverage. The `/from-issue` Claude Code skill will read this issue and generate a set of Playwright tests in a PR for human review.

        Tips:
        - **Feature** drives the test folder (`tests/<feature>/`). Use a short slug (e.g., `cart`, `checkout`, `login`).
        - **Page Name** drives the Page Object class. Use PascalCase (e.g., `CartPage`, `CheckoutInfoPage`).
        - **Acceptance Criteria** — one per line. The orchestrator decides which to automate and groups them into tests.

  - type: input
    id: feature
    attributes:
      label: Feature
      description: Short folder name (snake_case). Becomes `tests/<feature>/`.
      placeholder: cart
    validations:
      required: true

  - type: input
    id: page_name
    attributes:
      label: Page Name
      description: PascalCase Page Object class. Reused if it already exists in `src/pages/`; otherwise scaffolded via `/scaffold-page-object`.
      placeholder: CartPage
    validations:
      required: true

  - type: textarea
    id: user_story
    attributes:
      label: User Story
      description: Optional. As a / I want / so that.
      placeholder: |
        As a standard user
        I want to remove items from the cart
        so that I can adjust my order before checkout.
    validations:
      required: false

  - type: textarea
    id: acceptance_criteria
    attributes:
      label: Acceptance Criteria
      description: One AC per line. The orchestrator decides automation-worth and groups ACs into tests.
      placeholder: |
        AC 1: Standard user can remove a single item from the cart; cart badge updates.
        AC 2: Standard user can remove all items; cart is empty.
        AC 3: Visual aesthetic of the remove button — manual review only.
    validations:
      required: true

  - type: textarea
    id: notes
    attributes:
      label: Notes
      description: Optional context (related issues, edge cases, links).
    validations:
      required: false
```

- [ ] **Step 3: Verify the YAML parses**

```
npx --yes js-yaml .github/ISSUE_TEMPLATE/to-be-automated.yml > /dev/null && echo OK
```

Expected: `OK`.

If the parse fails: fix indentation/quoting and re-run.

- [ ] **Step 4: Commit**

```
git add .github/ISSUE_TEMPLATE/to-be-automated.yml
git commit -m "feat(c2a): add to-be-automated GitHub Issue Template for /from-issue"
```

---

## Task 2: Reference doc — `test-template.md`

**Files:**

- Create: `.claude/skills/from-issue/references/test-template.md`

This is the canonical test-file template the orchestrator follows when rendering generated tests. It defines the mandatory 5-line provenance block, imports, describe/test structure, and naming rules. Read [`src/fixtures/test.ts`](../../../src/fixtures/test.ts) and [`tests/login/login.spec.ts`](../../../tests/login/login.spec.ts) for the existing test conventions before writing this template.

- [ ] **Step 1: Verify the target directory tree doesn't exist yet**

```
ls .claude/skills/from-issue/ 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`. If it already exists: STOP and ask the human.

- [ ] **Step 2: Create the directory tree**

```
mkdir -p .claude/skills/from-issue/references
```

- [ ] **Step 3: Write `references/test-template.md`**

Use the Write tool:

````markdown
# Test File Output Template

The `/from-issue` skill renders generated test files following this template. The top-of-file comment block is **mandatory** and identical across every generated file (only the date, issue number, source URL, and title vary).

## Template

```typescript
// Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
// Source: <issue-url>
// Title: <issue-title>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against the same issue will refuse to overwrite.

import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';

test.describe('<feature> (<auth-tag>)', () => {
  test('<auth-tag> <user-tag> <behavior description>', async ({ <pageFixture>, page }) => {
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
```

## Rules

- **Comment block at top** — mandatory; 5 lines verbatim with `YYYY-MM-DD`, `N`, `<issue-url>`, and `<issue-title>` substituted by the orchestrator.
- **Imports**:
  - Always `import { test, expect } from '@fixtures/test'` — NEVER from `@playwright/test` (per CLAUDE.md "Where things live").
  - `import { env } from '@utils/env'` only when a test calls `loginAs(...)` and needs the password.
- **Describe wrap** — exactly one `test.describe('<feature> (<auth-tag>)', () => { ... })` block per file. `<feature>` matches the issue template's Feature field; `<auth-tag>` is the dominant auth tag across tests in the file (e.g., `@standard`, `@no-auth`).
- **Per-test title** — `'<auth-tag> <user-tag> <behavior description>'`. Examples:
  - `'@no-auth standard_user logs in successfully and lands on inventory'`
  - `'@standard remove single item from cart updates cart badge'`
  - The `<user-tag>` is the saucedemo user name (e.g., `standard_user`, `locked_out_user`); omit if the test is user-agnostic.
- **Tag selection** — per CLAUDE.md "Tag conventions" table:
  - Login/logout tests with no pre-existing session → `@no-auth`
  - User-agnostic flows → `@all-users`
  - Standard-user-only flows → `@standard`
  - Problem/error/performance-glitch user-specific → `@problem` / `@error` / `@performance_glitch`
  - Visual regression → `@visual`
  - Sort dropdown tests → `@sort-functional`
- **Page fixture injection** — destructure the page fixture from the test args (e.g., `{ cartPage, page }`) — NEVER `new CartPage(page)` directly. The fixture is auto-injected from [`src/fixtures/test.ts`](../../../src/fixtures/test.ts).
- **No raw Locators in tests** — per ADR-0001 rule #4. Tests interact through Page methods, not `page.locator(...)`.
- **No `await page.waitForTimeout(...)`** — per CLAUDE.md "What to NEVER do". Use Playwright auto-waiting assertions (`await expect(...).toBeVisible()`).
- **Selector preference order** is the Page Object's concern, not the test's.
- **Behavior-only test titles** (spec §2 Decision 12) — AC traceability lives in the PR description's AC-coverage table, NOT in the test title.

## Auth resolution and storageState

Saucedemo's per-user storageState files live under `auth/<user>.json` (e.g., `auth/standard.json`). The orchestrator does NOT load storageState explicitly in the test code — it picks the right Playwright project tag (`@standard`, `@problem`, etc.) and the framework's `playwright.config.ts` wires up the right session via the project's `storageState` config.

If the AC text doesn't declare a user, default to `standard_user` (spec §2 Decision 13).

## Example: 2-test file for a login feature

```typescript
// Generated by /from-issue on 2026-05-18 from GitHub Issue #42.
// Source: https://github.com/your-org/playwright-ia-framework/issues/42
// Title: Login coverage for standard and locked-out users
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against the same issue will refuse to overwrite.

import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';

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
```
````

- [ ] **Step 4: Commit**

```
git add .claude/skills/from-issue/references/test-template.md
git commit -m "feat(c2a): add test-template.md (canonical test file template for /from-issue)"
```

---

## Task 3: Reference doc — `pr-description-template.md`

**Files:**

- Create: `.claude/skills/from-issue/references/pr-description-template.md`

The structured PR body the orchestrator writes when opening a PR. Five sections per spec §3 step 12.

- [ ] **Step 1: Write `references/pr-description-template.md`**

Use the Write tool:

````markdown
# PR Description Template

The `/from-issue` skill writes its PR body using this template. Section order is mandatory; reviewers expect to find each section in this position.

## Template

```markdown
## What I understood from the issue

**Feature:** <feature>
**Page Name:** <page-name>
**User Story:** <user-story-text or "(none provided)">

**Acceptance Criteria (normalized):**

- AC 1: <normalized text>
- AC 2: <normalized text>
- ...

## AC coverage

| AC                     | Test           | Status                      |
| ---------------------- | -------------- | --------------------------- |
| AC 1: <truncated text> | `<test title>` | ✅ generated                |
| AC 2: <truncated text> | `<test title>` | ✅ generated                |
| AC 3: <truncated text> | —              | ⚠️ skipped: <LLM rationale> |

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `<test title 1>` — ✅ PASS
  - `<test title 2>` — ✅ PASS

## Collision warnings

(omit this section entirely if no collisions)

- ⚠️ **Page Name collision** — `<PageName>` already exists at `src/pages/<PageName>.ts`. Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the issue with a different Page Name.

## Source

Generated from #<issue-number> by `/from-issue` on YYYY-MM-DD.
```

## Rules

- **Section order is mandatory** — `What I understood` → `AC coverage` → `Verification` → `Collision warnings` (optional) → `Source`.
- **AC coverage table**:
  - Truncate long AC text to ≤80 chars; reviewers can click through to the issue for full text.
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped.
  - "Status" column: `✅ generated` or `⚠️ skipped: <one-line rationale>`.
- **Verification on failure**:
  - Typecheck FAIL → use `❌ FAIL` and include a fenced code block with the verbatim typecheck errors.
  - Test FAIL → use `❌ FAIL: <one-line message>` and include a `<details>` block with the verbatim failure output:

    ```markdown
    - `<test title>` — ❌ FAIL: assertion error

      <details>
      <summary>Failure output</summary>

      \`\`\`
      <verbatim test failure output>
      \`\`\`

      </details>
    ```

- **Collision warnings section is omitted entirely when no collisions occur** — don't render an empty header.
- **Source line** — always include, always last. Use the issue number (auto-renders as a GitHub cross-reference link).

## Example: 2-test PR with one collision

```markdown
## What I understood from the issue

**Feature:** login
**Page Name:** LoginPage
**User Story:** (none provided)

**Acceptance Criteria (normalized):**

- AC 1: User can log in with standard_user / secret_sauce and lands on inventory page.
- AC 2: Locked-out user sees an error message.

## AC coverage

| AC                                                                   | Test                                                                 | Status       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------ |
| AC 1: User can log in with standard_user / secret_sauce and lands... | `@no-auth standard_user logs in successfully and lands on inventory` | ✅ generated |
| AC 2: Locked-out user sees an error message.                         | `@no-auth locked_out_user sees the lockout error`                    | ✅ generated |

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `@no-auth standard_user logs in successfully and lands on inventory` — ✅ PASS
  - `@no-auth locked_out_user sees the lockout error` — ✅ PASS

## Collision warnings

- ⚠️ **Page Name collision** — `LoginPage` already exists at `src/pages/LoginPage.ts`. Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the issue with a different Page Name.

## Source

Generated from #42 by `/from-issue` on 2026-05-18.
```
````

- [ ] **Step 2: Commit**

```
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(c2a): add pr-description-template.md (structured PR body for /from-issue)"
```

---

## Task 4: Reference doc — `workflow.md`

**Files:**

- Create: `.claude/skills/from-issue/references/workflow.md`

The 13-step procedural workflow Claude follows when `/from-issue` is invoked. This is the largest reference file — it captures every step of the orchestrator including tool choices, error handling, and per-step outputs. Cross-reference [`spec §3`](../../../../docs/superpowers/specs/2026-05-18-phase-c2a-from-issue-skeleton-design.md) and the C.1 workflow ([`.claude/skills/scaffold-page-object/references/workflow.md`](../../scaffold-page-object/references/workflow.md)) for structural precedent.

- [ ] **Step 1: Write `references/workflow.md`**

Use the Write tool:

````markdown
# from-issue Workflow

The 13-step procedural workflow Claude follows when the `from-issue` skill is invoked.

## Inputs

- **Issue number** (required, positional) — e.g., `/from-issue 42`
- **`dry-run`** (optional flag) — skip steps 11–13 (push, PR, issue comment). Files written and tests run locally only.

## Steps

### 1. Validate inputs

Check that an issue number is present and is a positive integer. If missing or malformed, ask the user — don't guess.

Check `gh auth status` exits 0. If not, abort with: _"`gh` is not authenticated. Run `gh auth login` and re-run."_

### 2. Fetch issue

```bash
gh issue view <num> --json title,body,labels,number,url
```

If the issue doesn't exist or you lack access, abort with the `gh` error verbatim.

Parse the JSON. Capture: `title`, `body`, `labels[].name`, `number`, `url`.

### 3. Verify `to-be-automated` label present

If `to-be-automated` is NOT in `labels[].name`, abort with:

> _"Issue #N is missing the `to-be-automated` label. Add the label and re-run."_

Do NOT add the label autonomously.

### 4. LLM normalization

The issue body should follow the GitHub Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml`. Extract:

- **Feature** (single-line) — drives `tests/<feature>/`
- **Page Name** (PascalCase) — drives the Page Object resolution
- **User Story** (optional) — context only
- **Acceptance Criteria** (multi-line, one AC per line)
- **Notes** (optional) — context only

For each Acceptance Criterion, build an internal record:

```
{
  id: 1,  // sequential
  text: "<normalized AC text>",
  user: "<inferred saucedemo user, e.g., standard_user; default standard_user if unspecified>",
  worth_automating: true | false,
  rationale: "<LLM justification; required when worth_automating=false>"
}
```

**Skip-signal = LLM judgment from AC text** (spec §2 Decision 11). Examples of ACs to skip:

- "Visual aesthetic — manual review only"
- "Verify the spelling of the button label" (low automation value)
- "Confirm legal copy matches the marketing-approved version" (data may shift)

**If the issue body is free-form (no template structure)**, attempt best-effort parse. If no ACs can be extracted, abort with:

> _"Couldn't extract ACs from issue body. Ask the reporter to refile using the `to-be-automated` template."_

**If `worth_automating=false` for ALL ACs**, abort BEFORE writing files. Post a comment on the source issue:

```bash
gh issue comment <num> --body "$(cat <<EOF
/from-issue reviewed this issue but found no ACs worth automating:

- AC 1: <rationale>
- AC 2: <rationale>
- ...

Close this issue if the assessment is correct, or refile with more concrete ACs.
EOF
)"
```

Then stop. No PR.

### 5. Resolve target Page Object

```bash
ls src/pages/<PageName>.ts 2>/dev/null
# If not found at top level, also check the checkout subfolder:
ls src/pages/checkout/<PageName>.ts 2>/dev/null
```

- **Found** → reuse. Record a collision warning for the PR body. Continue.
- **Not found** → invoke `/scaffold-page-object` with inputs:
  - Page name: `<PageName>`
  - URL: inferred from the AC text (e.g., AC mentions "cart page" → `https://www.saucedemo.com/cart.html`)
  - storageState: `auth/<inferred-user>.json` (per Decision 13 default)

  If `/scaffold-page-object` fails, abort with the subprocess error verbatim. No PR.

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

### 7. Render test file

Apply [`references/test-template.md`](test-template.md):

- Top-of-file 5-line provenance block (substitute today's date, issue number, URL, title)
- Imports: `@fixtures/test` (always), `@utils/env` (when password needed)
- Single `test.describe('<feature> (<auth-tag>)', ...)` wrap
- One `test(...)` per record from Step 6, ordered as emitted

Render to an in-memory string. Do NOT Write yet — Step 8 handles overwrite refusal first.

### 8. Write test file

Resolve the target path:

```
tests/<feature>/<slug>.spec.ts
```

Where `<feature>` is the snake_case Feature field and `<slug>` is the issue-title slug (see "Slug derivation" below).

Check whether the file already exists:

```bash
ls tests/<feature>/<slug>.spec.ts 2>/dev/null
```

- **Exists** → refuse with: _"`tests/<feature>/<slug>.spec.ts` exists. `rm` it and re-run, or refile the issue with a different title."_ No PR.
- **Does not exist** → ensure the `tests/<feature>/` directory exists (`mkdir -p` if needed), then Write the file.

#### Slug derivation

The same `<slug>` is used for both the test filename and the branch name (`from-issue/<num>-<slug>`). Derive deterministically:

1. Take the issue title (e.g., `"[TBA] Add Cart validation for empty checkout"`).
2. Strip a leading `[TBA] ` (or `[TBA]`) prefix if present.
3. Lowercase.
4. Replace any non-alphanumeric character with `-`.
5. Collapse repeated `-` and strip leading/trailing `-`.
6. Truncate to **40 characters max**, breaking on a `-` boundary if possible.

Example: `"[TBA] Add Cart validation for empty checkout"` → `add-cart-validation-for-empty-checkout`. No stop-word stripping (keep meaning intact).

### 9. Isolated typecheck

Use the same `.tsconfig.scratch.json` pattern as C.1 step 11. A bare `npx tsc --noEmit <path>` doesn't pick up the project's `tsconfig.json` (it falls back to TS defaults without `paths` aliases, so `@fixtures/test` and `@pages/*` imports would fail with bogus "Cannot find module" errors).

1. **Write a throwaway tsconfig** via the `Write` tool at `.tsconfig.scratch.json`:

   ```json
   {
     "extends": "./tsconfig.json",
     "include": ["tests/<feature>/<slug>.spec.ts"],
     "exclude": []
   }
   ```

2. **Typecheck via the temp tsconfig**:

   ```bash
   npx tsc --noEmit -p .tsconfig.scratch.json
   ```

3. **Always clean up** (whether typecheck passed or failed):

   ```bash
   rm .tsconfig.scratch.json
   ```

- If typecheck **passes**, record `Typecheck: ✅ PASS` for the PR body.
- If typecheck **fails**, capture the errors verbatim for the PR body — but DO NOT abort. Continue to Step 10.

### 10. Run the generated tests

```bash
npx playwright test tests/<feature>/<slug>.spec.ts --reporter=list
```

Capture per-test PASS/FAIL output. Record one line per test for the PR body's Verification section:

- ✅ PASS → `\`<test title>\` — ✅ PASS`
- ❌ FAIL → `\`<test title>\` — ❌ FAIL: <one-line message>`plus a`<details>` block with verbatim failure output

DO NOT abort on test failures — continue to Step 11. The PR-as-review-gate model means reviewers see and fix failures in the PR.

### 11. Branch + commit + push

**Dry-run check:** If `dry-run` was passed, SKIP this step and Steps 12–13. Report the local file path and verification status only.

```bash
git checkout -b from-issue/<num>-<slug>
```

If the branch already exists, abort with: _"Branch `from-issue/<num>-<slug>` exists — delete it and re-run."_ No PR.

```bash
git add tests/<feature>/<slug>.spec.ts
# If /scaffold-page-object created new files in src/pages/ during Step 5, add those too:
git add src/pages/<PageName>.ts  # only if it didn't exist before Step 5
git commit -m "feat: add generated tests from #<num>"
git push -u origin from-issue/<num>-<slug>
```

If `git push` fails (no remote, no auth), abort with the git error verbatim. The local branch and files remain on disk.

### 12. Open PR

Render the PR body using [`references/pr-description-template.md`](pr-description-template.md). Pass the body via a HEREDOC:

```bash
gh pr create --title "feat: tests from #<num> — <truncated-title>" --body "$(cat <<'EOF'
<rendered PR body>
EOF
)"
```

Capture the returned PR URL.

If `gh pr create` fails (no remote, no permission), abort with the `gh` error verbatim. The local branch and pushed branch remain on the remote.

### 13. Comment on source issue + report to user

```bash
gh issue comment <num> --body "🤖 /from-issue opened <pr-url> with generated tests for review."
```

Then report to the user:

- PR URL
- Test count (generated)
- Skipped-AC count (if any)
- Collision warnings (if any)
- Typecheck status
- Test run result (PASS/FAIL counts)

Done.
````

- [ ] **Step 2: Commit**

```
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(c2a): add from-issue workflow reference (13 procedural steps)"
```

---

## Task 5: `SKILL.md` (compact frontmatter + intro + pointer)

**Files:**

- Create: `.claude/skills/from-issue/SKILL.md`

Per ADR-0008, SKILL.md stays compact: frontmatter + brief intro + pointer to the workflow reference. The full procedural detail lives in `references/workflow.md`.

- [ ] **Step 1: Write `SKILL.md`**

Use the Write tool:

```markdown
---
name: from-issue
description: Generate Playwright tests from a `to-be-automated`-labeled GitHub Issue, composing /scaffold-page-object when a target Page Object doesn't yet exist, and open a PR with the generated tests for review.
allowed-tools: Bash(gh:*) Bash(git:*) Bash(npm:*) Bash(npx:*) Bash(rm:*) Bash(mkdir:*) Bash(ls:*) Read Glob Grep Write
---

# from-issue

Given a GitHub Issue number, this skill reads the issue (which must carry the `to-be-automated` label), analyzes its Acceptance Criteria, generates a set of Playwright tests, runs them locally, and opens a PR with a structured description. The PR is the review gate.

## How to use it

Tell Claude what you want:

> Use the from-issue skill on issue #42.

Or for experimentation (skip push/PR/issue-comment):

> Use the from-issue skill on issue #42 with dry-run.

## Workflow

The full 13-step procedural workflow is in [`references/workflow.md`](references/workflow.md). Read that file before executing the skill.

## References

- [`references/workflow.md`](references/workflow.md) — the 13-step procedural workflow
- [`references/test-template.md`](references/test-template.md) — canonical test-file template
- [`references/pr-description-template.md`](references/pr-description-template.md) — structured PR body template

## Composition

This skill invokes [`/scaffold-page-object`](../scaffold-page-object/SKILL.md) (C.1) when the issue's Page Name field has no matching file in `src/pages/`.

## See also

- [`docs/from-issue.md`](../../../docs/from-issue.md) — learning guide with worked examples
- [`docs/adr/0008-custom-skills-pattern.md`](../../../docs/adr/0008-custom-skills-pattern.md) — why custom skills follow this layout
```

- [ ] **Step 2: Commit**

```
git add .claude/skills/from-issue/SKILL.md
git commit -m "feat(c2a): add from-issue SKILL.md (compact frontmatter + intro + pointers)"
```

---

## Task 6: Learning guide `docs/from-issue.md`

**Files:**

- Create: `docs/from-issue.md`

Sibling to `docs/scaffold-page-object.md`. Same structure: What is it / How wired / Verification / Worked examples / When NOT to use / Pointers.

- [ ] **Step 1: Write `docs/from-issue.md`**

Use the Write tool:

````markdown
# from-issue — Learning Guide

The `/from-issue` skill turns a labeled GitHub Issue into a PR full of generated Playwright tests. This is the learning guide; for the procedural workflow Claude follows, see [`.claude/skills/from-issue/references/workflow.md`](../.claude/skills/from-issue/references/workflow.md).

## What is `/from-issue`

It's a Claude Code custom skill that takes:

- A GitHub Issue number (e.g., `42`) that carries the `to-be-automated` label
- Optional: a `dry-run` flag to skip push/PR/issue-comment for experimentation

…and produces:

- A new test file at `tests/<feature>/<slug>.spec.ts`
- A new branch `from-issue/<num>-<slug>`
- A PR with a structured description (What I understood / AC coverage table / Verification / Collision warnings / Source link)
- A comment on the source issue with the PR link

The skill is **fully autonomous** by default. The PR is the review gate — no interactive checkpoints during execution.

Distinction from `/scaffold-page-object`: **`/from-issue` is the orchestrator** that generates tests. When the issue's Page Name field references a Page that doesn't yet exist in `src/pages/`, `/from-issue` invokes `/scaffold-page-object` to create it first, then generates tests against the resulting Page Object.

## How it's wired in this project

- Skill files at `.claude/skills/from-issue/`
  - `SKILL.md` — frontmatter + intro + pointer (always loaded for skill discovery)
  - `references/workflow.md` — the 13-step procedural workflow (loaded when skill runs)
  - `references/test-template.md` — canonical test file template
  - `references/pr-description-template.md` — structured PR body template
- GitHub Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml` — the form BAs/reporters fill out
- Generated tests land at `tests/<feature>/<slug>.spec.ts` (feature folder snake_case from the form; slug derived from the issue title — see workflow Step 8 for the rule)
- Branch naming `from-issue/<num>-<slug>` includes the issue number to prevent slug collisions across issues

## Verifying the setup

After the skill is installed, run this 3-step smoke test in a fresh Claude Code session.

### Step 1 — Skill discoverable

Open Claude Code in this repo. Type `/skills`. Expected: `from-issue` is listed alongside `playwright-cli` and `scaffold-page-object`.

### Step 2 — Issue template usable

Open the repo on github.com → click "New issue". Expected: "To Be Automated" appears as a template option. Click it; the form renders with five fields (Feature, Page Name, User Story, Acceptance Criteria, Notes) and `to-be-automated` pre-applied as a label.

### Step 3 — End-to-end run against a real issue

Create a real test issue using the template:

> **Feature:** login
> **Page Name:** LoginPage
> **AC 1:** User can log in with `standard_user` / `secret_sauce` and lands on inventory page.
> **AC 2:** Locked-out user sees an error message.

Note the issue number (e.g., `#42`). In Claude Code:

> Use the from-issue skill on issue #42.

Expected:

- Skill executes the 13-step workflow
- `LoginPage` already exists → reuse + collision warning surfaces in the PR body
- LLM analyzes 2 ACs → generates 2 tests
- Test file lands at `tests/login/<slug>.spec.ts`
- Isolated typecheck PASS
- Test run PASS (both tests)
- PR opens with the structured description (AC coverage table both ✅, collision warning for LoginPage)
- Source issue receives a comment with the PR link

After verifying: close the PR, delete the branch, close the issue.

## Worked examples

### Generate tests for an existing page

Use this when the Page Object already exists in `src/pages/`.

> Use the from-issue skill on issue #57.

Result: skill detects the existing Page Object, reuses it, surfaces a collision warning in the PR body so reviewers can confirm the existing Page Object exposes the methods the new tests rely on.

### Generate tests AND scaffold a new page

Use this when the issue's Page Name field references a Page that doesn't yet exist.

> Use the from-issue skill on issue #58.

Result: skill invokes `/scaffold-page-object` to create the new Page Object first, then generates tests against it. The PR includes BOTH the new `src/pages/<Name>.ts` file AND the new test file.

### Experiment before committing (dry-run)

Use this to see what the skill produces without pushing or opening a PR.

> Use the from-issue skill on issue #42 with dry-run.

Result: local branch + test file + (if applicable) new Page Object are written. Steps 11–13 (push, PR, issue comment) are skipped. Inspect the files locally; `git checkout main && git branch -D from-issue/42-<slug>` to discard.

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

## When NOT to use it

- **Issues without the `to-be-automated` label.** The skill refuses by design. Add the label first.
- **Free-form issues that don't follow the template.** The LLM attempts best-effort parsing but aborts if it can't find structured ACs. Ask the reporter to refile using the template.
- **Regenerating tests over an existing test file.** The skill refuses to overwrite — `rm` the existing file and re-run.
- **Production credential pages.** The skill picks up storageState files that include real sessions; treat them with the same care as a real browser session.
- **Multi-page test bucketing (Positive / Negative / Edge headers).** That's Phase C.2.b.
- **`@smoke` tag application.** That's Phase C.2.c.

## Pointers

- [ADR-0008](adr/0008-custom-skills-pattern.md) — custom skills pattern, why files are laid out this way
- [`from-issue` SKILL.md](../.claude/skills/from-issue/SKILL.md) — the skill itself
- [`references/workflow.md`](../.claude/skills/from-issue/references/workflow.md) — the 13-step procedural workflow
- [`docs/scaffold-page-object.md`](scaffold-page-object.md) — the C.1 skill this orchestrator composes
````

- [ ] **Step 2: Commit**

```
git add docs/from-issue.md
git commit -m "docs(c2a): add from-issue learning guide with worked examples"
```

---

## Task 7: Update `CLAUDE.md` "Custom skills" section

**Files:**

- Modify: `CLAUDE.md` (Custom skills section — add `/from-issue` entry)

- [ ] **Step 1: Read the current `CLAUDE.md` "Custom skills" section**

Use the Read tool on `CLAUDE.md`. Locate the section that begins with `## Custom skills` (added in C.1 Task 7).

It currently ends with this bullet:

```markdown
Current custom skills:

- **`/scaffold-page-object`** — generate a draft Page Object class from a live page snapshot. Full guide: [`docs/scaffold-page-object.md`](docs/scaffold-page-object.md).
```

- [ ] **Step 2: Add the `/from-issue` entry**

Use the Edit tool to extend the bullet list:

**old_string:**

```markdown
Current custom skills:

- **`/scaffold-page-object`** — generate a draft Page Object class from a live page snapshot. Full guide: [`docs/scaffold-page-object.md`](docs/scaffold-page-object.md).
```

**new_string:**

```markdown
Current custom skills:

- **`/scaffold-page-object`** — generate a draft Page Object class from a live page snapshot. Full guide: [`docs/scaffold-page-object.md`](docs/scaffold-page-object.md).
- **`/from-issue`** — generate a set of Playwright tests from a `to-be-automated`-labeled GitHub Issue and open a PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist. Full guide: [`docs/from-issue.md`](docs/from-issue.md).
```

- [ ] **Step 3: Verify CLAUDE.md is still under the 150-line cap**

```
wc -l CLAUDE.md
```

Expected: ≤150 lines. If above: STOP — the cap is a project rule (line 3 of CLAUDE.md). Either trim a less-essential section or push detail into a `docs/` file.

- [ ] **Step 4: Commit**

```
git add CLAUDE.md
git commit -m "docs(claude): register /from-issue in 'Custom skills' section"
```

---

## Task 8: Smoke test the skill end-to-end

**Files:** No code changes expected. This task verifies the skill works as designed and captures any defects to fix.

- [ ] **Step 1: Create a real test issue**

On github.com → repo → Issues → New issue → "To Be Automated" template. Fill out:

- **Title:** `Login coverage for standard and locked-out users`
- **Feature:** `login`
- **Page Name:** `LoginPage`
- **User Story:** (leave empty)
- **Acceptance Criteria:**
  ```
  AC 1: User can log in with standard_user / secret_sauce and lands on inventory page.
  AC 2: Locked-out user sees an error message.
  ```
- **Notes:** `Smoke test for /from-issue Phase C.2.a delivery.`

Submit. Note the issue number (e.g., `#42`). Verify the `to-be-automated` label is auto-applied.

- [ ] **Step 2: Pre-flight check that `LoginPage` exists (collision path)**

```
ls src/pages/LoginPage.ts
```

Expected: file exists. This means Task 8 exercises the **collision/reuse** path of Step 5 (NOT the `/scaffold-page-object` dispatch path).

- [ ] **Step 3: Run `/from-issue` against the issue**

In Claude Code:

> Use the from-issue skill on issue #<num>.

Watch Claude execute the 13-step workflow.

- [ ] **Step 4: Verify the generated test file**

After the skill reports done:

```
ls tests/login/
cat tests/login/login-coverage-for-standard-and-locked-out-users.spec.ts
# (slug will be truncated to 40 chars per the slug rule)
```

Expected:

- File exists with a sensible slug (≤40 chars, breaks on `-` boundary)
- First 5 lines match the provenance block from `test-template.md`
- Imports are from `@fixtures/test` (NOT `@playwright/test`)
- 2 tests inside one `test.describe('login (@no-auth)', ...)` block
- Each test title is behavior-only (no AC numbers in the title)

- [ ] **Step 5: Verify the typecheck artifact was cleaned up**

```
ls .tsconfig.scratch.json 2>/dev/null && echo "DEFECT — not cleaned up" || echo "OK"
```

Expected: `OK`. If `DEFECT`: workflow Step 9 is missing the cleanup `rm`. Fix it (see Step 8 below).

- [ ] **Step 6: Verify the PR opened**

```
gh pr list --head from-issue/<num>-<slug>
gh pr view <pr-num> --json title,body,headRefName
```

Expected:

- PR exists on branch `from-issue/<num>-<slug>`
- Title starts with `feat: tests from #<num>`
- Body has the five sections in order: What I understood / AC coverage / Verification / Collision warnings / Source
- AC coverage table shows both ACs → ✅ generated
- Verification shows Typecheck ✅ + both tests ✅
- Collision warnings section is present (for `LoginPage`)
- Source line links back to the issue

- [ ] **Step 7: Verify the source issue got a comment**

```
gh issue view <num> --comments
```

Expected: the most recent comment includes the PR URL.

- [ ] **Step 8: Triage any defects**

If any of Steps 4–7 surfaced a mismatch between observed behavior and the spec/workflow:

1. Capture the defect verbatim.
2. Determine which reference file owns the bug (`workflow.md`, `test-template.md`, `pr-description-template.md`, `SKILL.md`).
3. Edit that reference file to correct the procedure.
4. If the test file or PR is wrong, close the PR + delete the local branch + delete the remote branch + delete the test file. Then re-run from Step 3 of this task.
5. Commit fixes with: `git commit -m "fix(c2a): <defect> in <file>"`.

Loop until Steps 4–7 all pass.

- [ ] **Step 9: Cleanup after a successful smoke test**

```
# Close the PR
gh pr close <pr-num> --comment "Smoke test for /from-issue Phase C.2.a — closing."

# Delete the remote branch
git push origin --delete from-issue/<num>-<slug>

# Delete the local branch (you'll need to be off it first; switch to phase-c2a-from-issue-skeleton)
git checkout phase-c2a-from-issue-skeleton
git branch -D from-issue/<num>-<slug>

# Delete the generated test file (it was a smoke artifact, not production-bound)
rm tests/login/<slug>.spec.ts

# Close the source issue
gh issue close <num> --comment "Smoke test complete — closing."
```

- [ ] **Step 10: Commit the cleanup (the deleted test file)**

```
git status  # confirm only tests/login/<slug>.spec.ts deletion remains
git add tests/login/<slug>.spec.ts
git commit -m "chore(c2a): remove smoke-test artifact from tests/login/"
```

If git status shows nothing to commit (because the test file was never added on `phase-c2a-from-issue-skeleton` — it lived only on the `from-issue/<num>-<slug>` branch): skip this step.

---

## Done

After Task 8 passes cleanly:

- 6 new files exist:
  - `.github/ISSUE_TEMPLATE/to-be-automated.yml`
  - `.claude/skills/from-issue/SKILL.md`
  - `.claude/skills/from-issue/references/workflow.md`
  - `.claude/skills/from-issue/references/test-template.md`
  - `.claude/skills/from-issue/references/pr-description-template.md`
  - `docs/from-issue.md`
- `CLAUDE.md` registers `/from-issue` in the Custom skills section
- `phase-c2a-from-issue-skeleton` branch holds the work, ready for merge to `main`
- A successful smoke run was demonstrated end-to-end (real issue → PR → issue comment), then cleaned up
- Any defects found in the smoke run were fixed in the appropriate reference file and re-verified

Hand off to `superpowers:finishing-a-development-branch` to merge or open the integration PR.
