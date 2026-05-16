# Phase C.1 — `/scaffold-page-object` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a custom Claude Code skill `/scaffold-page-object` that takes a URL + page name + optional storageState and writes a draft Page Object class to disk (default `src/pages/<Name>.ts`; `scratch/<Name>.ts` for experimentation). The output follows the framework's POM-by-component conventions, includes a mandatory provenance comment block, and composes framework components auto-discovered from `src/components/*.ts`.

**Architecture:** Pure docs + config + skill phase. Adds 6 new files (compact `SKILL.md` + 3 references + 1 learning guide + 1 ADR), modifies 3 (`.gitignore` adds `scratch/`; `tsconfig.json` excludes `scratch/**`; `CLAUDE.md` adds "Custom skills" section). Zero changes to `src/`, `tests/`, `data/`, `playwright.config.ts`, `package.json`, or CI.

**Tech Stack:** Claude Code skills (prose-only) · Markdown · Existing `playwright-cli` vendored skill (from B.2) · Existing framework components (from Phase A).

**Spec:** [`docs/superpowers/specs/2026-05-15-phase-c1-scaffold-page-object-design.md`](../specs/2026-05-15-phase-c1-scaffold-page-object-design.md) (committed at `cfd3d4b`)

---

## Pre-flight: branch + clean baseline

**Files:** None modified in pre-flight.

- [ ] **Step 1: Confirm clean working tree on main**

```
git status
```

Expected: `On branch main` and "nothing to commit, working tree clean" (or only ignored files).

If anything else is dirty: STOP and report.

- [ ] **Step 2: Confirm baseline checks pass**

```
npm run typecheck
npm run lint
npm run format:check
```

All three must exit 0. (Skipping full `npm test` here — this phase doesn't touch test-affecting code; the suite was verified at the end of Phase B.2 and runs again at Task 9.)

- [ ] **Step 3: Create the feature branch**

```
git checkout -b phase-c1-scaffold-page-object
git branch --show-current
```

Expected: `phase-c1-scaffold-page-object`.

- [ ] **Step 4: Confirm Phase B.2 tag is reachable**

```
git tag -l phase-b2-complete -n2
```

Expected: tag exists, message starts with "Phase B.2 complete".

If missing: STOP — Phase B.2 isn't merged.

---

## Task 1: `scratch/` setup (`.gitignore` + `tsconfig.json`)

**Files:**

- Modify: `.gitignore` (add `scratch/` rule)
- Modify: `tsconfig.json` (add `scratch/**` to `exclude` array)

This task establishes the gitignored experimentation directory the skill writes to in smoke tests. It does NOT create `scratch/` itself — the skill creates it on first use, and an empty directory wouldn't be tracked by git anyway.

- [ ] **Step 1: Add `scratch/` rule to `.gitignore`**

Use Edit tool. Append the following lines to the end of `.gitignore`:

```
# Skill experimentation area (created by /scaffold-page-object and similar)
scratch/
```

- [ ] **Step 2: Verify the gitignore rule works**

```
mkdir scratch
echo "test" > scratch/dummy.ts
git check-ignore -v scratch/dummy.ts
```

Expected: `git check-ignore` exits 0 and prints the matching rule. `scratch/dummy.ts` does NOT appear in `git status`.

Cleanup the test artifacts:

```
rm -rf scratch
```

- [ ] **Step 3: Read current `tsconfig.json` to find the `exclude` array**

Use Read tool on `tsconfig.json`. Locate the `"exclude"` array (it's near the bottom of the file; typically contains `"node_modules"` and similar).

- [ ] **Step 4: Add `scratch/**`to`tsconfig.json` `exclude`\*\*

Use Edit tool. The exact edit depends on the current `exclude` array shape. The two most likely current states:

**Case A** — current `exclude` is `["node_modules"]`:

- `old_string`: `"exclude": ["node_modules"]`
- `new_string`: `"exclude": ["node_modules", "scratch/**"]`

**Case B** — current `exclude` is multi-line:

```
"exclude": [
  "node_modules"
]
```

Edit to:

```
"exclude": [
  "node_modules",
  "scratch/**"
]
```

Read `tsconfig.json` first; pick the matching case.

- [ ] **Step 5: Verify typecheck still passes**

```
npm run typecheck
```

Expected: exit 0.

- [ ] **Step 6: Format check**

```
npm run format:check
```

If `tsconfig.json` fails: `npx prettier --write tsconfig.json` and re-check.

- [ ] **Step 7: Commit**

```
git add .gitignore tsconfig.json
git commit -m "chore(c1): add scratch/ to .gitignore and tsconfig exclude (skill experimentation area)"
```

---

## Task 2: ADR-0008 — Custom Skills Pattern

**Files:**

- Create: `docs/adr/0008-custom-skills-pattern.md`

- [ ] **Step 1: Create `docs/adr/0008-custom-skills-pattern.md` with the EXACT content below**

Use Write tool.

```markdown
# 0008 — Custom Project-Specific Skills Pattern

**Date:** 2026-05-15
**Status:** Accepted

## Context

Phase B.2 vendored the `@playwright/cli` skill into `.claude/skills/playwright-cli/` — a third-party skill that gives Claude browser-control capabilities. Phase C.1 introduces the first **project-specific** custom skill: `/scaffold-page-object` — a higher-level intent that the framework itself cares about. Subsequent Phase C work (C.2 `/from-issue` orchestrator, C.3 catalog expansion) will add more such skills. We need to lock in a conventional file layout, naming, and `allowed-tools` pattern now so future skills follow predictable structure.

## Decision

**Custom project skills live under `.claude/skills/<skill-name>/` and follow this structure:**

- `SKILL.md` — compact frontmatter (`name`, `description`, `allowed-tools`) + brief intro + pointer to `references/`
- `references/workflow.md` — the detailed procedural steps the skill follows
- `references/<other>.md` — any additional reference docs (templates, lookup tables, detection signatures)

The `SKILL.md` body stays small (always-loaded for skill discovery) and points at on-demand reference files for verbose detail. Frontmatter `allowed-tools` enumerates exactly the tool families the skill needs. This mirrors the vendored `playwright-cli` skill's layout from Phase B.2.

## Consequences

- C.2/C.3 skills follow the same layout — predictable for both humans and AI extending the project
- Skill descriptions stay scannable in `/skills` output (compact `SKILL.md`)
- Verbose workflow content doesn't bloat skill-discovery context
- Each skill is self-contained in its own subdirectory; no cross-skill dependencies expected
- The `allowed-tools` frontmatter caps each skill's surface area — explicit deny-by-default
- Adding a new skill = `mkdir .claude/skills/<name>/`, write `SKILL.md` + `references/workflow.md`, optionally add other reference docs

## Alternatives considered

- **Single `SKILL.md` with everything inline** — rejected: as workflows get longer (12+ steps), the always-loaded skill discovery context grows uncomfortably
- **Code-based skills (TypeScript or Python)** — rejected: procedural prose is simpler for AI to follow; matches Phase B.2's vendored skill pattern; no build step
- **Shared `references/` across skills** — rejected: each skill is independent; shared references create coupling without clear benefit at current scale
```

- [ ] **Step 2: Verify the file exists and the line count is under 80**

PowerShell:

```powershell
Test-Path docs/adr/0008-custom-skills-pattern.md
(Get-Content docs/adr/0008-custom-skills-pattern.md).Count
```

Expected: `True` then a number under 80 (target ~40).

- [ ] **Step 3: Format check**

```
npm run format:check
```

If it fails on this file: `npx prettier --write docs/adr/0008-custom-skills-pattern.md` then re-check.

- [ ] **Step 4: Commit**

```
git add docs/adr/0008-custom-skills-pattern.md
git commit -m "docs(adr): add ADR-0008 custom project-specific skills pattern"
```

---

## Task 3: Skill reference files (component-detection + page-object-template)

**Files:**

- Create: `.claude/skills/scaffold-page-object/references/component-detection.md`
- Create: `.claude/skills/scaffold-page-object/references/page-object-template.md`

This task creates the two static reference files. The third reference (`workflow.md`) is Task 4 (it's longer and changes more often).

- [ ] **Step 1: Create the directory tree**

PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path .claude/skills/scaffold-page-object/references | Out-Null
```

(Or `mkdir -p .claude/skills/scaffold-page-object/references` on POSIX shells.)

- [ ] **Step 2: Create `.claude/skills/scaffold-page-object/references/component-detection.md` with the EXACT content below**

Use Write tool.

```markdown
# Component Detection Signatures

This file holds the **per-component root-selector signatures** the `scaffold-page-object` skill uses to recognize framework components in a live page snapshot.

The **canonical list of components** is `src/components/*.ts` — this doc holds the per-component "how to spot it on a page" details. The skill compares the two at step 4 of its workflow and warns when a component file exists with no signature here.

## Signatures

| Component      | Import path                | Root signature                                     | When detected, skip these elements                                                          |
| -------------- | -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Header`       | `@components/Header`       | `#react-burger-menu-btn` AND `.app_logo` present   | burger menu, logo, cart icon, logout link, navigation links                                 |
| `CartBadge`    | `@components/CartBadge`    | `[data-test="shopping-cart-badge"]` (when count>0) | the badge counter span                                                                      |
| `ProductCard`  | `@components/ProductCard`  | `[data-test="inventory-item"]` (multiple)          | per-card name, price, add/remove buttons (use `new ProductCard(page, productName)` instead) |
| `SortDropdown` | `@components/SortDropdown` | `[data-test="product-sort-container"]`             | the sort `<select>` element                                                                 |

Header always implies CartBadge availability (Header composes CartBadge per Phase A).

## Adding a new component

When a new component lands in `src/components/`, **append a row here BEFORE running the skill against any page that contains the new component.** Otherwise the skill aborts at step 4 with the auto-discover warning, listing the missing component file and pointing here.
```

- [ ] **Step 3: Create `.claude/skills/scaffold-page-object/references/page-object-template.md` with the EXACT content below**

Use Write tool. Note the nested code fence — use 4 backticks for the outer fence so the inner ` ```typescript ` block displays correctly.

````markdown
# Page Object Output Template

The `scaffold-page-object` skill renders generated files following this template. The top-of-file comment block is **mandatory** and identical across every generated file (only the date varies).

## Template

```typescript
// Generated by /scaffold-page-object on YYYY-MM-DD.
// Tests using this Page Object are generated by /from-issue (Phase C.2)
// from labeled GitHub Issues. Manual edits are welcome — this file is
// not regenerated automatically.

import { type Locator, type Page } from '@playwright/test';
// ONE of these per detected component:
import { Header } from '@components/Header';

export class <Name>Page {
  // Composed components first (ADR-0001 rule #6)
  readonly header: Header;

  // Page-direct locators second
  readonly pageTitle: Locator;
  readonly continueButton: Locator;
  // ... one readonly Locator per remaining interactive element

  constructor(public readonly page: Page) {
    // Wire components first
    this.header = new Header(page);
    // Then page-direct locators (data-test preferred per CLAUDE.md selector preference order)
    this.pageTitle = page.locator('[data-test="title"]');
    this.continueButton = page.getByRole('button', { name: /^Continue$/i });
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }
  async fillFirstName(value: string): Promise<void> {
    await this.firstNameInput.fill(value);
  }
}
```

## Rules

- **Comment block at top** — mandatory; copy verbatim with YYYY-MM-DD replaced by today's date
- **Selector preference order** (per CLAUDE.md):
  1. `[data-test="..."]` attribute
  2. `getByRole(...)` with anchored regex like `/^Continue$/i`
  3. Text matchers
  4. CSS selectors (last resort)
  5. Never XPath
- **Field order** — composed components first, then page-direct locators (ADR-0001 rule #6)
- **Constructor wiring order** — same as field order
- **Action method naming** — start from element's accessible name, normalize to camelCase, strip filler words (`to`, `the`, `and`, `a`, `of`), favor brevity (`"Continue to Checkout"` → `clickContinue`)
- **No companion smoke test** — that's C.2's job (test generation requires ticket context)
````

- [ ] **Step 4: Verify both files exist**

PowerShell:

```powershell
Test-Path .claude/skills/scaffold-page-object/references/component-detection.md
Test-Path .claude/skills/scaffold-page-object/references/page-object-template.md
```

Both expected: `True`.

- [ ] **Step 5: Format check**

```
npm run format:check
```

If either file fails: `npx prettier --write .claude/skills/scaffold-page-object/references/component-detection.md .claude/skills/scaffold-page-object/references/page-object-template.md` then re-check.

- [ ] **Step 6: Commit**

```
git add .claude/skills/scaffold-page-object/references/component-detection.md .claude/skills/scaffold-page-object/references/page-object-template.md
git commit -m "feat(c1): add scaffold-page-object reference files (component-detection + page-object-template)"
```

---

## Task 4: Skill workflow reference (`references/workflow.md`)

**Files:**

- Create: `.claude/skills/scaffold-page-object/references/workflow.md`

This task creates the load-bearing 12-step procedural workflow the skill follows when invoked. It's the longest file in the skill.

- [ ] **Step 1: Create `.claude/skills/scaffold-page-object/references/workflow.md` with the EXACT content below**

Use Write tool.

````markdown
# scaffold-page-object Workflow

The 12-step procedural workflow Claude follows when the `scaffold-page-object` skill is invoked.

## Inputs

- **URL** (required) — e.g., `https://www.saucedemo.com/cart.html`
- **Page name** (required) — e.g., `CartPage` (PascalCase, no `.ts` suffix)
- **Output path** (optional) — defaults per step 10; `scratch/<Name>.ts` for verification, `src/pages/<Name>.ts` for real work
- **storageState path** (optional) — e.g., `auth/standard.json`; no auth assumed if omitted

## Steps

### 1. Validate inputs

Check that URL and page name are present. If either is missing, ask the user; don't guess.

### 2. Verify storageState file exists (if provided)

If the user gave a storageState path, use `Read` to confirm it exists. If missing, abort with:

> _"storageState file not found at `<path>`. Run `npm test` (or `npx playwright test --project=setup`) to generate it."_

### 3. Refuse to overwrite

If the resolved output path already exists (use `Glob` or `Read` to check), abort with:

> _"`<path>` exists. `rm` it and re-run, or pick a different output path."_

No merging, no overwriting. Predictable safety.

### 4. Hybrid auto-discover of framework components

Two-source comparison:

**a) Canonical list:** `Glob src/components/*.ts` to get all framework components by filename (e.g., `Header.ts` → `Header`).

**b) Detection signatures:** `Read references/component-detection.md` to get the per-component root-selector signatures.

**Compare:** If the folder contains a component file with no signature in the doc, emit a loud warning and abort:

> _"Found `src/components/<NewName>.ts` but no detection signature in `references/component-detection.md`. Add a signature row before re-running."_

This prevents silently missing newly-added components.

### 5. Open the page via playwright-cli

```bash
# If storageState provided:
playwright-cli state-load <path>

# Then:
playwright-cli goto <url>
```

### 6. Snapshot the page

```bash
playwright-cli snapshot
```

Returns a structured tree with element refs.

### 7. Detect framework components

Walk the snapshot for each component signature loaded in step 4. For each match, mark the component for composition (not re-generation of its constituent locators).

### 8. Generate locators for non-component elements

For each remaining interactive element (excluding any covered by detected components):

```bash
playwright-cli generate-locator <ref>
```

Pick a semantic field name from the element's accessible name. **Naming rule:**

- Start from the accessible name
- Normalize to camelCase
- Strip filler words: `to`, `the`, `and`, `a`, `of`
- Favor brevity when meaning is preserved
- Examples:
  - `"Continue to Checkout"` → `clickContinue` (not `clickContinueToCheckout`)
  - `"First Name"` → `firstNameInput`
  - `"Add to cart"` → `clickAddToCart` (keeping "to cart" preserves meaning — without it, ambiguous)

Edge cases (e.g., two buttons with the same name on one page) get caught in C.2 review.

### 9. Render the Page Object

Following `references/page-object-template.md`:

- Top-of-file comment block (mandatory; YYYY-MM-DD = today's date in the user's local time)
- Imports (`type Locator`, `type Page` from `@playwright/test`; detected component classes from `@components/*`)
- `readonly` fields — composed components first, page-direct locators second (ADR-0001 rule #6)
- Constructor — wire components first, then page-direct locators in declaration order
- Action methods — one per interactive element type:
  - Button → `click<Name>(): Promise<void>`
  - Input → `fill<Name>(value: string): Promise<void>`
  - Select → `select<Name>(value: string): Promise<void>`

### 10. Write the file

Default output path:

- If the user gave one explicitly, use it
- Else if URL contains `/checkout-step` or `/checkout-complete`, write to `src/pages/checkout/<Name>.ts`
- Else write to `src/pages/<Name>.ts`

Use the `Write` tool. (Step 3 already confirmed the path didn't exist.)

### 11. Isolated typecheck of the generated file

```bash
npx tsc --noEmit <path>
```

This runs the project's strict TS settings against the single generated file, regardless of whether it landed in `src/pages/` (in `tsconfig.json` include) or `scratch/` (excluded from project-wide typecheck).

- If typecheck **passes**, record the pass for step 12's report
- If typecheck **fails**, leave the file in place and capture the errors verbatim for step 12

The project-wide `npm run typecheck` is unaffected — `scratch/` stays excluded so half-baked AI files don't break the global build.

### 12. Report what landed

Report to the user:

- Output file path
- List of composed components (if any)
- List of generated page-direct locators (field name → selector)
- List of generated action methods
- Isolated-typecheck result (PASS or list of errors verbatim)
- Confirmation that the top-of-file comment block landed (first 4 lines of the file match the template)
````

- [ ] **Step 2: Verify the file exists**

```powershell
Test-Path .claude/skills/scaffold-page-object/references/workflow.md
(Get-Content .claude/skills/scaffold-page-object/references/workflow.md | Select-String '^### \d+\.').Count
```

Expected: `True` then `12` (twelve numbered steps).

- [ ] **Step 3: Format check**

```
npm run format:check
```

If it fails: `npx prettier --write .claude/skills/scaffold-page-object/references/workflow.md` then re-check.

- [ ] **Step 4: Commit**

```
git add .claude/skills/scaffold-page-object/references/workflow.md
git commit -m "feat(c1): add scaffold-page-object workflow reference (12 procedural steps)"
```

---

## Task 5: SKILL.md (compact frontmatter + intro + pointer)

**Files:**

- Create: `.claude/skills/scaffold-page-object/SKILL.md`

- [ ] **Step 1: Create `.claude/skills/scaffold-page-object/SKILL.md` with the EXACT content below**

Use Write tool.

```markdown
---
name: scaffold-page-object
description: Generate a draft Page Object class from a live page snapshot, composing framework components when detected.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Read Glob Grep Write
---

# scaffold-page-object

Given a URL + page name + optional storageState, this skill produces a draft Page Object class file at `src/pages/<Name>.ts` (or `scratch/<Name>.ts` for experimentation). The output follows the framework's POM-by-component conventions: `readonly` locator fields, constructor wiring, action methods inferred from the live page, and composition of framework components detected on the page.

## How to use it

Tell Claude what you want:

> Use the scaffold-page-object skill to create a `CheckoutCompletePage` from https://www.saucedemo.com/checkout-complete.html using `auth/standard.json`.

Or for experimentation, send the output to `scratch/`:

> Use the scaffold-page-object skill to create a `LoginPage` from https://www.saucedemo.com — no auth needed. Write to `scratch/LoginPage.ts`.

## Workflow

The full 12-step procedural workflow is in [`references/workflow.md`](references/workflow.md). Read that file before executing the skill.

## References

- [`references/workflow.md`](references/workflow.md) — the 12-step procedural workflow
- [`references/page-object-template.md`](references/page-object-template.md) — canonical TS template for generated files
- [`references/component-detection.md`](references/component-detection.md) — signatures for recognizing framework components in a page

## See also

- [`docs/scaffold-page-object.md`](../../../docs/scaffold-page-object.md) — learning guide with worked examples
- [`docs/adr/0008-custom-skills-pattern.md`](../../../docs/adr/0008-custom-skills-pattern.md) — why custom skills follow this layout
```

- [ ] **Step 2: Verify the file exists and frontmatter is intact**

PowerShell:

```powershell
Test-Path .claude/skills/scaffold-page-object/SKILL.md
Get-Content .claude/skills/scaffold-page-object/SKILL.md -TotalCount 5
```

Expected: `True`, then 5 lines starting with `---` and the frontmatter (`name:`, `description:`, `allowed-tools:`).

- [ ] **Step 3: Format check**

```
npm run format:check
```

If it fails: `npx prettier --write .claude/skills/scaffold-page-object/SKILL.md` then re-check.

- [ ] **Step 4: Commit**

```
git add .claude/skills/scaffold-page-object/SKILL.md
git commit -m "feat(c1): add scaffold-page-object SKILL.md (compact frontmatter + intro + pointers)"
```

---

## Task 6: Learning guide (`docs/scaffold-page-object.md`)

**Files:**

- Create: `docs/scaffold-page-object.md`

- [ ] **Step 1: Create `docs/scaffold-page-object.md` with the EXACT content below**

Use Write tool. Six H2 headings: What is / How wired / Verifying / Worked examples / When NOT to use / Pointers.

````markdown
# scaffold-page-object — Learning Guide

The `/scaffold-page-object` skill generates a draft Page Object class from a live page snapshot. This is the learning guide; for the procedural workflow Claude follows, see [`.claude/skills/scaffold-page-object/references/workflow.md`](../.claude/skills/scaffold-page-object/references/workflow.md).

## What is `/scaffold-page-object`

It's a Claude Code custom skill that takes:

- A URL (e.g., `https://www.saucedemo.com/cart.html`)
- A page name (e.g., `CartPage`)
- Optional: a storageState file for authenticated pages

…and writes a draft Page Object class to disk. The output composes framework components (Header, CartBadge, etc.) when detected, generates `readonly` locator fields for everything else, and stubs action methods based on the live page's interactive elements.

Distinction from the underlying tool: **`/scaffold-page-object` is a higher-level intent** — it knows about this framework's POM-by-component conventions, the `@components/*` aliases, and ADR-0001's composition rules. The underlying `playwright-cli` skill (from Phase B.2) is generic browser inspection — it doesn't know what a "Page Object" is. C.1 builds on B.2.

## How it's wired in this project

- Skill files at `.claude/skills/scaffold-page-object/`
  - `SKILL.md` — frontmatter + intro + pointer (always loaded for skill discovery)
  - `references/workflow.md` — the 12-step procedural workflow (loaded when skill runs)
  - `references/page-object-template.md` — canonical TS template
  - `references/component-detection.md` — root-selector signatures for the framework's components
- Skill scaffolds files to `src/pages/<Name>.ts` by default (or `src/pages/checkout/<Name>.ts` for checkout URLs); use `scratch/<Name>.ts` for experimentation
- Skill auto-discovers components by globbing `src/components/*.ts` and warns when a component file has no detection signature

## Verifying the setup

After the skill is installed, run this 3-step smoke test in a fresh Claude Code session.

### Step 1 — Skill discoverable

Open Claude Code in this repo. Type `/skills`. Expected: both `playwright-cli` AND `scaffold-page-object` are listed with their descriptions.

### Step 2 — Unauthenticated page

Paste:

> Use the scaffold-page-object skill to create a `LoginPage` from https://www.saucedemo.com — no auth needed. Write to `scratch/LoginPage.ts`.

Expected:

- Skill executes the 12-step workflow
- Opens the login page, snapshots it
- Generates locators for username/password/login-button
- Writes `scratch/LoginPage.ts` with the mandatory comment block at top
- Reports: 0 composed components, 3 page-direct locators, 1 action method (`clickLogin`), isolated typecheck PASS

### Step 3 — Authenticated page

Paste:

> Use the scaffold-page-object skill to create a `CartPage` from https://www.saucedemo.com/cart.html using `auth/standard.json`. Write to `scratch/CartPage.ts`.

Expected:

- Skill loads `auth/standard.json`, navigates to cart
- Detects `Header` component (composes it instead of regenerating its sub-locators)
- Writes `scratch/CartPage.ts` with `readonly header: Header` as the first field
- Page-direct locators cover cart-list / continue-shopping / checkout buttons
- Isolated typecheck PASS

If all three pass, the skill is healthy.

## Worked examples

### Scaffold a real Page Object (output to `src/pages/`)

Use this when you want the skill output to land in the framework as a starting point you'll refine.

> Use the scaffold-page-object skill to create a `ProductDetailsPage` from https://www.saucedemo.com/inventory-item.html?id=4 using `auth/standard.json`.

Result: `src/pages/ProductDetailsPage.ts` is written. Open it in your editor. Adjust action method names if any feel awkward. Add the file to a test in `tests/<feature>/`.

### Experiment before committing (output to `scratch/`)

Use this when you want to see what the skill produces without polluting `src/pages/`.

> Use the scaffold-page-object skill to create a `CheckoutCompletePage` from https://www.saucedemo.com/checkout-complete.html using `auth/standard.json`. Write to `scratch/CheckoutCompletePage.ts`.

Result: `scratch/CheckoutCompletePage.ts` is written, gitignored, doesn't touch the real framework. Compare side-by-side with `src/pages/checkout/CheckoutCompletePage.ts` (the human-written version from Phase A) to gauge how close the AI got.

### Recover from a missed component

Suppose you've added a new component `src/components/ProductFilter.ts` and run the skill against a page that uses it.

> Use the scaffold-page-object skill to create an `AdvancedInventoryPage` from https://example.com/inventory using `auth/standard.json`.

Expected: skill aborts at step 4 with:

> _"Found `src/components/ProductFilter.ts` but no detection signature in `references/component-detection.md`. Add a signature row before re-running."_

Fix: open `.claude/skills/scaffold-page-object/references/component-detection.md` and add a row for `ProductFilter` with its import path, root signature, and elements to skip. Re-run the skill.

### Inspect a generated file's comment block

Open any file the skill produced. The first ~4 lines must be:

```ts
// Generated by /scaffold-page-object on YYYY-MM-DD.
// Tests using this Page Object are generated by /from-issue (Phase C.2)
// from labeled GitHub Issues. Manual edits are welcome — this file is
// not regenerated automatically.
```

This block is mandatory per the template in ADR-0008. Future PR reviewers reading the file will know it was AI-generated, where matching tests come from, and that edits are expected.

## When NOT to use it

- **Pages with non-framework components.** The skill recognizes only THIS framework's components (`src/components/*.ts`). Pages from apps with Material UI / Ant Design / etc. won't trigger composition — locators get generated inline for every interactive element.
- **Production credential pages.** The skill uses storageState files; treat real-credential sessions with the same care as a real browser session.
- **Generating tests.** That's Phase C.2's `/from-issue` orchestrator. C.1 only produces Page Objects (no companion smoke test).
- **Overwriting existing Page Objects.** The skill refuses by design — `rm` and re-run if you really want to regenerate.

## Pointers

- [ADR-0008](adr/0008-custom-skills-pattern.md) — custom skills pattern, why files are laid out this way
- [`scaffold-page-object` SKILL.md](../.claude/skills/scaffold-page-object/SKILL.md) — the skill itself
- [`references/workflow.md`](../.claude/skills/scaffold-page-object/references/workflow.md) — the 12-step procedural workflow
- [`docs/playwright-cli.md`](playwright-cli.md) — underlying browser-control skill (Phase B.2)
````

- [ ] **Step 2: Verify the file exists and has 6 H2 headings**

PowerShell:

```powershell
Test-Path docs/scaffold-page-object.md
(Get-Content docs/scaffold-page-object.md | Select-String '^## ').Count
```

Expected: `True` then `6` (What is / How wired / Verifying / Worked examples / When NOT to use / Pointers).

- [ ] **Step 3: Format check**

```
npm run format:check
```

If it fails: `npx prettier --write docs/scaffold-page-object.md` then re-check.

- [ ] **Step 4: Commit**

```
git add docs/scaffold-page-object.md
git commit -m "docs(c1): add scaffold-page-object learning guide with worked examples"
```

---

## Task 7: CLAUDE.md "Custom skills" section

**Files:**

- Modify: `CLAUDE.md` (insert ~8-line "Custom skills" section)

- [ ] **Step 1: Read current `CLAUDE.md` to find the right insertion point**

Use Read tool on `CLAUDE.md`. Find the existing "Playwright CLI" section added in Phase B.2 — it should be one of the top-level `## ` headings. The new "Custom skills" section goes **immediately after the Playwright CLI section** (Custom skills BUILD ON `playwright-cli`).

Identify the next `## ` heading that follows the Playwright CLI section. That heading is the anchor for the swap.

- [ ] **Step 2: Insert the new "Custom skills" section**

Use Edit tool. Anchor on the last line of the Playwright CLI section AND the next `## ` heading after it (whatever that heading turns out to be — likely "Composition rules" or similar).

Example pattern — replace this `old_string`:

```
<last line of Playwright CLI section>

## <next-section-heading>
```

with this `new_string`:

```
<last line of Playwright CLI section>

## Custom skills

This project ships custom skills under `.claude/skills/<skill-name>/` — domain-specific workflows that build on top of `playwright-cli` and other tools. The pattern is documented in [ADR-0008](docs/adr/0008-custom-skills-pattern.md): compact `SKILL.md` (frontmatter + intro + pointer) and verbose detail in `references/`.

Current custom skills:

- **`/scaffold-page-object`** — generate a draft Page Object class from a live page snapshot. Full guide: [`docs/scaffold-page-object.md`](docs/scaffold-page-object.md).

## <next-section-heading>
```

The exact `<last line>` and `<next-section-heading>` must be read from the current file. Don't guess — read CLAUDE.md first, copy the anchor text verbatim.

- [ ] **Step 3: Verify CLAUDE.md still under 150 lines**

PowerShell:

```powershell
(Get-Content CLAUDE.md).Count
```

Expected: under 150. (Was around 110-115 after Phase B.2; +8 lines for this new section.)

If over 150: STOP — the section grew beyond design.

- [ ] **Step 4: Verify the new section is present**

PowerShell:

```powershell
Get-Content CLAUDE.md | Select-String '^## Custom skills'
```

Expected: exactly 1 match.

- [ ] **Step 5: Format check + lint**

```
npm run format:check
npm run lint
```

Both must exit 0. If format fails: `npx prettier --write CLAUDE.md` then re-check.

- [ ] **Step 6: Commit**

```
git add CLAUDE.md
git commit -m "docs(claude): add 'Custom skills' section pointing at /scaffold-page-object"
```

---

## Task 8: User-driven smoke test + DoD evidence

**Files:** None modified. The skill writes to `scratch/` (gitignored), so smoke-test artifacts don't land in git.

This task **cannot be executed by an automated subagent.** A subagent runs in a different process and cannot drive a Claude Code conversation that loads and runs the new skill. The user (or a controller agent that has access to Claude Code's skill machinery) must run the smoke test manually.

- [ ] **Step 1: User opens a fresh Claude Code session in the project directory**

Close any existing Claude Code session in this repo. Open a new one (the new skill files in `.claude/skills/scaffold-page-object/` are loaded at session start).

- [ ] **Step 2: Confirm both skills are listed**

In the new session, type:

```
/skills
```

Expected: both `playwright-cli` (from B.2) AND `scaffold-page-object` (new) are listed with their descriptions. Record the actual output for the DoD report.

If `scaffold-page-object` is missing: STOP. Check that `SKILL.md` frontmatter is valid (Task 5).

- [ ] **Step 3: Smoke test Step 2 — unauthenticated `LoginPage`**

Paste this prompt verbatim:

> Use the scaffold-page-object skill to create a `LoginPage` from https://www.saucedemo.com — no auth needed. Write to `scratch/LoginPage.ts`.

Wait for the skill to complete. Expected outcomes:

- Browser window opens (Chromium, headed — playwright-cli's behavior from Phase B.2)
- Skill walks through steps 1-12 of the workflow
- File `scratch/LoginPage.ts` is created
- Skill's final report includes: 0 composed components, 3 page-direct locators (username/password/login-button), 1 action method (`clickLogin`), isolated typecheck PASS, comment block confirmed

After the skill completes, manually verify:

```powershell
Test-Path scratch/LoginPage.ts
Get-Content scratch/LoginPage.ts -TotalCount 4
```

Expected: `True`, then 4 comment lines matching the template (`// Generated by /scaffold-page-object on YYYY-MM-DD.` …).

If the file is missing OR the comment block doesn't match: STOP and report.

- [ ] **Step 4: Smoke test Step 3 — authenticated `CartPage`**

First confirm `auth/standard.json` exists. If not, run:

```
npx playwright test --project=setup
```

Then in the Claude Code session, paste:

> Use the scaffold-page-object skill to create a `CartPage` from https://www.saucedemo.com/cart.html using `auth/standard.json`. Write to `scratch/CartPage.ts`.

Wait for completion. Expected:

- Skill loads storageState, navigates to cart
- Detects `Header` component
- File `scratch/CartPage.ts` is created
- Skill's report: 1 composed component (`Header`), 3-5 page-direct locators (cart-list / continue-shopping / checkout buttons), action methods for each, isolated typecheck PASS

Manually verify:

```powershell
Test-Path scratch/CartPage.ts
Get-Content scratch/CartPage.ts | Select-String "import { Header }"
Get-Content scratch/CartPage.ts | Select-String "readonly header: Header"
```

All three expected: PASS.

- [ ] **Step 5: Document DoD evidence**

Record (in your status report when handing back to the controller):

- `/skills` showed both skills: yes | no
- `LoginPage` smoke test PASSED: yes | no (include skill report verbatim)
- `CartPage` smoke test PASSED: yes | no (include skill report verbatim)
- Comment block landed at top of both files: yes | no
- Isolated typecheck PASS on both: yes | no
- `auth/standard.json` exists / was generated: present | generated-during-this-task
- Any unexpected behavior: <list>

This is the evidence the DoD smoke-test criteria (Task 9 / DoD #7-#9-#12) are satisfied.

- [ ] **Step 6: Cleanup scratch/ artifacts**

```
rm -rf scratch
```

(Smoke test outputs aren't needed beyond this point; recreate `scratch/` if you want to keep tinkering.)

- [ ] **Step 7: No commit needed**

This task doesn't change tracked files. Move directly to Task 9.

---

## Task 9: Final Definition-of-Done verification + tag

**Files:** None modified. Verification only, then annotated tag.

- [ ] **Step 1: Confirm all 6 new files exist and are committed**

PowerShell:

```powershell
$expected = @(
  '.claude/skills/scaffold-page-object/SKILL.md',
  '.claude/skills/scaffold-page-object/references/workflow.md',
  '.claude/skills/scaffold-page-object/references/page-object-template.md',
  '.claude/skills/scaffold-page-object/references/component-detection.md',
  'docs/scaffold-page-object.md',
  'docs/adr/0008-custom-skills-pattern.md'
)
$missing = $expected | Where-Object { -not (Test-Path $_) }
if ($missing) { Write-Host "MISSING:"; $missing } else { Write-Host "All 6 new files present." }

# Confirm tracked by git:
foreach ($f in $expected) {
  $tracked = git ls-files $f
  if (-not $tracked) { Write-Host "NOT TRACKED: $f" }
}
```

Expected: `All 6 new files present.` and no "NOT TRACKED" lines.

- [ ] **Step 2: Confirm `scratch/` is gitignored**

```
mkdir scratch
echo "test" > scratch/dummy.ts
git check-ignore -v scratch/dummy.ts
rm -rf scratch
```

Expected: `git check-ignore` exits 0 and prints the matching `.gitignore` rule.

- [ ] **Step 3: Confirm `tsconfig.json` excludes `scratch/**`\*\*

PowerShell:

```powershell
Get-Content tsconfig.json | Select-String 'scratch'
```

Expected: at least 1 match showing `scratch/**` in the `exclude` array.

- [ ] **Step 4: Confirm `docs/scaffold-page-object.md` has 6 H2 headings**

```powershell
(Get-Content docs/scaffold-page-object.md | Select-String '^## ').Count
```

Expected: `6`.

- [ ] **Step 5: Confirm ADR-0008 has 4 Nygard sections and is under 80 lines**

```powershell
(Get-Content docs/adr/0008-custom-skills-pattern.md).Count
Get-Content docs/adr/0008-custom-skills-pattern.md | Select-String '^## (Context|Decision|Consequences|Alternatives considered)'
```

Expected: a number under 80, then 4 match lines.

- [ ] **Step 6: Confirm `CLAUDE.md` has new "Custom skills" section AND is under 150 lines**

```powershell
(Get-Content CLAUDE.md).Count
Get-Content CLAUDE.md | Select-String '^## Custom skills'
```

Expected: a number under 150, then exactly 1 match.

- [ ] **Step 7: Confirm typecheck + lint + format + tests all green**

```
npm run typecheck
npm run lint
npm run format:check
npm test
```

All exit 0. `npm test` produces **exactly 62 passing test instances** (this phase adds zero tests).

If `npm test` shows fewer or more than 62: STOP — a doc/skill-only phase shouldn't change the test count.

- [ ] **Step 8: Confirm Task 8 smoke-test evidence is positive**

Re-read the smoke-test evidence recorded in Task 8 Step 5. ALL of the following must be positive:

- `/skills` listed both skills
- `LoginPage` smoke test PASSED with isolated typecheck PASS and comment block landed
- `CartPage` smoke test PASSED with isolated typecheck PASS, `Header` composition, comment block landed

If any are missing: revisit Task 8 before tagging.

- [ ] **Step 9: Tag the milestone**

```
git tag -a phase-c1-complete -m "Phase C.1 complete: /scaffold-page-object skill installed, documented, smoke-tested"
git tag -l phase-c1-complete -n5
```

Expected: tag exists with the message above. Don't push the tag — the controller will handle that during finishing-a-development-branch.

---

## Self-review notes (already applied)

The plan was reviewed against the Phase C.1 spec before writing. Coverage check:

| Spec section                                         | Tasks                                                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| §1 overview / scope                                  | All tasks scoped to one skill + supporting docs; no GitHub Issue reading, no test generation, no PR opening                                 |
| §2 decision log (10 decisions, refined in Section 2) | Tasks 1-7 implement each decision exactly; Task 8 verifies via smoke test                                                                   |
| §3a (skill file structure — 3 references + SKILL.md) | Tasks 3 + 4 + 5                                                                                                                             |
| §3b (12-step workflow with hybrid auto-discover)     | Task 4 (workflow.md content)                                                                                                                |
| §3c (Page Object template with comment block)        | Task 3 (page-object-template.md)                                                                                                            |
| §3d (component detection signatures)                 | Task 3 (component-detection.md)                                                                                                             |
| §3e (`scratch/` convention)                          | Task 1                                                                                                                                      |
| §3f (what stays untouched)                           | No task modifies excluded paths                                                                                                             |
| §4 verification (manual 3-step smoke test)           | Task 8                                                                                                                                      |
| §5 acceptance criteria (12 items)                    | Task 9 verifies each                                                                                                                        |
| §6 file deliverables (6 new + 3 modified)            | All accounted for: Task 1 (2 modified), Task 2 (1 new), Task 3 (2 new), Task 4 (1 new), Task 5 (1 new), Task 6 (1 new), Task 7 (1 modified) |
| §7 out of scope                                      | Plan contains no GitHub Issue reading, no test generation, no PR opening, no auto-overwriting                                               |

**Source content provenance:**

- ADR-0008: Phase C.1 spec §2 decisions #5 + #9 + Phase B.2's vendored-skill layout
- `references/workflow.md`: Phase C.1 spec §3b (12 steps) + §3d (auto-discover behavior)
- `references/page-object-template.md`: Phase C.1 spec §3c
- `references/component-detection.md`: Phase C.1 spec §3d
- `SKILL.md`: Phase C.1 spec §3a + §3b inputs section
- `docs/scaffold-page-object.md`: Phase C.1 spec §4 (smoke test) + §3 (architecture overview) + ADR-0001 (composition rules) + ADR-0008 (skill pattern)

**Type/path consistency check:**

- Skill name `scaffold-page-object` spelled identically across SKILL.md frontmatter, CLAUDE.md, docs/scaffold-page-object.md, ADR-0008, all references
- `references/workflow.md` referenced from SKILL.md, docs/scaffold-page-object.md, and ADR-0008 — paths all check out
- `references/component-detection.md` is the single source for detection signatures; referenced from workflow.md step 4 and ADR-0008
- The mandatory comment block format is defined in `references/page-object-template.md` and verified in DoD criterion #12 — same exact text
- `scratch/` is referenced in: `.gitignore` (Task 1), `tsconfig.json` exclude (Task 1), workflow.md step 11 explanation, learning guide examples, DoD #2-#3
- The 62-passing-tests target matches Phase B.2's tag state and is verified in Task 9 Step 7
