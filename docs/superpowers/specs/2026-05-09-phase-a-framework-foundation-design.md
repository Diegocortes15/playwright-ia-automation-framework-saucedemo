# Phase A — Playwright Framework Foundation (Design)

**Date:** 2026-05-09
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Scope:** Phase A only. Phases B (AI context layer), C (workflow automation), D (self-maintenance loop) are deferred.

---

## 1. Overview

### Goal

Build the Playwright + TypeScript framework foundation that all later AI workflow phases will sit on top of. By the end of Phase A, the framework runs locally against `https://www.saucedemo.com`, exercises every architectural pattern the AI agents will need to extend in Phase C, and gates code quality with strict typing and Playwright-aware lint rules.

### Why this exists first

The downstream AI workflow (`Jira ticket → AI implements → AI reviews → PR → human approves`) needs a solid framework to extend. Designing AI orchestration before the framework exists produces an agent that has nothing meaningful to do.

### Industry positioning

This sits squarely in the **"code-first, AI-assisted"** camp — the production standard in 2026. Tests stay fast, deterministic, debuggable, version-controlled. AI agents will _write_ the code in later phases, but the framework itself is conventional Playwright. Pure AI-driven runtime test execution (Mabl, Playwright-MCP-only setups) is not used because it's too slow and flaky for regression suites.

### Phase boundary

| In Phase A                                         | Deferred                                            |
| -------------------------------------------------- | --------------------------------------------------- |
| Playwright + TypeScript project skeleton           | `/docs` AI-context content (Phase B)                |
| POM-by-component with explicit composition rules   | CLAUDE.md, MCP servers, sub-agents (Phase B/C)      |
| Multi-user via Projects + storageState + role tags | Slash commands, `/from-jira` orchestrator (Phase C) |
| Hybrid data layer with typed loaders               | Code-review skill, PR creation (Phase C)            |
| Chromium only, ESLint+Prettier, strict TS          | Cross-browser, CI workflow, hooks (Phase A.5/D)     |
| ~30 tests proving every pattern                    | Full saucedemo coverage (out of scope)              |

> **Phase A.5** is a small bridge between A and B: cross-browser projects (`firefox`, `webkit`) and the GitHub Actions CI workflow. Cheap additions on top of a working Phase A; deferred only because they're not needed to prove the framework patterns.

---

## 2. Decision log

| #   | Decision                                                                                  | Rationale                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **TypeScript**                                                                            | Strong default for Playwright; better AI code-gen results from rich type signatures.                                                      |
| 2   | **POM Option 1: Page composes Components**                                                | Best AI code-gen results, dominant pattern in 2026, clean reuse boundaries.                                                               |
| 3   | **Pages may hold locators directly** for page-unique UI                                   | Avoids over-engineering one-off pages with empty components.                                                                              |
| 4   | **Components may compose other components**                                               | Compositional reuse (mirrors React/Vue model). Limit nesting to 1–2 levels.                                                               |
| 5   | **Pages never return other Pages** (no fluent navigation)                                 | Tests stay explicit; AI reads straight-line code more reliably; no cross-page imports.                                                    |
| 6   | **Components never know about parents**                                                   | Strict — keeps components context-free and reusable.                                                                                      |
| 7   | **Multi-user via Projects + storageState + role tags** (replaces original `--runAs` idea) | Native Playwright; full matrix in CI; massive speed win from auth-once.                                                                   |
| 8   | **Default project is `standard`** for local dev                                           | `npm run test:standard` is the fast iteration path.                                                                                       |
| 9   | **`locked_out_user` excluded from storageState setup**                                    | Login fails — no session to save. Exercised only in `@no-auth` login tests.                                                               |
| 10  | **Data Option 3: Hybrid `shared/` + `scenarios/`**                                        | Clear separation; scales; AI-friendly type loaders.                                                                                       |
| 11  | **Data via direct imports + `@data/*` alias** (no Playwright `data.fixture.ts`)           | Simpler; YAGNI; AI handles direct imports more reliably.                                                                                  |
| 12  | **Page objects via fixture injection** (`@fixtures/test`)                                 | Pre-instantiated, single import line per test.                                                                                            |
| 13  | **Credentials in `.env`, usernames in code**                                              | Even though saucedemo passwords are public, treat them as secrets so the pattern is right for future projects.                            |
| 14  | **Reporters: HTML + JSON + list**                                                         | HTML for humans; JSON for AI consumption in Phase C; list for terminal feedback.                                                          |
| 15  | **Chromium only in Phase A**                                                              | Ship one browser first; cross-browser is a 10-line config change later.                                                                   |
| 16  | **ESLint + Prettier (not Biome)**                                                         | `eslint-plugin-playwright` provides AI-safety rules (no-wait-for-timeout, prefer-web-first-assertions, etc.) that Biome doesn't yet have. |
| 17  | **TypeScript `strict: true`**                                                             | Non-negotiable — strict mode is what keeps AI-generated code correct over time.                                                           |

---

## 3. Folder structure

```
playwright-ia-framework/
├── playwright.config.ts
├── tsconfig.json
├── package.json
├── .eslintrc.json
├── .prettierrc.json
├── .env.example
├── .gitignore
│
├── src/
│   ├── pages/
│   │   ├── LoginPage.ts
│   │   ├── InventoryPage.ts
│   │   ├── CartPage.ts
│   │   └── checkout/
│   │       ├── CheckoutInfoPage.ts
│   │       ├── CheckoutOverviewPage.ts
│   │       └── CheckoutCompletePage.ts
│   │
│   ├── components/
│   │   ├── Header.ts
│   │   ├── CartBadge.ts
│   │   ├── ProductCard.ts
│   │   └── SortDropdown.ts
│   │
│   ├── fixtures/
│   │   └── test.ts                       # extends @playwright/test, injects pages
│   │
│   └── utils/
│       ├── logger.ts
│       └── env.ts                        # typed env config, single read point
│
├── data/
│   ├── types.ts                          # Product, CheckoutScenario, SortOption
│   ├── fixtures.ts                       # loadProducts(), loadCheckoutScenarios(), ...
│   ├── shared/
│   │   └── products.json
│   └── scenarios/
│       ├── checkout/
│       │   ├── valid-checkout.json
│       │   └── invalid-postalcode.json
│       └── sort/
│           └── sort-orders.json
│
├── auth/
│   ├── .gitkeep
│   ├── standard.json                     # generated by setup, git-ignored
│   ├── problem.json
│   ├── performance_glitch.json
│   ├── error.json
│   └── visual.json
│
├── tests/
│   ├── auth.setup.ts
│   ├── login/
│   │   └── login.spec.ts                 # @no-auth
│   ├── inventory/
│   │   ├── browse.spec.ts                # @all-users
│   │   └── sort.spec.ts                  # @all-users
│   ├── cart/
│   │   └── add-remove.spec.ts            # @all-users
│   ├── checkout/
│   │   ├── happy-path.spec.ts            # @standard
│   │   └── validation.spec.ts            # @standard
│   └── visual/
│       └── inventory-images.spec.ts      # @problem
│
└── docs/
    └── superpowers/specs/                # design docs (this file lives here)
```

---

## 4. Composition rules

These rules are the contract the AI agent will follow when extending the framework.

1. **Component knows about Locators and (optionally) child Components only.** Never about Pages or its parent.
2. **Page composes Components and holds page-unique Locators.** Never composes other Pages.
3. **Pages never return other Pages.** Return `void` or data only. Tests use injected page fixtures to navigate.
4. **Tests know about Pages and Data only.** Never raw Locators or Components directly.
5. **Refactor a page-direct locator into a Component the moment a second page needs it.** Don't wait.
6. **Component nesting depth ≤ 2.** Deeper indicates a design problem.
7. **Selector preference order:** `data-test` attribute → `getByRole` → text → CSS. Never XPath.
8. **No `await page.waitForTimeout()` ever.** Only Playwright's auto-waiting assertions (`expect(...).toBeVisible()`, `toHaveURL()`, etc.). Enforced by lint.
9. **All locator/component fields are `readonly`.** Set in constructor, never reassigned.
10. **Action methods read like English** (`addProductToCart`, `sortBy`). Tests become near-prose.
11. **Queries return data, never `Locator`.** `getProductNames(): string[]`, not `getProductLocator(): Locator`. Keeps `Locator` from leaking into tests.
12. **Components scoped to one of many similar elements take a discriminator in the constructor.** E.g., `new ProductCard(page, productName)` anchors all locators under a `root` filtered by `hasText`.

---

## 5. Multi-user infrastructure

### Auth setup (`tests/auth.setup.ts`)

Logs each user in once via UI, persists `storageState` to `auth/<user>.json`. Excludes `locked_out_user` (login fails).

```ts
import { test as setup } from '@playwright/test';
import path from 'path';
import { env } from '@utils/env';

const users = ['standard', 'problem', 'performance_glitch', 'error', 'visual'] as const;

for (const user of users) {
  setup(`authenticate as ${user}`, async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Username').fill(`${user}_user`);
    await page.getByPlaceholder('Password').fill(env.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/inventory.html');
    await page.context().storageState({ path: path.resolve('auth', `${user}.json`) });
  });
}
```

### Tag convention

| Tag          | Runs on project(s)           | Purpose                                          |
| ------------ | ---------------------------- | ------------------------------------------------ |
| `@no-auth`   | `no-auth` only               | Login/logout tests, no pre-existing session      |
| `@all-users` | All 5 authenticated projects | User-agnostic flows                              |
| `@standard`  | `standard` only              | Tests where only standard user is meaningful     |
| `@problem`   | `problem` only               | Tests that _expect_ the problem user's broken UI |
| `@glitch`    | `performance_glitch` only    | Tests that handle/measure slow loads             |
| `@error`     | `error` only                 | Tests for the error user's random failures       |
| `@visual`    | `visual` only                | Visual regression for the visual user            |

### Run commands

| Goal                         | Command                                                   |
| ---------------------------- | --------------------------------------------------------- |
| Full matrix (CI default)     | `npm test`                                                |
| Local dev — fast iteration   | `npm run test:standard`                                   |
| Just login tests             | `npm run test:no-auth`                                    |
| Reproduce a bug for one user | `npx playwright test --project=problem --grep "checkout"` |

---

## 6. Data layer

### Types (`data/types.ts`)

```ts
export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageAlt: string;
}

export interface CheckoutScenario {
  description: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  expectError?: string;
}

export interface SortOption {
  label: 'Name (A to Z)' | 'Name (Z to A)' | 'Price (low to high)' | 'Price (high to low)';
  value: 'az' | 'za' | 'lohi' | 'hilo';
  expectedFirst: string;
  expectedLast: string;
}
```

### Loaders (`data/fixtures.ts`)

```ts
import productsJson from './shared/products.json';
import validCheckoutJson from './scenarios/checkout/valid-checkout.json';
import invalidPostalJson from './scenarios/checkout/invalid-postalcode.json';
import sortOrdersJson from './scenarios/sort/sort-orders.json';
import type { Product, CheckoutScenario, SortOption } from './types';

export const loadProducts = (): Product[] => productsJson as Product[];
export const loadValidCheckouts = (): CheckoutScenario[] => validCheckoutJson as CheckoutScenario[];
export const loadInvalidPostal = (): CheckoutScenario[] => invalidPostalJson as CheckoutScenario[];
export const loadSortOrders = (): SortOption[] => sortOrdersJson as SortOption[];
```

Naming convention: `load<Subject>()` returns `<Subject>[]`. AI follows the pattern when adding loaders.

### Parameterized test pattern

```ts
import { test, expect } from '@fixtures/test';
import { loadValidCheckouts } from '@data/fixtures';

for (const scenario of loadValidCheckouts()) {
  test(`@standard checkout — ${scenario.description}`, async ({
    inventoryPage,
    cartPage,
    checkoutInfoPage,
    checkoutOverviewPage,
    checkoutCompletePage,
  }) => {
    // ...
  });
}
```

The `for` loop generates one test per scenario at collect time — each scenario gets its own pass/fail/retry in the report.

---

## 7. Page/Component pattern (canonical examples)

### Page composing components + page-unique locators

```ts
// src/pages/InventoryPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import { ProductCard } from '@components/ProductCard';
import { SortDropdown } from '@components/SortDropdown';
import type { SortOption } from '@data/types';

export class InventoryPage {
  // 1) Composed components
  readonly header: Header;
  readonly sort: SortDropdown;
  // 2) Page-unique locators
  readonly productGrid: Locator;
  readonly pageTitle: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.sort = new SortDropdown(page);
    this.productGrid = page.locator('[data-test="inventory-list"]');
    this.pageTitle = page.locator('[data-test="title"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
    await expect(this.pageTitle).toHaveText('Products');
  }

  async addProductToCart(productName: string): Promise<void> {
    const card = new ProductCard(this.page, productName);
    await card.addToCart();
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sort.selectByValue(option.value);
  }

  async getProductNames(): Promise<string[]> {
    return this.productGrid.locator('[data-test="inventory-item-name"]').allTextContents();
  }
}
```

### Component scoped to one of many similar elements

```ts
// src/components/ProductCard.ts
import { Page, Locator } from '@playwright/test';

export class ProductCard {
  private readonly root: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;

  constructor(
    private readonly page: Page,
    productName: string,
  ) {
    this.root = page.locator('[data-test="inventory-item"]', { hasText: productName });
    this.name = this.root.locator('[data-test="inventory-item-name"]');
    this.price = this.root.locator('[data-test="inventory-item-price"]');
    this.addToCartButton = this.root.getByRole('button', { name: /Add to cart/i });
    this.removeButton = this.root.getByRole('button', { name: /Remove/i });
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }
  async remove(): Promise<void> {
    await this.removeButton.click();
  }
  async getName(): Promise<string> {
    return (await this.name.textContent()) ?? '';
  }
  async getPrice(): Promise<number> {
    const text = (await this.price.textContent()) ?? '';
    return parseFloat(text.replace('$', ''));
  }
}
```

### Component composing component

```ts
// src/components/Header.ts
import { Page, Locator } from '@playwright/test';
import { CartBadge } from './CartBadge';

export class Header {
  readonly cartBadge: CartBadge;
  readonly menuButton: Locator;
  readonly logoutLink: Locator;

  constructor(private readonly page: Page) {
    this.cartBadge = new CartBadge(page);
    this.menuButton = page.getByRole('button', { name: 'Open Menu' });
    this.logoutLink = page.locator('#logout_sidebar_link');
  }

  async openCart(): Promise<void> {
    await this.cartBadge.click();
  }

  async logout(): Promise<void> {
    await this.menuButton.click();
    await this.logoutLink.click();
  }
}
```

```ts
// src/components/CartBadge.ts
import { Page, Locator } from '@playwright/test';

export class CartBadge {
  readonly badge: Locator;
  readonly icon: Locator;

  constructor(private readonly page: Page) {
    this.badge = page.locator('[data-test="shopping-cart-badge"]');
    this.icon = page.locator('[data-test="shopping-cart-link"]');
  }

  async getCount(): Promise<number> {
    if (!(await this.badge.isVisible())) return 0;
    return parseInt((await this.badge.textContent()) ?? '0', 10);
  }

  async click(): Promise<void> {
    await this.icon.click();
  }
}
```

### Test fixture (`src/fixtures/test.ts`)

```ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { InventoryPage } from '@pages/InventoryPage';
import { CartPage } from '@pages/CartPage';
import { CheckoutInfoPage } from '@pages/checkout/CheckoutInfoPage';
import { CheckoutOverviewPage } from '@pages/checkout/CheckoutOverviewPage';
import { CheckoutCompletePage } from '@pages/checkout/CheckoutCompletePage';

type Pages = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutInfoPage: CheckoutInfoPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutInfoPage: async ({ page }, use) => use(new CheckoutInfoPage(page)),
  checkoutOverviewPage: async ({ page }, use) => use(new CheckoutOverviewPage(page)),
  checkoutCompletePage: async ({ page }, use) => use(new CheckoutCompletePage(page)),
});

export { expect };
```

### Canonical test

```ts
import { test, expect } from '@fixtures/test';

test('@all-users add backpack to cart updates badge', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  await inventoryPage.addProductToCart('Sauce Labs Backpack');
  expect(await inventoryPage.header.cartBadge.getCount()).toBe(1);
});
```

Zero locator strings, zero `Page` references, zero waits. Pure intent.

---

## 8. Configuration & tooling

### `package.json` (key parts)

```json
{
  "name": "playwright-ia-framework",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "playwright test",
    "test:standard": "playwright test --project=standard",
    "test:no-auth": "playwright test --project=no-auth",
    "test:problem": "playwright test --project=problem",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --project=standard --debug",
    "test:headed": "playwright test --project=standard --headed",
    "report": "playwright show-report",
    "codegen": "playwright codegen https://www.saucedemo.com",
    "typecheck": "tsc --noEmit",
    "lint": "eslint . --ext .ts",
    "lint:fix": "eslint . --ext .ts --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@playwright/test": "^1.49.0",
    "@types/node": "^22.0.0",
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-plugin-playwright": "^2.0.0",
    "prettier": "^3.4.0",
    "dotenv": "^16.4.0"
  }
}
```

### `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const userProjects = ['standard', 'problem', 'performance_glitch', 'error', 'visual'] as const;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'no-auth',
      testIgnore: /.*\.setup\.ts/,
      grep: /@no-auth/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...userProjects.map((u) => ({
      name: u,
      testIgnore: /.*\.setup\.ts/,
      grep: new RegExp(`@all-users|@${u}`),
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `auth/${u}.json`,
      },
    })),
  ],
});
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@data/*": ["data/*"],
      "@pages/*": ["src/pages/*"],
      "@components/*": ["src/components/*"],
      "@fixtures/*": ["src/fixtures/*"],
      "@utils/*": ["src/utils/*"]
    }
  },
  "include": ["src", "tests", "data", "playwright.config.ts"]
}
```

### `.eslintrc.json`

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "playwright"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:playwright/recommended"
  ],
  "rules": {
    "playwright/no-wait-for-timeout": "error",
    "playwright/no-conditional-in-test": "warn",
    "playwright/expect-expect": "error",
    "playwright/no-skipped-test": "warn",
    "playwright/prefer-web-first-assertions": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### `.prettierrc.json`

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### `.env.example`

```
SAUCEDEMO_BASE_URL=https://www.saucedemo.com
SAUCEDEMO_PASSWORD=secret_sauce
```

### `.gitignore`

```
node_modules/
test-results/
playwright-report/
blob-report/
playwright/.cache/

auth/*.json
!auth/.gitkeep

.env
.env.local
```

### `src/utils/env.ts`

```ts
import 'dotenv/config';

interface EnvConfig {
  baseUrl: string;
  password: string;
}

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env: EnvConfig = {
  baseUrl: process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com',
  password: required('SAUCEDEMO_PASSWORD'),
};
```

---

## 9. Initial test scope

Phase A delivers the minimum tests needed to **prove every architectural pattern** the AI agent will need to imitate in Phase C. Not full saucedemo coverage.

### Test files

| File                                    | Tag(s)       | Test cases (after parameterization) | Pattern proven                                                                |
| --------------------------------------- | ------------ | ----------------------------------- | ----------------------------------------------------------------------------- |
| `tests/auth.setup.ts`                   | —            | 5 (one per user)                    | `storageState` generation                                                     |
| `tests/login/login.spec.ts`             | `@no-auth`   | 3                                   | Page-only locators; `no-auth` project; `locked_out_user`                      |
| `tests/inventory/browse.spec.ts`        | `@all-users` | 1 (×5 users = 5 instances)          | Multi-user matrix; component composition                                      |
| `tests/inventory/sort.spec.ts`          | `@all-users` | 4 (×5 = 20 instances)               | JSON parameterization (`loadSortOrders()`)                                    |
| `tests/cart/add-remove.spec.ts`         | `@all-users` | 2 (×5 = 10 instances)               | Component-in-component (`Header.cartBadge.getCount()`)                        |
| `tests/checkout/happy-path.spec.ts`     | `@standard`  | 2                                   | Single-user pin; full multi-page flow                                         |
| `tests/checkout/validation.spec.ts`     | `@standard`  | 2                                   | Negative-path scenarios with `expectError` (empty postal, missing first name) |
| `tests/visual/inventory-images.spec.ts` | `@problem`   | 1                                   | User-specific behavior (only meaningful for `problem_user`)                   |

**Total: ~40+ test instances** across all 6 projects.

### Pattern coverage matrix (acceptance criteria)

| Pattern                         | Proved by                                                                   |
| ------------------------------- | --------------------------------------------------------------------------- |
| Page with locators only         | `LoginPage`, `CheckoutCompletePage`                                         |
| Page composing components       | `InventoryPage`, `CartPage`                                                 |
| Component composing component   | `Header` → `CartBadge`                                                      |
| `storageState` setup            | `auth.setup.ts`                                                             |
| `no-auth` project               | `tests/login/*`                                                             |
| `@all-users` matrix tag         | `browse.spec.ts`, `sort.spec.ts`, `add-remove.spec.ts`                      |
| Single-user pin tag             | `happy-path.spec.ts` (`@standard`), `inventory-images.spec.ts` (`@problem`) |
| JSON-driven parameterization    | `sort.spec.ts`, `happy-path.spec.ts`, `validation.spec.ts`                  |
| `@data/*` typed loader imports  | every test that uses scenarios                                              |
| `@fixtures/test` page injection | every test                                                                  |
| `expectError` negative paths    | `validation.spec.ts`                                                        |

If any row is uncovered, the AI agent in Phase C has no example to imitate.

---

## 10. Definition of Done

Phase A is complete when **all** of the following are true:

1. `npm install` succeeds on a clean clone.
2. `npx playwright install chromium` succeeds.
3. `cp .env.example .env` then `npm test` runs the full matrix and passes (auth setup + all 6 projects).
4. `npm run test:standard` runs only the standard project and passes.
5. `npm run test:no-auth` runs only login tests and passes.
6. `npm run typecheck` passes with zero errors.
7. `npm run lint` passes with zero errors.
8. `npm run format:check` passes.
9. Every row in the pattern coverage matrix (Section 9) has at least one passing test.
10. The folder structure matches Section 3 exactly.
11. All composition rules in Section 4 are visibly followed by the delivered code.

---

## 11. Out of scope (deferred to later phases)

| Deferred to   | What                                                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase A.5** | Cross-browser (`firefox`, `webkit`); CI workflow file                                                                                                       |
| **Phase B**   | `/docs` content for AI consumption (architecture doc + saucedemo natural-language spec); CLAUDE.md; MCP servers (Playwright MCP, Atlassian MCP, GitHub MCP) |
| **Phase C**   | AI skills (`code-review`, `testrail-export`, etc.); slash command `/from-jira`; planner/implementer/reviewer sub-agents; PR creation flow                   |
| **Phase D**   | Post-commit hook to refresh `/docs`; MCP-driven selector discovery; TestRail export; visual regression baselines; pre-commit hooks (husky/lint-staged)      |
