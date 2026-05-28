# Phase J — Codify SW-4-Validated Patterns into the Skills — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-28

## Goal

Turn three patterns the `/from-issue` SW-4 run had to **re-derive at runtime** into documented skill contracts, plus one small hardening fix — so future projects and future runs get them for free instead of reinventing (or getting them subtly wrong). Doc-only skill changes + one tiny TypeScript fix.

## Context

The SW-4 review (inventory content for `standard_user`) confirmed `/from-issue` produced excellent output, but three of its good decisions were **improvised**, not guided by the skill references:

- It invented the externalized-data **loader** (`fs.readFileSync` + `import.meta.url`, deliberately not `import … json`) and wrote a comment justifying it — yet `data-placement.md` only shows `load(...)` being _called_, never how it's implemented.
- It invented a solid **computed-style hover assertion** (`getComputedStyle`, `rgb()` compare, `expect.poll` for the transition) — undocumented; the next hover/focus AC would re-derive it (and could easily be flaky).
- It correctly chose **parallel-array queries** over a `ProductCard` component for uniform across-all-products assertions — by judgment. `component-detection.md` already has a `ProductCard` row that leans the other way, so the inflection point ("when array vs when component") is undocumented and could be decided inconsistently.

Plus a latent foot-gun: the generated `getProductTitleColor`/`hoverProductTitle` use substring `.filter({ hasText })`, which would match two cards if one product name were a substring of another (fine for saucedemo's distinct names; not bulletproof for a reusable template).

## Decisions

1. **No new ADR.** These elaborate existing conventions ([ADR-0001](../../adr/0001-pom-by-component.md) composition, the `data/` layout) rather than decide anything architectural. Reference docs are the right home.

2. **`data-placement.md` — define the canonical loader.** Add the concrete `data/fixtures.ts` shape to the existing "How to externalize" section: a generic `load<T>(relativePath)` using `readFileSync(join(dirname(fileURLToPath(import.meta.url)), relativePath), 'utf-8')` + `JSON.parse`, datasets typed via `data/types.ts`, consumed by specs as `import { products } from '@data/fixtures'`. State the rule **"do not `import … from './x.json'`"** with the one-line reason (native ESM requires an `with { type: 'json' }` import attribute; brittle through Playwright's config/test loader). Loader internals are the skill's concern; specs only ever import the named dataset.

3. **`playwright-conventions.md` — two additions.**
   - **Computed-style / pseudo-state assertions** (hover / focus / active): read the property via `getComputedStyle(el).<prop>`; compare in **computed form** (`rgb(61, 220, 145)`, not `#3ddc91`); sanity-check the **resting** value ≠ the target first; trigger the state (`.hover()` / `.focus()`); then `await expect.poll(() => readComputed()).toBe(target)` so a CSS transition can settle. The SW-4 hover-color test is the worked example.
   - **Exact-match for named-element filters:** when a query targets ONE element identified by a human name, match it exactly, not via substring `hasText` (a name that's a substring of another would match more than one). Prefer `getByText(name, { exact: true })` or an anchored regex over `filter({ hasText: name })`.

4. **`component-detection.md` — parallel-array vs discriminator-component rule.** Add a decision rule, reconciled with the existing `ProductCard` row:
   - Assert across N similar elements **uniformly** (all names, all prices, all images) → page-direct **parallel-array queries** returning `T[]` (e.g. `getProductNames(): string[]`) on the Page Object. This is the right, simpler choice and **endorses SW-4's call**.
   - Need per-**instance** interaction or state (act on _this_ product, assert _this_ card's badge) → a **Component with a discriminator** (`ProductCard(page, productName)`, composition rule #9).
     The existing `ProductCard` row is for the per-instance case. Cross-reference this rule from `from-issue` workflow Step 5 so the skill picks correctly.

5. **Fix the e2e `InventoryPage` instance.** Change `getProductTitleColor`/`hoverProductTitle` from `.filter({ hasText: productName })` to an exact match (per Decision 3's note). Lands on the `SW-4-inventory` branch (PR #17), hardening SW-4's own code; the suite must stay green.

## Affected files

- `.claude/skills/from-issue/references/data-placement.md` — loader definition (Decision 2).
- `.claude/skills/from-issue/references/playwright-conventions.md` — computed-style + exact-match notes (Decision 3).
- `.claude/skills/scaffold-page-object/references/component-detection.md` — array-vs-component rule (Decision 4).
- `.claude/skills/from-issue/references/workflow.md` — one cross-reference line in Step 5 to the new rule (Decision 4).
- `src/pages/InventoryPage.ts` (e2e / PR #17) — exact-match fix (Decision 5).

## Branch model / sequencing

- **A–C + the workflow cross-ref** on a `phase-j-codify-patterns` branch off `main` → merge `main` → `e2e` (skill/doc files; clean merge, like F–I).
- **Decision 5** (the `InventoryPage` fix) on the `SW-4-inventory` branch so it rides into PR #17.

## Alternatives considered

- **New ADR for the loader / array-vs-component rule.** Rejected: no architectural decision with rejected alternatives — these are convention details; reference docs suffice.
- **Always prefer a `ProductCard` component for inventory.** Rejected: over-engineers uniform list assertions (parallel-array is simpler and clearer); the component earns its place only at per-instance interaction (rule #9 / YAGNI).
- **Allow `import … json` with an import attribute.** Rejected: brittle through Playwright's loader and Node-version-sensitive; the `fs` loader is robust and already proven on SW-4.

## Scope / non-goals (YAGNI)

- No change to bucket/smoke policy, the project matrix, the tag-option convention (Phase I), or harness growth (Phase H).
- No retrofit of `main`'s suite.
- No `ProductCard` component is created now (none is needed yet — a future cart/per-product-interaction ticket introduces it under Decision 4's rule).

## Verification approach

1. Per-doc gate: `npx prettier --check` (bare) + a `grep` consistency read.
2. Decision 5: after the exact-match fix, `npx tsc --noEmit` + `npx playwright test tests/inventory/inventory.spec.ts` stays green (the hover test still passes).
3. Behavioral (later, naturally): the next externalized-data ticket and the next hover/focus AC follow the documented patterns without re-derivation.
