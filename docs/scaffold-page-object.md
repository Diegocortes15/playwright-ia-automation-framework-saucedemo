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
