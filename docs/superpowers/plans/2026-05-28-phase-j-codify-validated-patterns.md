# Phase J — Codify SW-4-Validated Patterns into the Skills — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document three patterns `/from-issue` re-derived on SW-4 (the data loader, computed-style/pseudo-state assertions, parallel-array-vs-component) as skill contracts, and harden the one substring-filter foot-gun in the generated `InventoryPage`.

**Architecture:** Two parts. **Part 1** = skill-doc edits (Markdown, no runtime code) on `phase-j-codify-patterns` off `main`, merged to `main` then `e2e-jira-from-issues`. **Part 2** = a tiny TypeScript fix to `InventoryPage` on the `SW-4-inventory` branch (rides into the open PR #17). No new ADR.

**Tech Stack:** Markdown skill refs; Prettier (doc gate); TypeScript + Playwright (Part 2 gate).

**Spec:** [`docs/superpowers/specs/2026-05-28-phase-j-codify-validated-patterns-design.md`](../specs/2026-05-28-phase-j-codify-validated-patterns-design.md)

**Branch:** `phase-j-codify-patterns` (off `main`; spec already committed).

**TDD note:** Part 1 docs — gate `npx prettier --check <file>` **bare** (never piped) + a `grep`. Part 2 code — `npx tsc --noEmit` + `npx playwright test tests/inventory/inventory.spec.ts` green + `npx eslint`. Commits use repeated `-m` flags, never here-strings.

---

## Execution & sequencing

1. **Part 1 (Tasks 1–3)** on `phase-j-codify-patterns`: edit → `prettier --check` + `grep` → commit.
2. **Integration A (controller):** merge `phase-j-codify-patterns` → `main` (`--no-ff`, push) → merge `main` → `e2e-jira-from-issues` (push). Doc-only; clean merge.
3. **Part 2 (Task 4)** on `SW-4-inventory` (the PR #17 branch): the `InventoryPage` exact-match fix; gate; push (updates PR #17).
4. **Task 5:** final sweep.

---

## File Structure

| File                                                                    | Part | Change                                    | Task |
| ----------------------------------------------------------------------- | ---- | ----------------------------------------- | ---- |
| `.claude/skills/from-issue/references/data-placement.md`                | 1    | Define the canonical `load<T>()` loader   | 1    |
| `.claude/skills/from-issue/references/playwright-conventions.md`        | 1    | Computed-style + exact-match sections     | 2    |
| `.claude/skills/scaffold-page-object/references/component-detection.md` | 1    | Parallel-array-vs-component decision rule | 3    |
| `.claude/skills/from-issue/references/workflow.md`                      | 1    | One Step-5 cross-ref line                 | 3    |
| `src/pages/InventoryPage.ts` (SW-4-inventory branch)                    | 2    | Exact-match locator for the title queries | 4    |

---

## Task 1: `data-placement.md` — define the canonical loader

**Files:** Modify `.claude/skills/from-issue/references/data-placement.md`. Read it first.

- [ ] **Step 1: Insert the canonical-loader subsection.** FIND:

```markdown
- The spec imports the loader (`import { validCheckout } from '@data/fixtures'`), never reads JSON directly.

When the skill externalizes, it MUST also:
```

REPLACE WITH:

````markdown
- The spec imports the loader (`import { validCheckout } from '@data/fixtures'`), never reads JSON directly.

### Canonical loader (`data/fixtures.ts`)

The loader reads JSON via `fs` — **NOT `import … from './x.json'`**. The project runs as native ESM, where a JSON import needs an `with { type: 'json' }` attribute and is brittle through Playwright's config/test loader; `fs` + `import.meta.url` is robust and version-stable.

```ts
// data/fixtures.ts — typed loaders for externalized test data.
// Specs import named datasets from '@data/fixtures'; never read JSON directly.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Product } from './types';

const dataDir = dirname(fileURLToPath(import.meta.url));

function load<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(dataDir, relativePath), 'utf-8')) as T;
}

export const products: readonly Product[] = load<Product[]>('shared/products.json');
```

Each dataset gets a type in `data/types.ts` and a named `export const` here. Adding a dataset = add the JSON + a type + one `load(...)` line.

When the skill externalizes, it MUST also:
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/data-placement.md
grep -nE "Canonical loader|import.meta.url|with \{ type: 'json' \}" .claude/skills/from-issue/references/data-placement.md   # expect: present
git add .claude/skills/from-issue/references/data-placement.md
git commit -m "docs(j): data-placement — define the canonical fs-based loader" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `playwright-conventions.md` — computed-style + exact-match sections

**Files:** Modify `.claude/skills/from-issue/references/playwright-conventions.md`. Read it first.

- [ ] **Step 1: Insert two sections immediately before `## See also`.** FIND:

```markdown
## See also

- [`test-principles.md`](test-principles.md) — F.I.R.S.T. (overlap on Fast / Repeatable)
```

REPLACE WITH:

````markdown
## Computed-style / pseudo-state assertions (hover / focus / active)

Some ACs assert a style that only appears in a pseudo-state — e.g. "the title turns green on hover." Read the **computed** style and let the state settle:

```ts
// Page Object — return the computed value as data (ADR-0001 rule #8)
async getProductTitleColor(productName: string): Promise<string> {
  return this.page
    .getByText(productName, { exact: true })
    .evaluate((el) => getComputedStyle(el).color);
}
```

```ts
// Spec
const resting = await inventoryPage.getProductTitleColor(name);
expect(resting).not.toBe('rgb(61, 220, 145)'); // sanity: not already the target
await inventoryPage.hoverProductTitle(name); // trigger the pseudo-state
await expect
  .poll(() => inventoryPage.getProductTitleColor(name)) // re-reads until it settles
  .toBe('rgb(61, 220, 145)');
```

Rules:

- Compare in **computed form** — browsers report color as `rgb(...)` / `rgba(...)`, never the source hex. Convert `#3ddc91` → `rgb(61, 220, 145)` in the expectation.
- **Sanity-check the resting value ≠ the target** first, so the test proves the state _changed_ it (not that it was always green).
- Use **`expect.poll(...)`** (not a one-shot read) so a CSS transition can finish — `expect.poll` retries like a web-first assertion.
- The hover/focus trigger is a composed Page Object action (one `test.step`); the computed-style read is a query returning data.

## Exact-match for named-element filters

When a query targets ONE element identified by a human name, match it **exactly** — a substring match would also catch a longer name that contains it.

```ts
// GOOD: exact — only the card titled exactly this
this.page.getByText(productName, { exact: true });

// RISKY: substring — a short name matches every longer name that contains it
this.productNames.filter({ hasText: productName });
```

Prefer `getByText(name, { exact: true })` or an anchored regex. Substring `filter({ hasText })` is fine only when matching a _group_ deliberately (e.g. "all cards mentioning 'Sauce'").

## See also

- [`test-principles.md`](test-principles.md) — F.I.R.S.T. (overlap on Fast / Repeatable)
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/playwright-conventions.md
grep -nE "Computed-style|expect\.poll|Exact-match for named-element|getByText\(productName, \{ exact: true \}\)" .claude/skills/from-issue/references/playwright-conventions.md   # expect: present
git add .claude/skills/from-issue/references/playwright-conventions.md
git commit -m "docs(j): playwright-conventions — computed-style + exact-match patterns" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `component-detection.md` decision rule + `workflow.md` Step-5 cross-ref

**Files:** Modify `.claude/skills/scaffold-page-object/references/component-detection.md` and `.claude/skills/from-issue/references/workflow.md`. Read both first.

- [ ] **Step 1: Append the decision rule to `component-detection.md`.** FIND (the end of the file):

```markdown
When a new component lands in `src/components/`, **append a row here BEFORE running the skill against any page that contains the new component.** Otherwise the skill aborts at step 4 with the auto-discover warning, listing the missing component file and pointing here.
```

REPLACE WITH:

```markdown
When a new component lands in `src/components/`, **append a row here BEFORE running the skill against any page that contains the new component.** Otherwise the skill aborts at step 4 with the auto-discover warning, listing the missing component file and pointing here.

## Parallel-array queries vs a discriminator component

When a feature involves many similar elements (product cards, table rows), choose by **what the tests do with them**, not by how many there are:

- **Uniform assertions across all N** (every product's name / price / image) → **page-direct parallel-array queries** on the Page Object that return `T[]`: `getProductNames(): Promise<string[]>`, `getProductPrices(): Promise<string[]>`. Simpler than a component, reads clearly (`expect(await inventoryPage.getProductNames()).toEqual(...)`), and is the right default.
- **Per-instance interaction or state** (add _this_ product to the cart, assert _this_ card's badge/button state) → a **Component with a discriminator** (`new ProductCard(page, productName)`, composition rule #9 / [ADR-0001](../../../../docs/adr/0001-pom-by-component.md)). The `ProductCard` row above is for exactly this case.

Rule of thumb: reach for the discriminator component the first time a test must act on — or assert the internal state of — **one** of the N (not the set). Until then, parallel-array queries are correct; don't pre-build the component (YAGNI).
```

- [ ] **Step 2: Add the Step-5 cross-ref in `workflow.md`.** FIND:

```markdown
- **Add** — a new test needs a locator/method the Page Object lacks → **append** it, following the composed-vs-primitive + `test.step` conventions in [`../../scaffold-page-object/references/page-object-template.md`](../../scaffold-page-object/references/page-object-template.md). Existing members are untouched.
```

REPLACE WITH:

```markdown
- **Add** — a new test needs a locator/method the Page Object lacks → **append** it, following the composed-vs-primitive + `test.step` conventions in [`../../scaffold-page-object/references/page-object-template.md`](../../scaffold-page-object/references/page-object-template.md). Existing members are untouched. When the new members query many similar elements (cards/rows), choose parallel-array queries vs a discriminator component per [`component-detection.md`](../../scaffold-page-object/references/component-detection.md) ("Parallel-array queries vs a discriminator component").
```

- [ ] **Step 3: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/scaffold-page-object/references/component-detection.md .claude/skills/from-issue/references/workflow.md
grep -n "Parallel-array queries vs a discriminator component" .claude/skills/scaffold-page-object/references/component-detection.md   # expect: present
grep -n "Parallel-array queries vs a discriminator component" .claude/skills/from-issue/references/workflow.md   # expect: present (the cross-ref)
git add .claude/skills/scaffold-page-object/references/component-detection.md .claude/skills/from-issue/references/workflow.md
git commit -m "docs(j): component-detection — parallel-array vs discriminator-component rule" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Integration A (controller, between Part 1 and Part 2)

```bash
git checkout main && git merge --no-ff phase-j-codify-patterns -m "Merge phase-j-codify-patterns: codify SW-4-validated patterns into the skills (Phase J)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin main
git checkout e2e-jira-from-issues && git merge main -m "Merge main into e2e-jira-from-issues: Phase J skill-pattern docs" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin e2e-jira-from-issues
git branch -d phase-j-codify-patterns
```

Then Part 2 runs on `SW-4-inventory`.

---

## Task 4: `InventoryPage` exact-match fix (on `SW-4-inventory`, PR #17)

**Files:** Modify `src/pages/InventoryPage.ts`. **`git checkout SW-4-inventory` first** (this rides into the open PR #17, hardening SW-4's own code). Read the file first.

- [ ] **Step 1: Add a private exact-match title locator + use it in both title methods.** FIND:

```ts
  // Computed text color of a single product's title — used to verify the hover state.
  async getProductTitleColor(productName: string): Promise<string> {
    return this.productNames
      .filter({ hasText: productName })
      .evaluate((el) => getComputedStyle(el).color);
  }

  // Composed action — wrapped in exactly one test.step (playwright-conventions).
  async hoverProductTitle(productName: string): Promise<void> {
    await test.step(`Hover the "${productName}" product title`, async () => {
      await this.productNames.filter({ hasText: productName }).hover();
    });
  }
```

REPLACE WITH:

```ts
  // Exact-match title locator — substring hasText could match two cards when one
  // product name contains another (per playwright-conventions.md "Exact-match for
  // named-element filters").
  private productTitle(productName: string): Locator {
    return this.page.getByText(productName, { exact: true });
  }

  // Computed text color of a single product's title — used to verify the hover state.
  async getProductTitleColor(productName: string): Promise<string> {
    return this.productTitle(productName).evaluate((el) => getComputedStyle(el).color);
  }

  // Composed action — wrapped in exactly one test.step (playwright-conventions).
  async hoverProductTitle(productName: string): Promise<void> {
    await test.step(`Hover the "${productName}" product title`, async () => {
      await this.productTitle(productName).hover();
    });
  }
```

(`Locator` is already imported — `import { test, type Locator, type Page } from '@playwright/test'`.)

- [ ] **Step 2: Typecheck + lint**

```bash
npx tsc --noEmit
npx eslint src/pages/InventoryPage.ts
```

Expected: both exit 0.

- [ ] **Step 3: Run the inventory spec (hover test still green)**

```bash
npx playwright test tests/inventory/inventory.spec.ts --reporter=list
```

Expected: **9 passed** (setup ×2, `@problem` ×1, `@standard` ×6 incl. the hover-color test). If the hover test fails, the exact-text locator isn't resolving the title element — STOP and report (do not commit red).

- [ ] **Step 4: Commit + push (updates PR #17)**

```bash
git add src/pages/InventoryPage.ts
git commit -m "refactor(inventory): exact-match product-title locator" -m "getProductTitleColor/hoverProductTitle used substring filter({ hasText }), which would match two cards if one product name contained another. Switch to getByText(name, { exact: true }) per playwright-conventions.md. Suite stays green." -m "Refs: SW-4" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin SW-4-inventory
```

---

## Task 5: Final sweep

- [ ] **Step 1: Consistency sweep** (on `e2e-jira-from-issues` after Integration A; Part 2 on its own branch)

```bash
git checkout e2e-jira-from-issues
grep -rn "Canonical loader" .claude/skills/from-issue/references/data-placement.md
grep -rn "Computed-style\|Exact-match for named-element" .claude/skills/from-issue/references/playwright-conventions.md
grep -rn "Parallel-array queries vs a discriminator component" .claude/skills/scaffold-page-object/references/component-detection.md .claude/skills/from-issue/references/workflow.md
git status --short   # expect: clean
git log --oneline -5
```

- [ ] **Step 2: Report** — Part 1 (docs) live on `main` + `e2e`; Part 2 (the exact-match fix) pushed to `SW-4-inventory` / PR #17. No behavioral run needed — the patterns are exercised naturally by future `/from-issue` runs; Decision 5's suite-green is verified in Task 4 Step 3.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (no ADR) → honored (no ADR task). Decision 2 (loader) → Task 1. Decision 3 (computed-style + exact-match) → Task 2. Decision 4 (array-vs-component rule + Step-5 cross-ref) → Task 3. Decision 5 (InventoryPage fix) → Task 4. Branch model → Execution/sequencing + Integration A. Verification → Task 4 Step 3 + Task 5. No gaps.

**Placeholder scan:** No "TBD/handle edge cases". Code blocks are complete and copied from the proven SW-4 output. Every task has a bare `prettier --check`/`tsc`/test gate + a `grep` check.

**Type consistency:** The exact-match locator `this.page.getByText(productName, { exact: true })` is identical in the playwright-conventions.md example (Task 2), the component rule's intent, and the InventoryPage fix (Task 4). `load<T>(relativePath)` matches SW-4's committed `data/fixtures.ts`. `Locator` is already imported in `InventoryPage.ts` (verified) so the `productTitle` helper typechecks. The `rgb(61, 220, 145)` target value matches the SW-4 hover test.
