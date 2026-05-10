# Phase B.1 — Documentation Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the 15 documentation files defined in `docs/superpowers/specs/2026-05-10-phase-b1-documentation-layer-design.md` — `README.md`, `CLAUDE.md`, `docs/architecture.md`, three `docs/app/*` files, the ADR template + five starter ADRs, and three placeholder files.

**Architecture:** Two-layer doc system — `CLAUDE.md` is auto-loaded into every Claude Code session (kept under 150 lines for context efficiency); `/docs/*.md` are referenced on demand. Framework docs and app-under-test docs live in separate subdirectories so the framework can outlive any one app.

**Tech Stack:** Markdown only. No code changes. Implementation must keep `npm run typecheck && npm run lint && npm run format:check` green.

**Build order:** Pre-flight → README → CLAUDE → architecture → app docs → ADRs → placeholders → final verification + tag. Files are mostly independent; the order optimizes for shipping the highest-leverage AI-context files first (CLAUDE.md unblocks Phase C planning even before later files are merged).

**Working directory:** `d:\Diego\Projects\IA Engineer\playwright-ia-framework`. Currently on `main` at `5dfc121` (the Phase B.1 spec commit). Implementation should happen on a new feature branch `phase-b1-docs`.

**Source specs the implementer can read:**

- `docs/superpowers/specs/2026-05-09-phase-a-framework-foundation-design.md` (Phase A spec — sections 3, 4, 5, 6 contain source material)
- `docs/superpowers/specs/2026-05-10-phase-a5-cross-browser-and-ci-design.md` (Phase A.5 spec — sections 2, 3 contain source material)
- `docs/superpowers/specs/2026-05-10-phase-b1-documentation-layer-design.md` (this phase's spec — file scope and decision log)

**Platform note:** Commands use cross-platform syntax. PowerShell on Windows; `git` and `npm` work identically.

---

## Pre-flight: Create feature branch + verify baseline

- [ ] **Step 1: Create and switch to feature branch**

Run:

```
git checkout -b phase-b1-docs
```

Expected: `Switched to a new branch 'phase-b1-docs'`

- [ ] **Step 2: Verify clean baseline**

Run: `npm run typecheck && npm run lint && npm run format:check`
Expected: all exit 0.

Run: `npm test`
Expected: 62 tests pass (Phase A.5 baseline).

If anything fails: STOP and report — main is not actually green.

---

## Task 1: README.md

**Files:** Create `README.md` at repo root.

- [ ] **Step 1: Create the file with the EXACT content below**

````markdown
# Playwright IA Automation Framework — saucedemo

[![Playwright Tests](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml/badge.svg)](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml)

A Playwright + TypeScript test automation framework targeting [https://www.saucedemo.com](https://www.saucedemo.com), designed for AI-assisted extension. Code-first, AI-assisted: tests run as fast deterministic Playwright code; AI agents extend the suite by reading tickets and authoring PRs.

## Prerequisites

- Node.js 22.x or newer
- `git`
- ~600 MB free disk space for Playwright browsers

## Quick start

```bash
git clone https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo.git
cd playwright-ia-automation-framework-saucedemo
npm install
npx playwright install chromium firefox webkit
cp .env.example .env
npm test
```

Expected: 62 test instances pass across 9 Playwright projects (~1 minute on a warm cache).

## npm scripts

| Script                  | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm test`              | Run the full matrix (all 9 projects, 62 instances)      |
| `npm run test:standard` | Run only the standard chromium project (fast iteration) |
| `npm run test:no-auth`  | Run only login tests (no storageState)                  |
| `npm run test:problem`  | Run only the `problem_user` project                     |
| `npm run test:firefox`  | Run only the `firefox-standard` project                 |
| `npm run test:webkit`   | Run only the `webkit-standard` project                  |
| `npm run test:debug`    | Standard project with `--debug` (Playwright Inspector)  |
| `npm run test:ui`       | Open Playwright UI mode                                 |
| `npm run test:headed`   | Standard project in headed mode                         |
| `npm run report`        | Open the HTML report from the last run                  |
| `npm run codegen`       | Open Playwright codegen against saucedemo               |
| `npm run typecheck`     | TypeScript strict typecheck (no emit)                   |
| `npm run lint`          | ESLint v9 flat config                                   |
| `npm run format`        | Prettier write                                          |
| `npm run format:check`  | Prettier check (used by CI)                             |

## Project structure

```
.
├── src/
│   ├── pages/        # Page objects (LoginPage, InventoryPage, CartPage, checkout/*)
│   ├── components/   # Reusable UI components (Header, ProductCard, CartBadge, SortDropdown)
│   ├── fixtures/     # Playwright test fixture (page injection)
│   └── utils/        # env config + logger
├── data/             # Test data — typed loaders import JSON via `@data/*` alias
│   ├── shared/       # Reference data (products.json)
│   └── scenarios/    # Parameterized test scenarios (sort/, checkout/)
├── tests/            # Spec files (one folder per feature) + auth.setup.ts
├── auth/             # Generated storageState files (git-ignored; .gitkeep tracked)
├── docs/             # Documentation
└── .github/workflows/test.yml   # GitHub Actions CI
```

## Documentation

| File                                           | Purpose                                             |
| ---------------------------------------------- | --------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                       | AI rules — auto-loaded by Claude Code               |
| [`docs/architecture.md`](docs/architecture.md) | Framework structure, composition rules, conventions |
| [`docs/app/`](docs/app/)                       | About the app under test (saucedemo)                |
| [`docs/adr/`](docs/adr/)                       | Architecture Decision Records (numbered)            |

## Tech stack

Node 22 · Playwright 1.59 · TypeScript 5.9 (strict) · ESLint v9 flat config + `eslint-plugin-playwright` · Prettier 3 · GitHub Actions.
````

- [ ] **Step 2: Verify markdown renders**

Open `README.md` in a markdown preview (VS Code preview, or commit + view on GitHub later). Confirm:

- Title and badge render at the top
- Tables format correctly
- Code blocks have correct fences

If GitHub preview shows the badge as broken: that's expected on a fresh push (badge cache); will resolve after the next CI run.

- [ ] **Step 3: Verify formatting passes**

Run: `npm run format:check && npm run lint`
Expected: both exit 0.

If `format:check` fails on `README.md`: run `npm run format`, then re-check. Markdown is also Prettier-formatted in this project.

- [ ] **Step 4: Commit**

```
git add README.md
git commit -m "docs: add README with quick start, scripts, structure, and docs map"
```

---

## Task 2: CLAUDE.md

**Files:** Create `CLAUDE.md` at repo root.

This is the highest-leverage AI file in the project — it's auto-loaded into every Claude Code session. Keep under 150 lines.

- [ ] **Step 1: Create the file with the EXACT content below**

````markdown
# CLAUDE.md — Always-loaded AI rules

This file is loaded into context for every Claude Code session in this project. Keep it under 150 lines. Detailed reference lives in `docs/`.

## Project purpose

Playwright + TypeScript test framework for [saucedemo](https://www.saucedemo.com). AI-assisted extension is a first-class workflow.

- Framework architecture: [`docs/architecture.md`](docs/architecture.md)
- App behavior (the 6 saucedemo users, flows): [`docs/app/`](docs/app/)
- Decision rationale: [`docs/adr/`](docs/adr/)
- Design specs and plans (don't auto-load — read on demand): [`docs/superpowers/`](docs/superpowers/)

## Quick run

```bash
npm test                 # full matrix (9 projects, 62 instances, ~1 min)
npm run test:standard    # standard chromium only (fast local iteration)
npm run test:debug       # Playwright Inspector
npm run test:ui          # Playwright UI mode
```

## Composition rules (must follow)

1. **Component knows about Locators and (optionally) child Components only.** Never about Pages or its parent.
2. **Page composes Components and holds page-unique Locators.** Never composes other Pages.
3. **Pages NEVER return other Pages.** Methods return `void` or data only. Tests use injected page fixtures to navigate explicitly.
4. **Tests know about Pages and Data only.** Never raw Locators or Components directly.
5. **All locator/component fields are `readonly`.** Set in constructor, never reassigned.
6. **Constructor order:** composed Components first → page-direct Locators second.
7. **Action methods read like English.** Tests should be near-prose: `inventoryPage.addProductToCart('X')`.
8. **Queries return data, never `Locator`.** `getProductNames(): string[]`, not `getProductLocators(): Locator[]`.
9. **Components scoped to one of many similar elements take a discriminator** in the constructor (e.g., `new ProductCard(page, productName)`).
10. **Refactor a page-direct locator into a Component the moment a 2nd page needs it.** Don't wait.
11. **Component nesting depth ≤ 2.** Deeper indicates a design problem.
12. **No `await page.waitForTimeout()` ever.** Use Playwright auto-waiting assertions (`expect(...).toBeVisible()` etc.). Enforced by lint.

## Selector preference order

1. `[data-test="..."]` attribute
2. `getByRole(...)` (with anchored regex like `/^Add to cart$/i`)
3. Text matchers
4. CSS selectors (only when nothing above is available)

Never use XPath.

## Tag conventions (Playwright Projects + storageState + role tags)

| Tag                   | Runs on project(s)                                                                | Purpose                                                                                           |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@no-auth`            | `no-auth`                                                                         | Login/logout tests, no pre-existing session                                                       |
| `@all-users`          | All 5 chromium user projects + firefox/webkit                                     | User-agnostic flows                                                                               |
| `@standard`           | `standard`, `firefox-standard`, `webkit-standard`                                 | Tests where only standard user is meaningful                                                      |
| `@problem`            | `problem`                                                                         | Tests that _expect_ the problem user's broken UI                                                  |
| `@performance_glitch` | `performance_glitch`                                                              | Tests that handle slow loads                                                                      |
| `@error`              | `error`                                                                           | Tests for the error user's random failures                                                        |
| `@visual`             | `visual`                                                                          | Visual regression for the visual user                                                             |
| `@sort-functional`    | `standard`, `performance_glitch`, `visual`, `firefox-standard`, `webkit-standard` | Sort tests (excluded from `problem`/`error` — saucedemo breaks the sort dropdown for those users) |

## Where things live

| What                                         | Where                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page objects                                 | `src/pages/` (`LoginPage.ts`, `InventoryPage.ts`, `CartPage.ts`, `checkout/*`)                      |
| Components                                   | `src/components/` (`Header.ts`, `CartBadge.ts`, `ProductCard.ts`, `SortDropdown.ts`)                |
| Fixture (auto-injects pages)                 | `src/fixtures/test.ts` — tests import `test`/`expect` from `@fixtures/test`, NOT `@playwright/test` |
| Test data + types + loaders                  | `data/` (use `@data/*` alias)                                                                       |
| env config                                   | `src/utils/env.ts` (single read point for `process.env`)                                            |
| Specs                                        | `tests/<feature>/*.spec.ts`                                                                         |
| Auth setup (generates storageState per user) | `tests/auth.setup.ts`                                                                               |
| Playwright config (9 projects)               | `playwright.config.ts`                                                                              |

## Path aliases

```ts
'@data/*'       → 'data/*'
'@pages/*'      → 'src/pages/*'
'@components/*' → 'src/components/*'
'@fixtures/*'   → 'src/fixtures/*'
'@utils/*'      → 'src/utils/*'
```

## When extending the framework

- **Adding a test:** put it under `tests/<feature>/*.spec.ts`. Tag it correctly. Use `@fixtures/test` for `test`/`expect`, never `@playwright/test`.
- **Adding a page:** put it under `src/pages/`. Compose any existing Components first. Hold page-unique locators directly.
- **Adding a component:** put it under `src/components/`. Only if reused (or about to be reused) by 2+ pages.
- **Adding test data:** put reference data in `data/shared/`, scenarios in `data/scenarios/<feature>/`. Add a typed loader in `data/fixtures.ts`.
- **Architectural changes:** read `docs/adr/` first; if you need to overturn an ADR, write a superseding one rather than editing the original.

## What to NEVER do

- `await page.waitForTimeout()` — lint blocks; use auto-waiting assertions
- Make a Page method return another Page (we explicitly rejected fluent navigation — see ADR-0001)
- Import a Page from another Page (no cross-page imports in `src/pages/`)
- Import a raw Locator into a test (tests use Pages and Data only)
- Use XPath
- Add a 15-project per-user-per-browser matrix (smoke pattern is intentional — see ADR-0004)
````

- [ ] **Step 2: Verify under 150 lines**

Run: `wc -l CLAUDE.md` (or in PowerShell: `(Get-Content CLAUDE.md).Count`)
Expected: **120-145 lines** (the content above is ~135 lines including blank lines).

If over 150 lines after Prettier formatting: trim the "Where things live" or "When extending the framework" sections. The 12 composition rules and tag table are non-negotiable.

- [ ] **Step 3: Verify formatting**

Run: `npm run format:check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with composition rules, tag conventions, and pointers"
```

---

## Task 3: docs/architecture.md

**Files:** Create `docs/architecture.md`.

This is the framework deep-dive. ~250 lines. The implementer derives content from existing specs (NOT making it up).

- [ ] **Step 1: Create `docs/architecture.md` with the structure below**

The file must have these 8 sections in order:

1. **Overview** (~15 lines)
   - One paragraph: what this framework is
   - One paragraph: code-first, AI-assisted positioning (industry-standard 2026 pattern)
   - One paragraph: what AI workflow this enables (Phase C+)

2. **Tech stack** (~15 lines)
   - Bullet list with full versions and roles. Source: Phase A spec §1 + Phase A.5 spec §1.

3. **Folder structure** (~50 lines)
   - The full file tree (mirror Phase A spec §3 verbatim — that tree is authoritative)
   - For each top-level directory (`src/`, `data/`, `tests/`, `auth/`, `docs/`), one paragraph explaining what lives there and why

4. **Composition rules** (~40 lines)
   - The 12 rules from Phase A spec §4 in full prose form (not just the bullet from CLAUDE.md)
   - For each rule, add 1-2 sentences of "why this rule exists" or a tiny example
   - Cross-link to ADR-0001 for the POM-by-component decision

5. **Data layer** (~30 lines)
   - Hybrid `shared/` + `scenarios/` layout
   - Typed loaders convention (`load<Subject>(): <Subject>[]`)
   - The `getProductById` helper
   - The `with { type: 'json' }` import attributes (cross-link to ADR-0005)
   - Source: Phase A spec §6, Phase A.5 spec §3

6. **Multi-user infrastructure** (~40 lines)
   - Auth setup file generating storageState (5 users; locked_out_user excluded)
   - 9 Playwright projects (`setup`, `no-auth`, 5 chromium users, firefox-standard, webkit-standard)
   - Tag conventions table (mirror CLAUDE.md table)
   - Cross-browser smoke pattern explanation (cross-link to ADR-0004)
   - `@sort-functional` tag and why some users are excluded
   - Source: Phase A spec §5, Phase A.5 spec §3

7. **CI workflow overview** (~25 lines)
   - GitHub Actions, single job, `ubuntu-latest`
   - Triggers: push to main + pull_request to main
   - Caching strategy: npm + Playwright browsers
   - Concurrency block (cancels stacked runs)
   - HTML report artifact on failure
   - Source: Phase A.5 spec §3 (workflow YAML)

8. **Where to find more** (~15 lines)
   - Pointer table:
     - For decision rationale → `docs/adr/`
     - For app behavior → `docs/app/`
     - For design specs → `docs/superpowers/specs/`
     - For implementation history → `docs/superpowers/plans/` and `git log`
     - For AI rules → `CLAUDE.md`

Use Markdown headings (`##` for the 8 sections, `###` for sub-sections within), tables where the spec used tables, fenced code blocks for the folder tree.

- [ ] **Step 2: Verify content matches sources**

Cross-check that:

- The 12 composition rules in §4 match Phase A spec §4 exactly (same wording)
- The 9 Playwright projects in §6 match `playwright.config.ts` (read the actual file to confirm names)
- The tag table in §6 matches CLAUDE.md table you just wrote
- ADR cross-links use the correct numbers (0001 for POM, 0004 for cross-browser, 0005 for ESM imports)

- [ ] **Step 3: Verify formatting**

Run: `npm run format:check && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```
git add docs/architecture.md
git commit -m "docs: add architecture.md covering structure, rules, data, multi-user, CI"
```

---

## Task 4: docs/app/ — overview, users, flows

**Files:** Create three files in `docs/app/`:

- `docs/app/overview.md` (~40 lines)
- `docs/app/users.md` (~80 lines)
- `docs/app/flows.md` (~150 lines)

(`docs/app/glossary.md` is a placeholder — Task 6.)

- [ ] **Step 1: Create the directory**

PowerShell: `New-Item -ItemType Directory -Force -Path docs/app | Out-Null`
(Or `mkdir -p docs/app` on POSIX shells.)

- [ ] **Step 2: Create `docs/app/overview.md` with the EXACT content below**

```markdown
# Saucedemo — Overview

[Saucedemo](https://www.saucedemo.com) is a public e-commerce demo application provided by Sauce Labs. It is intentionally seeded with bugs across multiple user accounts so that test automation tools and developers can exercise their tooling against realistic-but-controlled failures.

## Why this framework targets it

- **Public and free.** No sign-up, no credentials beyond the published demo password.
- **Stable URL and behavior.** The app rarely changes; tests written against it stay green for years.
- **Deliberate bugs.** Six user accounts each surface different problems — broken images, slow page loads, broken sort dropdowns, validation quirks. Perfect for proving a test framework catches what it should and ignores what it should ignore.
- **Well-known among QA engineers.** Onboarding new contributors (or AI agents) is fast because the app is widely documented.

## Base URL

`https://www.saucedemo.com`

Override locally via `SAUCEDEMO_BASE_URL` in `.env`. Default is set in `playwright.config.ts`.

## Public credentials

The username for each user is documented in [`users.md`](users.md). The password is the same for all users and is the published value `secret_sauce`.

Although `secret_sauce` is public, this framework treats it as a secret in `.env` (loaded via `src/utils/env.ts`). This is intentional — it sets the right pattern for future projects that test apps with real credentials.

## See also

- [`users.md`](users.md) — the 6 user accounts and their per-user behaviors
- [`flows.md`](flows.md) — login, browse, sort, cart, and checkout user journeys
- [`../architecture.md`](../architecture.md) — how this framework is organized
```

- [ ] **Step 3: Create `docs/app/users.md` with the EXACT content below**

```markdown
# Saucedemo — Users

Saucedemo provides 6 user accounts. The password is the same for all (`secret_sauce`, also documented in [`overview.md`](overview.md)). Each user surfaces a different intentional behavior, and each maps to a Playwright project in `playwright.config.ts`.

## Summary

| Username                  | Project(s)                                           | Intent                                                      |
| ------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `standard_user`           | `standard`, `firefox-standard`, `webkit-standard`    | Happy path — everything works                               |
| `locked_out_user`         | `no-auth` (login test only — no storageState exists) | Login fails with a lockout error                            |
| `problem_user`            | `problem`                                            | Wrong product images; broken sort dropdown                  |
| `performance_glitch_user` | `performance_glitch`                                 | ~10s artificial delay on every navigation                   |
| `error_user`              | `error`                                              | Broken sort dropdown (same as problem); intermittent errors |
| `visual_user`             | `visual`                                             | Intentional visual regressions (font sizes, colors)         |

## Per-user details

### `standard_user`

- **Behavior:** Fully functional. Sort works. Cart add/remove works. Checkout flow works.
- **Used by:** `standard` chromium project, `firefox-standard`, `webkit-standard`.
- **Test scope:** Default user for happy-path tests. Cross-browser smoke runs against this user only.

### `locked_out_user`

- **Behavior:** Login fails. Saucedemo returns the error: _"Epic sadface: Sorry, this user has been locked out."_
- **Used by:** Login spec only (`tests/login/login.spec.ts`, tagged `@no-auth`).
- **Why no storageState:** Authentication never succeeds, so there is no session to save. This user is the only reason the `no-auth` Playwright project exists.

### `problem_user`

- **Behavior:** Two known intentional bugs:
  1. **Wrong product images** — every product on the inventory page renders the same broken-image asset, regardless of which product it is. Captured by `tests/visual/inventory-images.spec.ts`.
  2. **Broken sort dropdown** — selecting any sort option (Z→A, low→high, high→low) leaves the inventory in default A→Z order. The sort dropdown UI accepts the click but does not re-order. This is why `@sort-functional` excludes `problem_user`.
- **Used by:** `problem` chromium project.

### `performance_glitch_user`

- **Behavior:** Artificially slow. Each page navigation takes ~10 seconds (saucedemo injects a deliberate delay). Functionality is otherwise correct.
- **Used by:** `performance_glitch` chromium project.
- **Special config:** `playwright.config.ts` gives this project a `navigationTimeout: 30_000` override (the global default is 15s, which would flake under load).

### `error_user`

- **Behavior:** Same broken sort dropdown as `problem_user`. Some intermittent UI errors. Functional flows (cart, checkout) work.
- **Used by:** `error` chromium project.
- **Excluded from:** `@sort-functional` tests (sort doesn't work for this user).

### `visual_user`

- **Behavior:** Intentional visual regressions — font sizes wrong, button colors off. Functional flows are correct.
- **Used by:** `visual` chromium project.
- **Test scope:** Cart, browse, sort tests pass functionally; visual differences would be caught by visual regression tests (Phase D).

## Tag mapping

For the per-tag → per-project mapping, see [`CLAUDE.md`](../../CLAUDE.md) (section "Tag conventions").
```

- [ ] **Step 4: Create `docs/app/flows.md` with the EXACT content below**

```markdown
# Saucedemo — User Flows

Step-by-step descriptions of the user journeys this framework tests. Each flow lists the URL paths, the key UI elements (with their `data-test` attributes), and which user accounts exhibit special behavior.

For per-user behavioral details see [`users.md`](users.md).
For framework-level page object structure see [`../architecture.md`](../architecture.md).

---

## 1. Login flow

**Entry URL:** `/`

**Page object:** `src/pages/LoginPage.ts`

**Key elements:**

| Element               | Selector                                                                     |
| --------------------- | ---------------------------------------------------------------------------- |
| Username input        | `[data-test="username"]`                                                     |
| Password input        | `[data-test="password"]`                                                     |
| Login button          | `[data-test="login-button"]`                                                 |
| Error banner (if any) | `[data-test="error"]`                                                        |
| Error close button    | `.error-button` (only non-data-test selector — saucedemo doesn't expose one) |

**Steps:**

1. Navigate to `/`
2. Fill `[data-test="username"]` with the user's username (e.g., `standard_user`)
3. Fill `[data-test="password"]` with `secret_sauce`
4. Click `[data-test="login-button"]`
5. **On success:** browser navigates to `/inventory.html`
6. **On failure:** error banner appears in `[data-test="error"]` with text like:
   - `locked_out_user`: _"Epic sadface: Sorry, this user has been locked out."_
   - Wrong password: _"Epic sadface: Username and password do not match any user in this service"_

**Tests:** `tests/login/login.spec.ts` (3 tests, tagged `@no-auth`).

---

## 2. Browse inventory

**Entry URL:** `/inventory.html` (after login or with valid storageState)

**Page object:** `src/pages/InventoryPage.ts`
**Composes components:** `Header`, `SortDropdown`, `ProductCard` (one per product)

**Key elements:**

| Element                  | Selector                                                                |
| ------------------------ | ----------------------------------------------------------------------- |
| Page title               | `[data-test="title"]` (text: `"Products"`)                              |
| Inventory grid container | `[data-test="inventory-list"]`                                          |
| Each product card        | `[data-test="inventory-item"]`                                          |
| Product name             | `[data-test="inventory-item-name"]` (under each item)                   |
| Product price            | `[data-test="inventory-item-price"]` (under each item)                  |
| Product description      | `[data-test="inventory-item-desc"]`                                     |
| Add-to-cart button       | role=button, name=`/^Add to cart$/i` (under each item)                  |
| Remove button            | role=button, name=`/^Remove$/i` (under each item)                       |
| Product image            | `img.inventory_item_img` (under each item, CSS selector — no data-test) |

**The 6 products** (full reference data in `data/shared/products.json`):

| Name                              | Price  |
| --------------------------------- | ------ |
| Sauce Labs Backpack               | $29.99 |
| Sauce Labs Bike Light             | $9.99  |
| Sauce Labs Bolt T-Shirt           | $15.99 |
| Sauce Labs Fleece Jacket          | $49.99 |
| Sauce Labs Onesie                 | $7.99  |
| Test.allTheThings() T-Shirt (Red) | $15.99 |

**Per-user notes:** `problem_user` shows the same broken image asset for every product. Functionality (add to cart, sort, etc.) is unaffected by image source.

**Tests:** `tests/inventory/browse.spec.ts` (1 test, tagged `@all-users`).

---

## 3. Sort

**Where:** Sort dropdown on the inventory page.

**Component:** `src/components/SortDropdown.ts`

**Selector:** `[data-test="product-sort-container"]` (a native `<select>`)

**Options:**

| Label               | Value  | Expected first product            | Expected last product             |
| ------------------- | ------ | --------------------------------- | --------------------------------- |
| Name (A to Z)       | `az`   | Sauce Labs Backpack               | Test.allTheThings() T-Shirt (Red) |
| Name (Z to A)       | `za`   | Test.allTheThings() T-Shirt (Red) | Sauce Labs Backpack               |
| Price (low to high) | `lohi` | Sauce Labs Onesie                 | Sauce Labs Fleece Jacket          |
| Price (high to low) | `hilo` | Sauce Labs Fleece Jacket          | Sauce Labs Onesie                 |

**Per-user notes:** `problem_user` and `error_user` ignore the sort dropdown — selections register on the UI but the inventory stays in default A→Z order. This is why the `@sort-functional` tag exists: sort tests run only on `standard`, `performance_glitch`, `visual`, `firefox-standard`, `webkit-standard`.

**Tests:** `tests/inventory/sort.spec.ts` (4 parameterized tests, tagged `@sort-functional`).

---

## 4. Cart add/remove

**Where:** Cart badge in header (counter) + cart page.

**Components:** `Header.cartBadge` (`CartBadge`); `Header.openCart()` navigates to cart.
**Page:** `src/pages/CartPage.ts`

**Cart badge:**

| Element          | Selector                                                          |
| ---------------- | ----------------------------------------------------------------- |
| Badge with count | `[data-test="shopping-cart-badge"]` (only present when count > 0) |
| Cart icon link   | `[data-test="shopping-cart-link"]`                                |

**Cart page (`/cart.html`):**

| Element                  | Selector                                         |
| ------------------------ | ------------------------------------------------ |
| Page title               | `[data-test="title"]` (text: `"Your Cart"`)      |
| Cart list container      | `[data-test="cart-list"]`                        |
| Each item                | `[data-test="inventory-item"]` (under cart-list) |
| Item name                | `[data-test="inventory-item-name"]`              |
| Continue shopping button | `[data-test="continue-shopping"]`                |
| Checkout button          | `[data-test="checkout"]`                         |

**Steps (add):**

1. From `/inventory.html`, click an `Add to cart` button on a product card
2. Cart badge in header increments
3. Navigate to `/cart.html` (click cart icon)
4. The added product appears in `[data-test="cart-list"]`

**Steps (remove):**

1. On `/cart.html`, click `Remove` on a cart row
2. Item disappears from cart list
3. Cart badge decrements (and disappears entirely if count drops to 0)

**Tests:** `tests/cart/add-remove.spec.ts` (2 tests, tagged `@all-users`).

---

## 5. Checkout — 3-step flow

The checkout has three sequential pages:

### Step A — Checkout: Your Information (`/checkout-step-one.html`)

**Page object:** `src/pages/checkout/CheckoutInfoPage.ts`

| Element                 | Selector                                                     |
| ----------------------- | ------------------------------------------------------------ |
| Page title              | `[data-test="title"]` (text: `"Checkout: Your Information"`) |
| First name              | `[data-test="firstName"]`                                    |
| Last name               | `[data-test="lastName"]`                                     |
| Postal code             | `[data-test="postalCode"]`                                   |
| Continue button         | `[data-test="continue"]`                                     |
| Cancel button           | `[data-test="cancel"]`                                       |
| Validation error banner | `[data-test="error"]`                                        |

**Validation:** All three fields required; clicking Continue with any empty triggers an error like `"Error: Postal Code is required"` or `"Error: First Name is required"`.

### Step B — Checkout: Overview (`/checkout-step-two.html`)

**Page object:** `src/pages/checkout/CheckoutOverviewPage.ts`

| Element        | Selector                                                       |
| -------------- | -------------------------------------------------------------- |
| Page title     | `[data-test="title"]` (text: `"Checkout: Overview"`)           |
| Item list      | `[data-test="cart-list"]`                                      |
| Subtotal label | `[data-test="subtotal-label"]` (format: `"Item total: $X.YZ"`) |
| Tax label      | `[data-test="tax-label"]`                                      |
| Total label    | `[data-test="total-label"]`                                    |
| Finish button  | `[data-test="finish"]`                                         |
| Cancel button  | `[data-test="cancel"]`                                         |

**Subtotal parsing:** `getSubtotal()` and `getTotal()` use the regex `/\$([\d.]+)/` to extract the numeric value. They throw on parse failure (loud-fail, not silent-zero).

### Step C — Checkout: Complete (`/checkout-complete.html`)

**Page object:** `src/pages/checkout/CheckoutCompletePage.ts`

| Element            | Selector                                                              |
| ------------------ | --------------------------------------------------------------------- |
| Page title         | `[data-test="title"]` (text: `"Checkout: Complete!"`)                 |
| Thank-you header   | `[data-test="complete-header"]` (text: `"Thank you for your order!"`) |
| Body text          | `[data-test="complete-text"]`                                         |
| Pony express image | `[data-test="pony-express"]`                                          |
| Back home button   | `[data-test="back-to-products"]`                                      |

**Tests:**

- `tests/checkout/happy-path.spec.ts` — 2 parameterized scenarios from `data/scenarios/checkout/valid-checkout.json`, tagged `@standard`
- `tests/checkout/validation.spec.ts` — 2 parameterized scenarios from `data/scenarios/checkout/invalid-postalcode.json`, tagged `@standard`

---

## 6. Logout

**Where:** Hamburger menu in the header.

**Component:** `src/components/Header.ts`

| Element                   | Selector                                                                     |
| ------------------------- | ---------------------------------------------------------------------------- |
| Menu toggle button        | `#react-burger-menu-btn` (CSS — no data-test on this React-internal element) |
| Logout link               | `#logout_sidebar_link`                                                       |
| App logo (always visible) | `.app_logo`                                                                  |

**Steps:**

1. Click `#react-burger-menu-btn` to open the side menu
2. Click `#logout_sidebar_link`
3. Browser returns to `/` (login page)

**Tests:** Not currently exercised (no `@logout` test exists in Phase A.5; the framework supports it via `header.logout()` but no spec uses it yet).
```

- [ ] **Step 5: Verify all 3 files render correctly + format/lint pass**

```
npm run format:check
npm run lint
```

If `format:check` fails on any of the new files: run `npm run format`, then re-check.

- [ ] **Step 6: Commit**

```
git add docs/app/
git commit -m "docs(app): add overview, users, and flows for saucedemo"
```

---

## Task 5: docs/adr/ — template + 5 starter ADRs

**Files:** Create six files in `docs/adr/`:

- `0000-template.md`
- `0001-pom-by-component.md`
- `0002-multi-user-via-projects-storage-state.md`
- `0003-data-hybrid-shared-scenarios.md`
- `0004-cross-browser-smoke-pattern.md`
- `0005-esm-import-attributes-for-json.md`

- [ ] **Step 1: Create the directory**

PowerShell: `New-Item -ItemType Directory -Force -Path docs/adr | Out-Null`

- [ ] **Step 2: Create `docs/adr/0000-template.md` with the EXACT content below**

```markdown
# NNNN — <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNNN

## Context

What's the situation that requires a decision? What forces are at play? Stay short — 2-4 sentences.

## Decision

What's the decision? State it clearly in 1-3 sentences.

## Consequences

What happens because of this decision? Both positive and negative. Bullet list.

## Alternatives considered

What other options were evaluated? Why were they rejected? Bullet list with brief rationale per alternative.

---

**Template usage:**

- Copy this file to `NNNN-<kebab-case-title>.md` where NNNN is the next sequential number
- Replace title, date, status, and content sections
- Keep status `Proposed` until merged, then update to `Accepted`
- If a future ADR overturns this one, change status to `Superseded by ADR-XXXX` (don't delete)
- Keep ADRs short — under 80 lines is the goal
```

- [ ] **Step 3: Create `docs/adr/0001-pom-by-component.md`**

Source: Phase A spec §2 decision #2 + §4 composition rules. Use this exact content:

```markdown
# 0001 — Page Object Model by Component

**Date:** 2026-05-09
**Status:** Accepted

## Context

The framework needs a structural pattern for organizing page interactions. Three industry patterns exist, each with trade-offs for AI code generation, reuse, and complexity:

- Flat POM (one class per page, no separation)
- Page-with-Components (pages compose reusable components)
- Component-tree (everything is a component, no pages)

We needed to pick one for the framework's lifetime. AI-extension friendliness was a primary criterion.

## Decision

**Page composes Components.** Pages orchestrate the user journey on a single URL/route. Components encapsulate reusable UI building blocks (header, product card, sort dropdown). Pages may also hold page-unique locators directly (when the UI isn't reused). Components may compose other components, but nesting is capped at depth 2.

**Pages NEVER return other Pages.** Navigation methods return `void` or data; tests use injected page fixtures to navigate explicitly.

**Components NEVER know about parents.** A component must be context-free — it knows about its own locators (and optionally child components), nothing else.

## Consequences

- Best AI code-gen results because the boundaries are explicit and predictable
- Tests stay close to natural language: `inventoryPage.addProductToCart('X')`
- Components are independently testable and reusable across pages
- A new page that needs the same UI as another page should NOT duplicate locators — refactor into a Component first
- Page files stay small (one URL/route worth of logic)
- Test files become very short (no construction boilerplate; fixtures inject pages)
- The strict "no fluent navigation" rule means tests are explicit about which page they're on at any moment

## Alternatives considered

- **Flat POM** — rejected: leads to duplication once the app grows; no clear pattern for shared UI
- **Component-tree (no pages)** — rejected: elegant but harder for AI to extend without coupling components together; navigation becomes implicit
- **Fluent navigation (Pages return Pages)** — rejected: tests become harder to read for AI; chained returns mask navigation intent; cross-page imports leak between page files
```

- [ ] **Step 4: Create `docs/adr/0002-multi-user-via-projects-storage-state.md`**

Source: Phase A spec §2 decision #7 + §5. Use this exact content:

```markdown
# 0002 — Multi-User via Playwright Projects + storageState + Role Tags

**Date:** 2026-05-09
**Status:** Accepted

## Context

Saucedemo provides 6 user accounts, each with different intentional behaviors. Tests need to:

- Run the same test against multiple users (e.g., "browse inventory" on all 5 authenticated users)
- Pin certain tests to specific users (e.g., "broken images" only makes sense on `problem_user`)
- Run login tests with no pre-existing session
- Be fast (auth-once, reuse session for the rest of the run)

Three approaches were evaluated.

## Decision

**Use Playwright Projects + `storageState` + role tags.**

- A `setup` project (`tests/auth.setup.ts`) logs in 5 users at the start of each run and saves session state to `auth/<user>.json` (gitignored)
- Each authenticated user has its own Playwright project (`standard`, `problem`, `performance_glitch`, `error`, `visual`) that loads its `storageState`
- A `no-auth` project handles login tests (no storageState; runs `locked_out_user` test and login error tests)
- Role tags (`@no-auth`, `@all-users`, `@standard`, `@problem`, etc.) declare which projects a test runs on; each project's `grep` regex selects matching tests
- `locked_out_user` is excluded from setup (login fails — no session to save)

## Consequences

- Tests authenticate once per run (5 logins total), not once per test (would be 100+ logins)
- Full multi-user matrix runs in CI by default; per-project filtering for local iteration
- Adding a new user = add a row to the setup users list + add a project to `playwright.config.ts`
- Adding a new tag = update the project's `grep` regex
- Tests must be tagged correctly or they won't run on the right project
- The `auth/` directory must be git-ignored (sessions are local, expire, and contain auth tokens)

## Alternatives considered

- **Custom `--runAs <user>` CLI flag** — rejected: the `--project` flag in Playwright already does this natively; a custom flag would duplicate Playwright's mechanism with worse IDE/UI integration
- **Per-test `test.use({ storageState })` annotations** — rejected: every test would need an annotation; high duplication; no good way to filter by user from the CLI
- **Login per test (no storageState)** — rejected: 5-10x slower; would dominate test runtime
```

- [ ] **Step 5: Create `docs/adr/0003-data-hybrid-shared-scenarios.md`**

Source: Phase A spec §2 decision #10 + §6. Use this exact content:

```markdown
# 0003 — Hybrid Data Layout (`shared/` + `scenarios/`) with Typed Loaders

**Date:** 2026-05-09
**Status:** Accepted

## Context

Test data needs structure that supports two distinct purposes:

- **Reference data** that many tests read (the 6 products and their prices)
- **Scenario data** that drives parameterized tests (lists of valid/invalid checkout inputs)

Three layout patterns were evaluated. The decision shapes where AI agents put new data, so it needs to be predictable and scale to many features.

## Decision

**Hybrid layout: `data/shared/` for reference, `data/scenarios/<feature>/` for parameterized inputs.**

- Reference data: `data/shared/products.json` (and future siblings)
- Scenario data: `data/scenarios/<feature>/<scenario-set>.json` (e.g., `checkout/valid-checkout.json`)
- Type definitions: `data/types.ts` (one source of truth for shapes)
- Typed loaders: `data/fixtures.ts` exports one loader per JSON source (`load<Subject>(): <Subject>[]`)
- A `getProductById(id: string): Product` helper provides fail-fast lookup

Tests import via the `@data/*` path alias. JSON imports use ESM import attributes (see ADR-0005).

## Consequences

- Adding a new feature's parameterized data = `mkdir data/scenarios/<feature>/` + JSON file + add a `load<Feature>()` loader
- Adding a new shared dataset = JSON file in `data/shared/` + a loader
- Tests don't see raw JSON paths — they import typed loaders, getting full IntelliSense and compile-time safety
- The `as <Type>[]` casts in `fixtures.ts` are intentional (JSON imports come in with wider types); spec accepts this
- A future migration to runtime validation (Zod, etc.) would only need to wrap the existing loaders
- AI agents follow the `load<Subject>(): <Subject>[]` naming convention by example

## Alternatives considered

- **Flat `data/` with all files at the same level** — rejected: doesn't scale past 5-10 files; no obvious place for parameterized inputs
- **Mirror the POM (`data/pages/<PageName>.data.json`)** — rejected: tightly couples data to pages; bad for shared data (e.g., products used on inventory + cart + checkout)
- **Per-test fixtures (`<test-name>.data.json` next to each spec)** — rejected: duplication of shared data; no way to share scenarios across tests
```

- [ ] **Step 6: Create `docs/adr/0004-cross-browser-smoke-pattern.md`**

Source: Phase A.5 spec §2 decision #1 + §3. Use this exact content:

```markdown
# 0004 — Cross-Browser Smoke Pattern (firefox + webkit on standard user only)

**Date:** 2026-05-10
**Status:** Accepted

## Context

The framework targets a multi-browser future, but a naive expansion of "every user × every browser" yields 5 × 3 = 15 Playwright projects. Most browser-specific bugs live in the framework's interaction code (locator strategies, keyboard/mouse simulation), NOT in saucedemo's per-user behaviors (those bugs are saucedemo's, not the browser's).

We needed a cross-browser strategy that catches real engine differences without paying for redundant coverage.

## Decision

**Smoke pattern.** chromium runs the full 5-user matrix as before. Add two new projects: `firefox-standard` and `webkit-standard`, both running ONLY the standard user's tests (the same grep as the chromium standard project).

Total: 7 chromium projects (`setup`, `no-auth`, 5 users) + 2 cross-browser smoke projects = **9 projects, 62 test instances**.

## Consequences

- Real browser engine differences (locator behavior, navigation timing, form interaction) are caught without re-running saucedemo's per-user bugs three times
- CI time stays reasonable (~3-5 min) instead of tripling
- Adding a new browser = add 1 new `<browser>-standard` project, not N×B
- A future "deeper cross-browser coverage" decision (e.g., cross-browser checkout regression) is additive — pin specific tests with new tags
- An AI agent that proposes "add `firefox-problem` and `webkit-error`" should be redirected to this ADR — those projects re-validate broken-by-design saucedemo behavior

## Alternatives considered

- **Full per-user × per-browser matrix (15 projects)** — rejected: 90%+ of those runs verify the same things; CI time triples for marginal coverage
- **Cross-browser only on a tiny `@smoke` tag (3-4 tests)** — rejected: smaller smoke set, less confidence; the standard-user grep already gives a balanced subset
- **No cross-browser** — rejected: leaves real engine differences uncaught until they manifest as production user reports
```

- [ ] **Step 7: Create `docs/adr/0005-esm-import-attributes-for-json.md`**

Source: Phase A.5 spec §2 decision #8 + §6 outcome. Use this exact content:

````markdown
# 0005 — ESM Import Attributes for JSON

**Date:** 2026-05-10
**Status:** Accepted

## Context

`data/fixtures.ts` loads JSON files (`products.json`, scenario files). With `"type": "module"` in `package.json` and Node 22, native `import x from './x.json'` was not supported in earlier Node versions, requiring a CommonJS escape hatch via `createRequire(import.meta.url)`. This worked but mixed two module systems in one ESM file — a convention-drift trap for AI agents extending `data/fixtures.ts` in Phase C.

Node 22.13 and TypeScript 5.7+ added official support for ESM **import attributes** (`with { type: 'json' }`), which eliminate the need for the workaround.

## Decision

**Use ESM import attributes for all JSON imports in `data/fixtures.ts`:**

```ts
import productsJson from './shared/products.json' with { type: 'json' };
```

Replace the `createRequire` workaround entirely. Remove all CommonJS-style imports from this file.

## Consequences

- Single idiomatic pattern for AI agents to follow when adding new loaders
- File reads cleanly as ESM with no escape hatches
- Native browser/runtime support; no transpilation tricks
- Locks the framework to Node 22.13+ (already our baseline)
- Locks the framework to TypeScript 5.7+ (already our baseline at 5.9)
- If a future toolchain regression breaks the syntax, fallback is a single-file revert to `createRequire` (documented in Phase A.5 spec §6)

## Alternatives considered

- **Keep `createRequire` workaround** — rejected: convention-drift trap for AI agents; mixes module systems; the syntax was always intended as a temporary bridge
- **Switch `package.json` to `"type": "commonjs"`** — rejected: gives up ESM benefits; deviates from modern TypeScript defaults
- **Run a JSON-loading helper that reads file contents and parses at runtime** — rejected: loses type-checking via `resolveJsonModule`; adds I/O at every loader call
````

- [ ] **Step 8: Verify formatting**

Run: `npm run format:check && npm run lint`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```
git add docs/adr/
git commit -m "docs(adr): add Nygard template and 5 starter ADRs

- 0000 template
- 0001 POM by component
- 0002 multi-user via Projects + storageState + role tags
- 0003 hybrid data layout (shared + scenarios)
- 0004 cross-browser smoke pattern
- 0005 ESM import attributes for JSON"
```

---

## Task 6: 3 placeholder files

**Files:** Create three files with the standard placeholder comment block from spec §5:

- `CONTRIBUTING.md`
- `docs/runbook.md`
- `docs/app/glossary.md`

- [ ] **Step 1: Create `CONTRIBUTING.md` with the EXACT content below**

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: Solo project; no external contributors yet. AI-side
guidance lives in CLAUDE.md.

When to fill in: First external contributor, or when the project
formalizes a PR/code-review process beyond the current AI workflow.

Until then: Humans see README.md for setup; AI agents follow CLAUDE.md.
-->

# Contributing

(Placeholder — see comment above.)
```

- [ ] **Step 2: Create `docs/runbook.md` with the EXACT content below**

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: No incidents to document yet. Runbook content emerges
naturally from real failures.

When to fill in: First persistent flaky test, first CI incident, first
"why does this only fail in webkit?" mystery.

Until then: Use `npm run test:debug`, `npm run test:ui`, and the HTML
report (`npm run report`) for debugging. Inspect Playwright traces in
`test-results/`.
-->

# Runbook

(Placeholder — see comment above.)
```

- [ ] **Step 3: Create `docs/app/glossary.md` with the EXACT content below**

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: Saucedemo's domain is small (~10-15 terms total). A
glossary becomes valuable once the term count exceeds ~50 and AI
starts confusing similar concepts (e.g., "cart" vs "basket" vs "bag").

When to fill in: When the framework starts testing apps with rich
business domains, or when AI agents repeatedly use the wrong term in
generated tests.

Until then: Term meanings are clear from `users.md`, `flows.md`, and
the saucedemo UI itself.
-->

# Glossary

(Placeholder — see comment above.)
```

- [ ] **Step 4: Verify formatting**

Run: `npm run format:check && npm run lint`
Expected: both exit 0.

- [ ] **Step 5: Commit**

```
git add CONTRIBUTING.md docs/runbook.md docs/app/glossary.md
git commit -m "docs: add 3 placeholder files (CONTRIBUTING, runbook, glossary) with deferred-comment blocks"
```

---

## Task 7: Final Definition-of-Done verification + tag

**Files:** None modified — verification only.

- [ ] **Step 1: Confirm all 15 files exist**

PowerShell:

```powershell
$expected = @(
  'README.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'docs/architecture.md',
  'docs/runbook.md',
  'docs/app/overview.md',
  'docs/app/users.md',
  'docs/app/flows.md',
  'docs/app/glossary.md',
  'docs/adr/0000-template.md',
  'docs/adr/0001-pom-by-component.md',
  'docs/adr/0002-multi-user-via-projects-storage-state.md',
  'docs/adr/0003-data-hybrid-shared-scenarios.md',
  'docs/adr/0004-cross-browser-smoke-pattern.md',
  'docs/adr/0005-esm-import-attributes-for-json.md'
)
$missing = $expected | Where-Object { -not (Test-Path $_) }
if ($missing) { Write-Host "MISSING:"; $missing } else { Write-Host "All 15 files present." }
```

Expected: `All 15 files present.`

If any are missing: STOP and report which.

- [ ] **Step 2: Confirm CLAUDE.md is under 150 lines**

PowerShell:

```powershell
(Get-Content CLAUDE.md).Count
```

Expected: under 150.

- [ ] **Step 3: Confirm placeholder comment blocks**

For each of the 3 placeholder files (`CONTRIBUTING.md`, `docs/runbook.md`, `docs/app/glossary.md`), confirm the file:

- Starts with `<!--`
- Contains the exact phrase `DEFERRED FROM PHASE B.1.`
- Contains the lines `Status: Placeholder for future content.`, `Why deferred:`, `When to fill in:`, `Until then:`
- Closes the comment with `-->`
- Has a visible body line `(Placeholder — see comment above.)`

PowerShell quick check:

```powershell
Get-Content CONTRIBUTING.md, docs/runbook.md, docs/app/glossary.md | Select-String 'DEFERRED FROM PHASE B.1.'
```

Expected: 3 matches.

- [ ] **Step 4: Confirm typecheck/lint/format/test all green**

```
npm run typecheck
npm run lint
npm run format:check
npm test
```

All exit 0; `npm test` produces 62 passing test instances.

If `npm test` shows fewer than 62: STOP and report — a doc-only phase shouldn't change the test count.

- [ ] **Step 5: Visually inspect markdown rendering**

Open the following in a markdown preview (VS Code preview or push branch and view on GitHub):

- `README.md` — check the CI badge image link, table formatting, code block rendering
- `CLAUDE.md` — check the rules list and tag table render
- `docs/architecture.md` — check section headings and the folder tree fenced block
- `docs/app/users.md` — check the user table renders
- One ADR (e.g., `docs/adr/0001-pom-by-component.md`) — check 4-section structure (Context/Decision/Consequences/Alternatives)
- One placeholder (e.g., `CONTRIBUTING.md`) — confirm the HTML comment doesn't render but the body line does

If any file renders broken: capture which file and what's wrong; report.

- [ ] **Step 6: Tag the milestone**

```
git tag -a phase-b1-complete -m "Phase B.1 complete: documentation layer (README, CLAUDE, /docs structure, ADRs, placeholders)"
```

(Don't push the tag yet — push after the merge step in finishing-a-development-branch.)

---

## Self-review notes (already applied)

The plan was reviewed against the Phase B.1 spec before writing. Coverage check:

| Spec section                                  | Tasks                                                      |
| --------------------------------------------- | ---------------------------------------------------------- |
| §3 file structure (15 files)                  | Tasks 1–6 cover every file                                 |
| §4 file content scope (per-file requirements) | Each task includes the exact content or detailed structure |
| §5 placeholder comment format                 | Task 6 uses the exact template from spec §5                |
| §6 DoD (12 acceptance criteria)               | Task 7 verifies each                                       |
| §7 out of scope                               | Plan contains no MCP, no skills, no auto-update hooks      |

**Source content provenance:**

- Architecture.md: derives from Phase A spec §3, §4 + Phase A.5 spec §3
- ADR-0001: Phase A spec §2 #2 + §4 + #5
- ADR-0002: Phase A spec §2 #7 + §5
- ADR-0003: Phase A spec §2 #10 + §6
- ADR-0004: Phase A.5 spec §2 #1 + §3
- ADR-0005: Phase A.5 spec §2 #8 + §6

**Type/path consistency check:**

- Path aliases match across CLAUDE.md, architecture.md, README.md (no drift)
- Tag conventions match across CLAUDE.md, architecture.md, ADR-0002, users.md
- Project names match across CLAUDE.md, architecture.md, users.md, ADR-0002, ADR-0004
- ADR cross-references are by number (`ADR-0001`) — easy to verify
