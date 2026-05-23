# Phase D.1 — Skill Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make implicit/emergent behaviors of `/from-issue` and `/scaffold-page-object` explicit in reference docs. Add three quality-principle docs (F.I.R.S.T., Playwright conventions, QA SDET analysis). Codify the comments-as-references rule via ADR-0009. Zero behavioral changes — docs only.

**Architecture:** Pure docs phase. Adds 3 new reference docs + 1 new ADR + 5 modifications to existing skill files = 9 file touches total. No changes to `src/`, `tests/`, CLAUDE.md, configs, or generated code. Validation = remove the `src/fixtures/test.ts` comment after D.1 ships and re-run `/from-issue 7` to confirm the skill still works (driven by `/scaffold-page-object` workflow Step 11.5, not the comment).

**Tech Stack:** Claude Code skills (prose-only) · Markdown · Nygard ADR template · Existing `/from-issue` + `/scaffold-page-object` skills.

**Spec:** [`docs/superpowers/specs/2026-05-23-phase-d1-skill-hardening-design.md`](../specs/2026-05-23-phase-d1-skill-hardening-design.md) (committed at `8c55e22`)

---

## Pre-flight: branch + clean baseline

**Files:** None modified in pre-flight.

- [ ] **Step 1: Confirm on `phase-d1-skill-hardening` with clean tree**

```
git status
git branch --show-current
```

Expected: branch `phase-d1-skill-hardening`, working tree clean (or only ignored files).

If on `main` or dirty: STOP and ask the human.

- [ ] **Step 2: Confirm baseline checks pass**

```
npm run typecheck
npm run lint
npm run format:check
```

All three must exit 0. (Skipping `npm test` — this phase is docs-only; no test-affecting code changes.)

- [ ] **Step 3: Confirm prerequisite skills exist (built in Phase C)**

```
ls .claude/skills/from-issue/references/
ls .claude/skills/scaffold-page-object/references/
ls docs/adr/0008-custom-skills-pattern.md
```

Expected: `/from-issue/references/` contains `workflow.md`, `test-template.md`, `pr-description-template.md`, `bucket-classification.md`, `smoke-policy.md` (5 files). `/scaffold-page-object/references/` contains `workflow.md`, `page-object-template.md`, `component-detection.md` (3 files). ADR-0008 exists.

If any missing: STOP — Phase C isn't merged.

---

## Task 1: NEW reference doc — `test-principles.md` (F.I.R.S.T.)

**Files:**

- Create: `.claude/skills/from-issue/references/test-principles.md`

- [ ] **Step 1: Verify the target file doesn't exist yet**

```bash
ls .claude/skills/from-issue/references/test-principles.md 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`.

- [ ] **Step 2: Write `references/test-principles.md` with this EXACT content**

Use the Write tool:

````markdown
# Test Principles (F.I.R.S.T.) Reference

The `/from-issue` skill consults this doc when rendering test files (Step 7 of [`workflow.md`](workflow.md)). Generated tests should comply with the F.I.R.S.T. principles for test quality. The compliant + non-compliant examples below help calibrate what "good" looks like for this framework.

F.I.R.S.T. = **F**ast, **I**solated, **R**epeatable, **S**elf-validating, **T**imely.

## Principles

### Fast

A test should run in seconds, not minutes. Target: <5 seconds per test for UI-driven scenarios; <1 second for unit-style.

- Favor API setup over UI clicks when verifying non-UI behavior (e.g., set storageState rather than clicking through login for every test)
- Avoid waiting for animations or network delays unnecessarily
- Use Playwright's auto-waiting assertions (no `waitForTimeout`)

### Isolated

Each test creates its own state. No test depends on another test's side effects.

- Use `beforeEach` not `beforeAll` to reset state per test
- Don't share mutable fixtures across tests
- Tests must pass in any order; tests must pass when run alone
- The Playwright fixture pattern (`async ({ loginPage }) => ...`) inherently gives each test a fresh page

### Repeatable

Same result every time, every environment.

- No `Math.random()` without a fixed seed
- No `new Date()` assertions tied to wall-clock time
- No flaky waits (always use auto-retrying `expect` assertions)
- Use fixed test data (from `data/` fixtures, not generated random values)

### Self-validating

Every test ends with an `expect(...)` assertion. Pass/fail is unambiguous.

- No "look at the screenshot and verify" tests
- No `console.log` as the verification mechanism
- No tests that pass when the SUT is broken (e.g., asserting an element exists without checking its content)

### Timely

Tests are written close in time to the code change they verify.

- For this framework: generated tests ship in the same PR as the Page Object scaffold (or shortly after)
- Don't accumulate untested code — file an `to-be-automated` issue when a feature lands

## Anti-pattern gallery

### Anti-Fast: UI login for every test

```ts
// BAD: every test logs in via UI (~3s each, 50 tests = 2.5 minutes wasted)
test('@standard add product', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-test=username]', 'standard_user');
  await page.fill('[data-test=password]', 'secret_sauce');
  await page.click('[data-test=login-button]');
  await page.click('[data-test=add-to-cart-backpack]');
});
```

Rewrite: use the `@standard` Playwright project's storageState (login happens once in `auth.setup.ts`, all tests start logged in):

```ts
// GOOD: project supplies the session, test starts on InventoryPage
test('@standard add product', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  await inventoryPage.addProductToCart('Sauce Labs Backpack');
  expect(await inventoryPage.header.cartBadge.getCount()).toBe(1);
});
```

### Anti-Isolated: shared state via beforeAll

```ts
// BAD: cart state persists across tests, test order matters
let cart: CartPage;
test.beforeAll(async ({ browser }) => {
  cart = /* shared singleton */;
});
test('add item', async () => {
  await cart.add('X');
});
test('cart shows 1 item', async () => {
  await cart.expectCount(1); // depends on first test running first
});
```

Rewrite: each test gets its own fixture-provided page; setup happens per-test.

### Anti-Self-validating: assertion-free test

```ts
// BAD: test always passes if the page loads, even if the action is broken
test('add product', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  await inventoryPage.addProductToCart('Sauce Labs Backpack');
  // No expect(). Test passes even if the cart didn't update.
});
```

Rewrite: every test has an `expect(...)` at the end.

```ts
test('add product', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  await inventoryPage.addProductToCart('Sauce Labs Backpack');
  expect(await inventoryPage.header.cartBadge.getCount()).toBe(1);
});
```

## When in doubt

Prefer **Isolated** and **Self-validating** above the others. Fast and Repeatable matter at scale; Timely is about workflow not code. Isolated + Self-validating directly determine whether a test is trustworthy.

## See also

- [`playwright-conventions.md`](playwright-conventions.md) — overlap on "no waitForTimeout" (Fast + Repeatable)
- [`workflow.md`](workflow.md) Step 7 — where these principles are consulted during render
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/references/test-principles.md
git commit -m "feat(d1): add test-principles.md (F.I.R.S.T. principles for generated tests)"
```

---

## Task 2: NEW reference doc — `playwright-conventions.md`

**Files:**

- Create: `.claude/skills/from-issue/references/playwright-conventions.md`

- [ ] **Step 1: Verify the target file doesn't exist yet**

```bash
ls .claude/skills/from-issue/references/playwright-conventions.md 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`.

- [ ] **Step 2: Write `references/playwright-conventions.md` with this EXACT content**

Use the Write tool:

````markdown
# Playwright Conventions Reference

The `/from-issue` skill consults this doc when rendering test files (Step 7 of [`workflow.md`](workflow.md)). These conventions are lifted from https://playwright.dev/docs/best-practices so the skill has them available offline.

## Locator preference order

Use the highest-priority locator that uniquely identifies the element. CLAUDE.md's "Selector preference order" applies here; this doc adds rationale and examples.

### 1. `getByRole(name, options)` with accessible name

```ts
// PREFERRED
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('textbox', { name: 'Username' }).fill('standard_user');
```

Survives UI refactors (text/style changes don't break the locator if the role + name stay), accessibility-friendly, mirrors how users interact.

### 2. `getByLabel(...)` / `getByText(...)` / `getByPlaceholder(...)`

```ts
await page.getByLabel('Username').fill('standard_user');
await page.getByText('Login').click();
```

When no role is exposed but a human-visible label exists.

### 3. `[data-test="..."]` attribute selectors

```ts
await page.locator('[data-test="login-button"]').click();
```

Explicit testing affordance. CLAUDE.md's current default. Brittle to refactors that change the attribute, but at least the attribute exists to prevent accidental breakage from styling.

### 4. CSS / XPath selectors (last resort)

```ts
await page.locator('.btn-primary').click(); // CSS
```

Brittle. Use only when nothing above works. NEVER use XPath in this project (per CLAUDE.md "What to NEVER do").

## Web-first assertions (auto-retrying)

Always use `expect(locator).matcher()` patterns. They auto-retry until passing or timeout.

```ts
// GOOD: auto-retries until visible or timeout
await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();

// BAD: snapshot at a single moment, no retry
const isVisible = await page.getByRole('heading', { name: 'Inventory' }).isVisible();
expect(isVisible).toBe(true);
```

## No manual waits

```ts
// FORBIDDEN (lint-enforced in this project per CLAUDE.md)
await page.waitForTimeout(2000);

// PREFERRED
await expect(page.getByText('Loaded')).toBeVisible(); // auto-waits
```

## Test structure: Arrange / Act / Assert

```ts
test('@no-auth standard_user logs in successfully', async ({ loginPage, page }) => {
  // Arrange
  await loginPage.goto();

  // Act
  await loginPage.loginAs('standard_user', env.password);

  // Assert
  await expect(page).toHaveURL(/\/inventory\.html$/);
});
```

One logical assertion per test. Don't pile multiple unrelated assertions into one test.

## Test isolation

Each test gets a fresh page via Playwright's fixtures. Don't share state across tests.

```ts
// GOOD: each test gets its own loginPage
test('test A', async ({ loginPage }) => {
  /* ... */
});
test('test B', async ({ loginPage }) => {
  /* ... */
});

// BAD: shared mutable state
let sharedPage: Page;
test.beforeAll(async ({ browser }) => {
  sharedPage = await browser.newPage();
});
```

## Page Object methods

Methods are verb phrases (`clickLogin()`, `fillUsername()`, `loginAs()`), NOT getters returning `Locator`.

```ts
// GOOD: action methods read like English in tests
await loginPage.loginAs('standard_user', env.password);

// BAD: tests reach into Page internals
await loginPage.usernameLocator.fill('standard_user'); // tests now know about Locator
```

(Also in ADR-0001 rule #4 — restated here for skill convenience.)

## Anti-patterns

### Testing third-party sites

Don't write tests against external services we don't control. Mock them or skip.

### Snapshot testing without intent

`toMatchSnapshot()` is powerful but easy to abuse. Use only when the visual/structural output IS the contract being tested.

### Conditional asserts

```ts
// BAD: test passes vacuously when banner isn't visible
if (await loginPage.errorBanner.isVisible()) {
  expect(/* ... */).toContain('error');
}
```

Use auto-waiting assertions and let them fail loudly.

## See also

- [`test-principles.md`](test-principles.md) — F.I.R.S.T. (overlap on Fast / Repeatable)
- [`bucket-classification.md`](bucket-classification.md) — categorization happens after these conventions
- https://playwright.dev/docs/best-practices — upstream source
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/references/playwright-conventions.md
git commit -m "feat(d1): add playwright-conventions.md (best practices lifted from playwright.dev)"
```

---

## Task 3: NEW reference doc — `qa-analysis.md`

**Files:**

- Create: `.claude/skills/from-issue/references/qa-analysis.md`

- [ ] **Step 1: Verify the target file doesn't exist yet**

```bash
ls .claude/skills/from-issue/references/qa-analysis.md 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`.

- [ ] **Step 2: Write `references/qa-analysis.md` with this EXACT content**

Use the Write tool:

````markdown
# QA Analysis Reference

The `/from-issue` skill consults this doc during Step 4 of [`workflow.md`](workflow.md) — AC normalization. It drives the decision of **what tests to actually create** from the AC text, BEFORE bucket classification or smoke selection.

Different from sibling docs:

- [`bucket-classification.md`](bucket-classification.md) categorizes tests after they're decided (Positive / Negative / Edge)
- [`smoke-policy.md`](smoke-policy.md) selects critical tests after they're created (@smoke or not)
- This doc decides WHICH tests to create at all — upstream of both

## What QA analysis means here

A senior QA SDET reading an issue's ACs doesn't generate one test per AC mechanically. They apply judgment:

- ACs that describe the same flow with parameter variations → ONE parameterized test
- ACs that describe compound behaviors → MULTIPLE tests, split by behavior
- ACs that aren't testable (visual aesthetic, manual-only, out of scope) → SKIP

This doc captures that judgment.

## Three types of analysis decisions

### MERGE multiple ACs into one parameterized test

When ACs share the same setup + flow but differ only in inputs or expected outputs.

**Example:**

- AC1: "Valid US postal code (5 digits) is accepted at checkout"
- AC2: "Valid international postal code (alphanumeric) is accepted at checkout"
- AC3: "Empty postal code shows 'Postal Code is required' error"

→ ONE parameterized test that iterates over scenarios:

```ts
const scenarios = [
  { postal: '12345', expectAccepted: true, description: 'US' },
  { postal: 'AB1 2CD', expectAccepted: true, description: 'UK' },
  { postal: '', expectError: 'Postal Code is required', description: 'empty' },
];
for (const scenario of scenarios) {
  test(`@standard checkout postal validation — ${scenario.description}`, async ({
    /* ... */
  }) => {
    /* ... */
  });
}
```

**Why:** less duplication, easier to add cases, single point of maintenance for the flow.

### SPLIT one AC into multiple tests

When one AC contains compound behaviors that should be verified separately.

**Example:**

- AC: "User logs in successfully, adds a product to cart, completes checkout, and sees the order confirmation"

→ THREE separate tests:

1. `@no-auth standard_user logs in successfully and lands on inventory`
2. `@standard add product increments cart badge`
3. `@standard complete checkout shows order confirmation`

**Why:** isolation per F.I.R.S.T. principles. If the checkout breaks, the login test still tells you login works. Merged into one mega-test, you'd lose information.

### SKIP an AC entirely

When the AC isn't automatable in this framework, is out of scope, or is fully covered by another AC's test.

**Examples:**

- AC: "The Login button uses the brand's primary color (#7e57c2)"
  → SKIP — visual aesthetic; covered by visual regression suite if needed, not by functional tests

- AC: "User can sign in with Google OAuth"
  → SKIP — out of scope; saucedemo doesn't have OAuth; this AC may have been filed in error

- AC: "Both valid AND invalid postal codes are handled correctly"
  → SKIP — duplicates AC1 + AC3 from the MERGE example above

## Worked examples (from saucedemo coverage)

### Example 1: MERGE (3 → 1)

Issue ACs (parameterized variations):

- AC1: Standard user adds Sauce Labs Backpack, cart badge shows 1
- AC2: Standard user adds Sauce Labs Bike Light, cart badge shows 1
- AC3: Standard user adds Sauce Labs Onesie, cart badge shows 1

→ ONE parameterized test iterating over `loadProducts().slice(0, 3)`.

### Example 2: SPLIT (1 → 3)

Issue AC: "Standard user can log in, browse products, add to cart, and check out"

→ THREE tests:

- `@no-auth standard_user logs in` (login.spec.ts)
- `@standard add product increments cart badge` (cart/add-remove.spec.ts)
- `@standard checkout happy path completes successfully` (checkout/happy-path.spec.ts)

### Example 3: SKIP (1 → 0)

Issue AC: "Login button has 200ms fade-in animation on page load"
→ SKIP. Animations aren't tested functionally; visual regression would catch breakage if it matters.

## When in doubt

**Default to NOT merging/splitting/skipping.** One test per AC is the conservative path. Only apply MERGE/SPLIT/SKIP when the case is clear (shared flow, compound behavior, unambiguously non-automatable).

Over-merging hides failures. Over-splitting fragments coverage. Over-skipping loses requirements. The default position is "trust what the BA wrote."

## Reviewer override

If a reviewer disagrees with a merge/split/skip decision, they edit the generated tests directly in the PR (manual add/remove). The skill does NOT re-run on the same issue. Same pattern as `bucket-classification.md` and `smoke-policy.md`.

## PR surface

EVERY merge/split/skip decision MUST surface in the PR body. Three places:

1. **"What I understood from the issue" section's normalized AC list** — show the original AC text + the analysis decision (MERGE/SPLIT/SKIP) + rationale
2. **AC coverage table** — column "Test" shows the resulting test name(s); column "Status" includes `merged into X`, `split into N tests`, or `⚠️ skipped: <rationale>`
3. **"Notes for reviewer" section** (per `pr-description-template.md`) — call out merge/split/skip decisions explicitly with the 📝 marker so reviewers can push back

## See also

- [`bucket-classification.md`](bucket-classification.md) — what happens after QA analysis (categorize the resulting tests)
- [`smoke-policy.md`](smoke-policy.md) — what happens after categorization (mark critical tests)
- [`workflow.md`](workflow.md) Step 4 — where QA analysis is consulted
````

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/references/qa-analysis.md
git commit -m "feat(d1): add qa-analysis.md (senior QA SDET merge/split/skip judgment)"
```

---

## Task 4: MODIFY `/scaffold-page-object` workflow.md — insert Step 11.5

**Files:**

- Modify: `.claude/skills/scaffold-page-object/references/workflow.md`

Insert a new Step 11.5 between Step 11 (Isolated typecheck) and Step 12 (Report what landed), documenting the fixture-update side effect. This moves the responsibility from accidental-via-`/from-issue` to explicit-via-`/scaffold-page-object`.

- [ ] **Step 1: Edit workflow.md to insert Step 11.5**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
The project-wide `npm run typecheck` is unaffected — `scratch/` stays excluded so half-baked AI files don't break the global build.

### 12. Report what landed
```

**new_string:**

````
The project-wide `npm run typecheck` is unaffected — `scratch/` stays excluded so half-baked AI files don't break the global build.

### 11.5. Register the page in `src/fixtures/test.ts`

Edit `src/fixtures/test.ts` to register the newly-scaffolded Page Object as a fixture so tests can destructure it from the `test()` args (e.g., `async ({ loginPage }) => ...`).

1. Read `src/fixtures/test.ts`.
2. Verify the page isn't already registered (look for `<pageName>: <PageName>` in the `Pages` type or the `test.extend<Pages>({...})` map).
3. If unregistered, apply three edits to the file:
   - Add `import { <PageName> } from '@pages/<PageName>';` to the imports block at the top
   - Add `<pageName>: <PageName>;` to the `Pages` type
   - Add to the `test.extend<Pages>({...})` block:
     ```ts
     <pageName>: async ({ page }, use) => {
       await use(new <PageName>(page));
     },
     ```
4. If already registered: skip the edit and report it in Step 12.

Naming: `<pageName>` is the camelCase form of `<PageName>` (e.g., `LoginPage` → `loginPage`, `CheckoutInfoPage` → `checkoutInfoPage`).

**If `src/fixtures/test.ts` doesn't exist**, abort with: _"`src/fixtures/test.ts` not found. The framework's fixture file is required. Restore from git or run framework bootstrap first."_

**This step replaces the previous implicit behavior** where `/from-issue` modified `src/fixtures/test.ts` by reading a code comment in that file. Per ADR-0009, skill contracts must live in `references/`, not in code comments — this step is now the contract.

### 12. Report what landed
````

- [ ] **Step 2: Verify the file's step numbering is intact**

```bash
grep -n "^### " .claude/skills/scaffold-page-object/references/workflow.md
```

Expected: shows Step 1 through Step 11.5 then Step 12 in order. No Step 11 nor 12 was deleted.

- [ ] **Step 3: Run prettier and verify**

```bash
npx prettier --write .claude/skills/scaffold-page-object/references/workflow.md
npx prettier --check .claude/skills/scaffold-page-object/references/workflow.md && echo "OK"
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/scaffold-page-object/references/workflow.md
git commit -m "feat(d1): scaffold-page-object workflow — add Step 11.5 (register page in fixtures)"
```

---

## Task 5: MODIFY `/from-issue` workflow.md Step 4 — add 3 subsections

**Files:**

- Modify: `.claude/skills/from-issue/references/workflow.md`

Replace the existing Step 4 "LLM normalization" content to add three new subsections: "Free-form / GWT body handling", "Page inference from AC text", and "Wire QA analysis".

- [ ] **Step 1: Read the current Step 4 content for context**

Use the Read tool on `.claude/skills/from-issue/references/workflow.md` lines 36–82 to see the exact current text.

- [ ] **Step 2: Edit workflow.md Step 4 with three subsections added at the end**

Use the Edit tool with `replace_all: false`.

**old_string:**

````
**If `worth_automating=false` for ALL ACs**, abort BEFORE writing files. If `dry-run` was passed, simply report the rationale to the user (no issue comment, no PR). Otherwise, post a comment on the source issue:

```bash
gh issue comment <num> --body "$(cat <<'EOF'
/from-issue reviewed this issue but found no ACs worth automating:

- AC 1: <rationale>
- AC 2: <rationale>
- ...

Close this issue if the assessment is correct, or refile with more concrete ACs.
EOF
)"
````

Then stop. No PR.

### 5. Resolve target Page Object

```

**new_string:**

```

**If `worth_automating=false` for ALL ACs**, abort BEFORE writing files. If `dry-run` was passed, simply report the rationale to the user (no issue comment, no PR). Otherwise, post a comment on the source issue:

```bash
gh issue comment <num> --body "$(cat <<'EOF'
/from-issue reviewed this issue but found no ACs worth automating:

- AC 1: <rationale>
- AC 2: <rationale>
- ...

Close this issue if the assessment is correct, or refile with more concrete ACs.
EOF
)"
```

Then stop. No PR.

#### Free-form / GWT body handling

The Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml` produces a structured body with `### Feature`, `### User Story`, `### Acceptance Criteria`, etc. headings. If the issue body uses a non-template format (e.g., free-form Given/When/Then scenarios, no headings, partial structure), best-effort parse:

- Extract the **Feature** field from any heading or first line that looks like a feature name
- Look for Acceptance Criteria in any list/bullet form, regardless of `### Acceptance Criteria` heading
- Recognize GWT-style scenarios (`Given... When... Then...`) as ACs, one scenario = one AC candidate
- If parsing fails entirely (no recognizable ACs anywhere), abort with: _"Couldn't extract ACs from issue body. Ask the reporter to refile using the `to-be-automated` template."_

(Note: this subsection replaces an earlier shorter free-form note. The behavior was previously implicit — confirmed working in PR #8 of the experiment. Now documented explicitly.)

#### Page inference from AC text

The Issue Template does NOT include a Page Name field (removed in commit `fcc39e9` to support multi-page features). Extract Page Names from AC text by:

- Scanning each AC for mentions of UI surfaces ("from the LoginPage", "on the cart page", "checkout overview", etc.)
- Mapping each mention to a PascalCase Page Object name (e.g., "login page" → `LoginPage`, "cart page" → `CartPage`)
- Building a set of unique Page Names referenced across all ACs

If zero pages can be inferred: abort with: _"Couldn't infer any Page Object references from the AC text. Ask the reporter to mention UI surfaces explicitly (e.g., 'from the LoginPage', 'on the checkout overview')."_

#### Wire QA analysis (NEW reference doc)

Before producing the per-test records (Step 6), apply senior QA SDET judgment to the extracted ACs per [`qa-analysis.md`](qa-analysis.md):

- Identify ACs to MERGE (shared setup + parameterized variants)
- Identify ACs to SPLIT (compound behaviors that should be separate tests)
- Identify ACs to SKIP (non-automatable, out of scope, redundant)

Each merge/split/skip decision must be surfaced in the PR body's "What I understood" + AC coverage table + "Notes for reviewer" section (per `pr-description-template.md`).

### 5. Resolve target Page Object

````

- [ ] **Step 3: Run prettier and verify**

```bash
npx prettier --write .claude/skills/from-issue/references/workflow.md
npx prettier --check .claude/skills/from-issue/references/workflow.md && echo "OK"
```

Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(d1): from-issue workflow Step 4 — document GWT parsing + page inference + QA analysis"
```

---

## Task 6: MODIFY `pr-description-template.md` — add "Notes for reviewer" section

**Files:**

- Modify: `.claude/skills/from-issue/references/pr-description-template.md`

Two edits: insert the "Notes for reviewer" section into the Template, and add a corresponding Rule.

- [ ] **Step 1: Edit the Template section to add "Notes for reviewer" between Verification and Collision warnings**

Use the Edit tool with `replace_all: false`.

**old_string:**

````

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `<test title 1>` — ✅ PASS
  - `<test title 2>` — ✅ PASS

## Collision warnings

```

**new_string:**

```

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `<test title 1>` — ✅ PASS
  - `<test title 2>` — ✅ PASS

## Notes for reviewer

(omit this section entirely if no notes)

- ⚠️ **Side effect:** the workflow modified `<file>` to make the generated test runnable. Verify the change is reasonable.
- 📝 **LLM judgment (MERGE):** AC X and AC Y were merged into one parameterized test because both share the same setup + flow with different inputs. Reviewer: push back if you want them split.
- 📝 **LLM judgment (SPLIT):** AC Z contained compound behaviors and was split into N tests. Reviewer: push back if you wanted one mega-test.
- 📝 **LLM judgment (SKIP):** AC W was skipped because <rationale per qa-analysis.md>. Reviewer: push back if you want it generated.

## Collision warnings

`````

- [ ] **Step 2: Edit the Rules section to add a "Notes for reviewer" rule**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
- **Verification — smoke warnings**: If workflow Step 6 emitted any "invalid smoke value" soft warnings (per [`smoke-policy.md`](smoke-policy.md)), append them as additional bullets at the END of the Verification section, after any bucket warnings. Example: `- ⚠️ LLM emitted invalid smoke value "maybe" for test "<title>" — defaulted to false. Reviewer: verify classification.`
```

**new_string:**

```
- **Verification — smoke warnings**: If workflow Step 6 emitted any "invalid smoke value" soft warnings (per [`smoke-policy.md`](smoke-policy.md)), append them as additional bullets at the END of the Verification section, after any bucket warnings. Example: `- ⚠️ LLM emitted invalid smoke value "maybe" for test "<title>" — defaulted to false. Reviewer: verify classification.`
- **Notes for reviewer**: include this section ONLY when the skill made side-effect file changes OR LLM-judgment calls (merge/split/skip per [`qa-analysis.md`](qa-analysis.md)) that the reviewer might disagree with. Each note is a bullet starting with an emoji marker (⚠️ for side effects, 📝 for judgment calls). If the workflow produced no side effects and no merge/split/skip decisions, OMIT this section entirely. Position: between `Verification` and `Collision warnings` per the Section order rule.
```

- [ ] **Step 3: Update the "Section order is mandatory" rule to include Notes for reviewer**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
- **Section order is mandatory** — `What I understood` → `AC coverage` → `Verification` → `Collision warnings` (optional) → `Source`.
```

**new_string:**

```
- **Section order is mandatory** — `What I understood` → `AC coverage` → `Verification` → `Notes for reviewer` (optional) → `Collision warnings` (optional) → `Source`.
```

- [ ] **Step 4: Run prettier and verify**

```bash
npx prettier --write .claude/skills/from-issue/references/pr-description-template.md
npx prettier --check .claude/skills/from-issue/references/pr-description-template.md && echo "OK"
```

Expected: `OK`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(d1): pr-description-template — add Notes for reviewer section + rule"
```

---

## Task 7: MODIFY `/from-issue` SKILL.md — register the 3 new reference docs

**Files:**

- Modify: `.claude/skills/from-issue/SKILL.md`

Three new lines added to the References section.

- [ ] **Step 1: Edit SKILL.md References section**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)
- [`references/smoke-policy.md`](references/smoke-policy.md) — `@smoke` selection criteria + worked examples (C.2.c)
```

**new_string:**

```
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)
- [`references/smoke-policy.md`](references/smoke-policy.md) — `@smoke` selection criteria + worked examples (C.2.c)
- [`references/qa-analysis.md`](references/qa-analysis.md) — Senior QA SDET judgment: when to merge/split/skip ACs (D.1)
- [`references/test-principles.md`](references/test-principles.md) — F.I.R.S.T. principles for generated tests (D.1)
- [`references/playwright-conventions.md`](references/playwright-conventions.md) — Playwright best practices the skill follows (D.1)
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/from-issue/SKILL.md
git commit -m "docs(d1): register 3 new reference docs in from-issue SKILL.md"
```

---

## Task 8: NEW ADR-0009 — Skill contracts live in references, not code comments

**Files:**

- Create: `docs/adr/0009-skill-contracts-in-references-not-comments.md`

- [ ] **Step 1: Verify the target file doesn't exist yet**

```bash
ls docs/adr/0009-skill-contracts-in-references-not-comments.md 2>/dev/null && echo "EXISTS - stop" || echo "OK to create"
```

Expected: `OK to create`.

- [ ] **Step 2: Write the ADR with this EXACT content**

Use the Write tool:

````markdown
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
`````

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0009-skill-contracts-in-references-not-comments.md
git commit -m "feat(d1): add ADR-0009 — skill contracts in references, not code comments"
```

---

## Task 9: MODIFY ADR-0008 — cross-reference ADR-0009

**Files:**

- Modify: `docs/adr/0008-custom-skills-pattern.md`

Append a "Related" section at the end of ADR-0008 pointing at ADR-0009.

- [ ] **Step 1: Edit ADR-0008 to append a Related section**

Use the Edit tool with `replace_all: false`.

**old_string:**

```
## Alternatives considered

- **Single `SKILL.md` with everything inline** — rejected: as workflows get longer (12+ steps), the always-loaded skill discovery context grows uncomfortably
- **Code-based skills (TypeScript or Python)** — rejected: procedural prose is simpler for AI to follow; matches Phase B.2's vendored skill pattern; no build step
- **Shared `references/` across skills** — rejected: each skill is independent; shared references create coupling without clear benefit at current scale
```

**new_string:**

```
## Alternatives considered

- **Single `SKILL.md` with everything inline** — rejected: as workflows get longer (12+ steps), the always-loaded skill discovery context grows uncomfortably
- **Code-based skills (TypeScript or Python)** — rejected: procedural prose is simpler for AI to follow; matches Phase B.2's vendored skill pattern; no build step
- **Shared `references/` across skills** — rejected: each skill is independent; shared references create coupling without clear benefit at current scale

## Related

- [ADR-0009](0009-skill-contracts-in-references-not-comments.md) — mandates that skill behaviors live in `references/`, never in code comments
```

- [ ] **Step 2: Commit**

```bash
git add docs/adr/0008-custom-skills-pattern.md
git commit -m "docs(d1): ADR-0008 cross-references ADR-0009 (skill contracts in refs)"
```

---

## Task 10: Validate D.1 — remove the fixture comment and re-run the experiment

**Files:**

- Modify (verification only, on the experiment branch): `src/fixtures/test.ts` (remove instructive comment)

This task validates that the ADR-0009 verification clause holds: with the fixture comment REMOVED, the skill must still work because the contract now lives in `/scaffold-page-object` workflow Step 11.5.

- [ ] **Step 1: Confirm D.1 is fully committed on `phase-d1-skill-hardening`**

```
git log --oneline phase-d1-skill-hardening | head -12
```

Expected: 9 D.1 commits (Tasks 1–9) plus the spec commit, all on `phase-d1-skill-hardening`.

- [ ] **Step 2: Switch to the experiment branch**

```
git checkout experiment-rebuild-from-scratch
```

Note: D.1 hasn't been merged to main yet. To run the verification, we need both:

- D.1's changes available (so `/scaffold-page-object` knows about Step 11.5)
- The blank-slate state (so the experiment is reproducible)

The simplest path: cherry-pick D.1's relevant commits onto the experiment branch temporarily, OR merge D.1 to main first then update the experiment branch.

**Recommendation:** Do this verification AFTER D.1 is merged to main. Steps 3-10 below assume D.1 is merged.

- [ ] **Step 3: After D.1 is merged to main, create a fresh experiment branch for re-verification**

```bash
git checkout main
git pull
git checkout -b experiment-rebuild-from-scratch-v2 main
```

This gives a clean baseline with D.1 already in place. Now redo the blank-slate teardown the same way `experiment-rebuild-from-scratch` was set up (see commit `5b5bb2d` for the teardown commit on the v1 branch).

Quick teardown:

```bash
git rm -r src/pages src/components tests/cart tests/checkout tests/inventory tests/login tests/visual data/shared data/scenarios
git rm tests/auth.setup.ts data/fixtures.ts data/types.ts
```

Then stub `src/fixtures/test.ts` and simplify `playwright.config.ts` exactly as the v1 commit did. Verify typecheck/lint/format/`npx playwright test --list` pass.

- [ ] **Step 4: REMOVE the instructive comment from `src/fixtures/test.ts`**

The v1 experiment branch had this comment that ADR-0009 deprecates:

```
// Blank-slate fixture (experiment-rebuild-from-scratch branch).
// As /scaffold-page-object generates page objects, register them here so
// tests can destructure them from `test()` args (e.g., `async ({ loginPage }) => ...`).
// Until pages exist, this just re-exports Playwright's defaults so tests typecheck.
//
// Pattern when adding a page (manual step today — see GAPS.md):
//   1. import { LoginPage } from '@pages/LoginPage';
//   2. add `loginPage: LoginPage` to the Pages type
//   3. add a fixture entry: loginPage: async ({ page }, use) => { await use(new LoginPage(page)); }
```

For the v2 branch, the stub MUST NOT include this comment. Use the Write tool to overwrite `src/fixtures/test.ts` with this minimal content only:

```ts
import { test as base, expect } from '@playwright/test';

type Pages = Record<string, never>;

export const test = base.extend<Pages>({});
export { expect };
```

Commit:

```bash
git add src/fixtures/test.ts
git commit -m "experiment v2: blank-slate fixture without instructive comment (ADR-0009 verification)"
```

- [ ] **Step 5: File a new test issue and run `/from-issue`**

Reuse issue #7's content (or file a fresh equivalent issue). Then in Claude Code, invoke `/from-issue <num>`.

- [ ] **Step 6: Verify the skill still registers the page in fixtures**

After `/from-issue` completes:

```bash
cat src/fixtures/test.ts
```

Expected: the file now includes `import { LoginPage } from '@pages/LoginPage';`, `loginPage: LoginPage;` in the Pages type, and a `loginPage: async ({ page }, use) => ...` fixture entry — **without ever having read the instructive comment** (which we removed in Step 4).

If the skill did NOT update the fixture: ADR-0009 verification FAILS. The new `/scaffold-page-object` Step 11.5 isn't being applied. Investigate why (Step 11.5 wording, skill not reading the workflow, etc.) and fix on `phase-d1-skill-hardening` (or a follow-up branch) before claiming D.1 is validated.

- [ ] **Step 7: Verify the generated test passes**

```bash
npx playwright test tests/login/<slug>.spec.ts --reporter=list
```

Expected: same as PR #8 — all tests PASS. If they don't, the side-effect-via-Step-11.5 isn't equivalent to the original implicit behavior.

- [ ] **Step 8: Verify the PR body includes "Notes for reviewer" with the merge/split/skip + side-effect notes**

```bash
gh pr view <pr-num> --json body
```

Expected: PR body has a "Notes for reviewer" section between Verification and Collision warnings, with at least one `⚠️ Side effect:` bullet for the fixture modification (and any `📝 LLM judgment:` bullets if the skill made merge/split/skip decisions).

- [ ] **Step 9: Cleanup**

```bash
gh pr close <pr-num> --comment "ADR-0009 verification — closing after analysis."
git push origin --delete from-issue/<num>-<slug>
git checkout main
git branch -D experiment-rebuild-from-scratch-v2
git branch -D from-issue/<num>-<slug>
gh issue close <num> --comment "ADR-0009 verification complete."
```

- [ ] **Step 10: Report findings**

Report:

- Verification result: PASS | FAIL
- Did the skill register the fixture without the comment? yes/no
- Did the generated tests pass? yes/no
- Did the PR body include "Notes for reviewer"? yes/no
- Any defects discovered (file SHAs of fixes if applied)
- Recommendation: D.1 ready to declare validated, OR D.1 needs follow-up fixes

---

## Done

After Task 10 passes cleanly:

- 9 file touches on `phase-d1-skill-hardening` (commits + spec)
- ADR-0009 verification PASSED on a fresh blank-slate
- The implicit-behaviors-become-explicit transformation is empirically proven
- Ready to hand off to `superpowers:finishing-a-development-branch` for integration

If Task 10 reveals defects, fix them on `phase-d1-skill-hardening` before merging.
