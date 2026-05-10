# Phase A.5 — Cross-Browser, CI, and createRequire Cleanup (Design)

**Date:** 2026-05-10
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Scope:** Phase A.5 only — the small bridge between the Phase A framework foundation and the Phase B AI-context layer.

---

## 1. Overview

### Goal

Add the three deferred items from Phase A: cross-browser smoke coverage (firefox + webkit on the standard user), a real GitHub Actions CI workflow on the new `playwright-ia-automation-framework-saucedemo` GitHub repo, and a cleanup of the `createRequire` workaround in `data/fixtures.ts` to native ESM import attributes.

### Why this exists

Three pieces from the Phase A out-of-scope list have become valuable now that the framework is solid:

- Phase B (AI context layer) and Phase C (workflow automation) will eventually push code via PRs. CI must exist to validate those PRs automatically.
- Cross-browser coverage protects against framework-level locator/interaction regressions before AI-extended tests start landing.
- The `createRequire` workaround is a CommonJS escape hatch in an ESM file — a convention-drift trap for AI agents extending `data/fixtures.ts` in Phase C.

### What this is NOT

- Not a per-user × per-browser full matrix (15 projects). Explicitly out of scope.
- Not a custom reporter (Allure, etc.). HTML + JSON + list stays.
- Not branch protection rules — that's a one-time GitHub UI configuration the user does manually after the workflow lands.
- Not visual regression baselines or pre-commit hooks (those are Phase D).

---

## 2. Decision log

| #   | Decision                                                                                                                     | Rationale                                                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Cross-browser scope: smoke pattern** — chromium runs the full 5-user matrix; firefox and webkit run the standard user only | Catches real browser rendering/locator bugs without re-running saucedemo's intentional per-user bugs three times. 62 test instances total vs ~120 for full matrix. |
| 2   | **CI platform: GitHub Actions**                                                                                              | Repo is on GitHub. First-class Playwright integration. Free for public repos.                                                                                      |
| 3   | **CI triggers: `pull_request` to main + `push` to main**                                                                     | Standard pattern. PRs validated; main verified after merge.                                                                                                        |
| 4   | **CI matrix: single job, all 7 projects**                                                                                    | Playwright already parallelizes within a job. Per-browser-job sharding adds setup overhead unjustified at this scale.                                              |
| 5   | **CI caching: npm + Playwright browsers**                                                                                    | Browser downloads dominate cold-cache CI time (~2 min). `~/.cache/ms-playwright` keyed on `package-lock.json`.                                                     |
| 6   | **CI secret: `SAUCEDEMO_PASSWORD`** as GitHub Actions repository secret                                                      | Even though saucedemo's password is public, treat as a secret so the pattern is right for future projects.                                                         |
| 7   | **CI artifacts: HTML report on failure only**                                                                                | Successful runs don't need the artifact; failures do (trace inspection). 7-day retention.                                                                          |
| 8   | **createRequire cleanup: import attributes** (`with { type: 'json' }`)                                                       | Native ESM standard since Node 22.13. TypeScript 5.7 supports it. Resolves the convention-drift trap for AI agents.                                                |
| 9   | **storageState reuse across browsers**                                                                                       | `auth/standard.json` works for chromium, firefox, and webkit (cookies are engine-portable for saucedemo's basic session). No per-browser auth setup needed.        |

---

## 3. Architecture changes

### `playwright.config.ts` — add 2 projects

After the existing `userProjects.map(...)` block, append two new project definitions:

```ts
{
  name: 'firefox-standard',
  testIgnore: /.*\.setup\.ts/,
  grep: /@all-users|@standard|@sort-functional/,
  dependencies: ['setup'],
  use: {
    ...devices['Desktop Firefox'],
    storageState: 'auth/standard.json',
  },
},
{
  name: 'webkit-standard',
  testIgnore: /.*\.setup\.ts/,
  grep: /@all-users|@standard|@sort-functional/,
  dependencies: ['setup'],
  use: {
    ...devices['Desktop Safari'],
    storageState: 'auth/standard.json',
  },
},
```

The grep pattern includes `@sort-functional` because the standard user's sort works. It deliberately excludes `@no-auth` (login tests aren't browser-portable in the same way), `@problem`/`@error`/`@glitch`/`@visual` (those are user-specific bugs, not browser-portable scenarios).

### `package.json` — add 2 scripts

```json
"test:firefox": "playwright test --project=firefox-standard",
"test:webkit":  "playwright test --project=webkit-standard",
```

### `data/fixtures.ts` — replace `createRequire` with import attributes

Current (post-Phase-A):

```ts
// JSON imports use createRequire(import.meta.url) instead of native ESM ...
import { createRequire } from 'module';
import type { Product, CheckoutScenario, SortOption } from './types';

const require = createRequire(import.meta.url);

export const loadProducts = (): Product[] => require('./shared/products.json') as Product[];
// ...
```

Replace with:

```ts
import productsJson from './shared/products.json' with { type: 'json' };
import validCheckoutJson from './scenarios/checkout/valid-checkout.json' with { type: 'json' };
import invalidPostalJson from './scenarios/checkout/invalid-postalcode.json' with { type: 'json' };
import sortOrdersJson from './scenarios/sort/sort-orders.json' with { type: 'json' };
import type { Product, CheckoutScenario, SortOption } from './types';

export const loadProducts = (): Product[] => productsJson as Product[];
export const loadValidCheckouts = (): CheckoutScenario[] => validCheckoutJson as CheckoutScenario[];
export const loadInvalidPostal = (): CheckoutScenario[] => invalidPostalJson as CheckoutScenario[];
export const loadSortOrders = (): SortOption[] => sortOrdersJson as SortOption[];

export const getProductById = (id: string): Product => {
  const product = loadProducts().find((p) => p.id === id);
  if (!product) throw new Error(`Product not found in shared/products.json: ${id}`);
  return product;
};
```

The `getProductById` helper from Phase A is preserved unchanged. The `createRequire` workaround comment is removed entirely (the new code is self-explanatory).

### `.github/workflows/test.yml` — new file

```yaml
name: test
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  playwright:
    name: Playwright matrix
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - run: npx playwright install --with-deps chromium firefox webkit

      - name: Run tests
        env:
          SAUCEDEMO_PASSWORD: ${{ secrets.SAUCEDEMO_PASSWORD }}
          CI: 'true'
        run: npm test

      - name: Upload HTML report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

### Repository setup (one-time, manual)

After the workflow lands, the user (or implementer with user's confirmation) does:

1. `git remote add origin <ssh-or-https-url-for-the-new-repo>`
2. `git push -u origin main`
3. In the GitHub UI: Settings → Secrets and variables → Actions → add repository secret `SAUCEDEMO_PASSWORD = secret_sauce`
4. (Optional, recommended) Settings → Branches → add a branch protection rule requiring the `Playwright matrix` check before merge

---

## 4. What stays the same

- All Phase A test files, pages, components, fixtures
- All Phase A tag conventions (`@no-auth`, `@all-users`, `@standard`, `@problem`, `@performance_glitch`, `@error`, `@visual`, `@sort-functional`)
- The 5 chromium user projects keep their names and grep patterns
- `tests/auth.setup.ts` — no changes (storageState files are engine-portable)
- `.env.example`, `.gitignore`, ESLint flat config, Prettier, tsconfig
- Composition rules from Phase A spec Section 4
- The 11 Phase A page/component files

---

## 5. Acceptance criteria (Phase A.5 Definition of Done)

1. `playwright.config.ts` defines 9 projects total: `setup`, `no-auth`, `standard`, `problem`, `performance_glitch`, `error`, `visual`, `firefox-standard`, `webkit-standard`.
2. `npx playwright install --with-deps chromium firefox webkit` succeeds locally.
3. `npm test` locally runs all 9 projects from a clean state and produces **62 passing test instances**, broken down:

   | Project              | Tests  |
   | -------------------- | ------ |
   | `setup`              | 5      |
   | `no-auth`            | 3      |
   | `standard`           | 11     |
   | `problem`            | 4      |
   | `performance_glitch` | 7      |
   | `error`              | 3      |
   | `visual`             | 7      |
   | `firefox-standard`   | 11     |
   | `webkit-standard`    | 11     |
   | **Total**            | **62** |

4. `npm run test:firefox` runs only the firefox-standard project and passes.
5. `npm run test:webkit` runs only the webkit-standard project and passes.
6. `data/fixtures.ts` no longer imports `createRequire` from `'module'`. It uses `import x from './x.json' with { type: 'json' }`.
7. `npm run typecheck && npm run lint && npm run format:check` all exit 0.
8. `.github/workflows/test.yml` exists.
9. Repository has `origin` remote pointing at `playwright-ia-automation-framework-saucedemo` on GitHub. `main` is pushed.
10. The `SAUCEDEMO_PASSWORD` GitHub Actions secret is set (manual step, user does after workflow lands).
11. The first CI run on `main` after push completes successfully (~3-5 min expected).

---

## 6. Risk: `with { type: 'json' }` may not work in our toolchain

The import-attributes syntax is well-supported in Node 22.13+ and TypeScript 5.7+, but Playwright's test runner has its own TypeScript pipeline. If it doesn't transpile or pass through the attribute correctly, runtime imports will fail with a JSON-parse error.

**Mitigation plan:**

1. The implementer applies the change and runs `npx playwright test --project=standard tests/inventory/browse.spec.ts` immediately after.
2. If it fails: the implementer reverts `data/fixtures.ts` to the `createRequire` form, restores the original comment, marks the cleanup as deferred to a future phase (when Playwright/TS toolchain catches up), and updates this spec's section 6 with the actual failure mode observed.
3. The other Phase A.5 work (cross-browser projects, CI workflow) proceeds unaffected — they don't depend on this change.

This is a single-file revert if needed, not a rollback of Phase A.5.

---

## 7. Out of scope (deferred to later phases)

| Deferred to              | What                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase B**              | All AI-context content: `/docs` architecture doc, `/docs` saucedemo natural-language spec, CLAUDE.md, MCP servers (Playwright MCP, Atlassian MCP, GitHub MCP) |
| **Phase C**              | AI skills, slash commands, sub-agents, the `/from-jira` orchestrator, PR creation flow                                                                        |
| **Phase D**              | Post-commit hook to refresh `/docs`, MCP-driven selector discovery, TestRail export, visual regression baselines, pre-commit hooks (husky/lint-staged)        |
| **Phase A.5 (rejected)** | Per-user × per-browser full matrix (15 projects), Allure or custom reporters, branch protection rules in YAML                                                 |
