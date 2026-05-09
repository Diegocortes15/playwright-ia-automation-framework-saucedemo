# Phase A — Framework Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Playwright + TypeScript framework foundation defined in `docs/superpowers/specs/2026-05-09-phase-a-framework-foundation-design.md` — runs against `https://www.saucedemo.com`, exercises every architectural pattern, gates code quality with strict TS + Playwright lint rules.

**Architecture:** POM-by-component. Pages compose Components and hold page-unique locators. Components scope themselves to a `root` locator and never know about parents. Tests get pre-instantiated pages from a fixture. Multi-user via Playwright Projects + `storageState` + role tags. Data via typed loaders importing JSON from `@data/*` aliases.

**Tech Stack:** Node.js + TypeScript 5.7 (`strict: true`), Playwright 1.49 (chromium only), ESLint 9 + `eslint-plugin-playwright`, Prettier 3, dotenv. No CI, no cross-browser, no AI tooling — those are Phase A.5/B/C/D.

**Build order (outside-in):** Infrastructure → Data layer → Components (leaf-first) → Pages → Fixture + Playwright config → Auth setup → Tests one feature at a time.

**Working directory:** `d:\Diego\Projects\IA Engineer\playwright-ia-framework` (already a git repo with the design spec committed).

**Platform note:** Commands use cross-platform syntax. On Windows PowerShell, `cp` is an alias for `Copy-Item` and works as shown.

---

## Task 1: Project init and dependencies

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "playwright-ia-framework",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test":          "playwright test",
    "test:standard": "playwright test --project=standard",
    "test:no-auth":  "playwright test --project=no-auth",
    "test:problem":  "playwright test --project=problem",
    "test:ui":       "playwright test --ui",
    "test:debug":    "playwright test --project=standard --debug",
    "test:headed":   "playwright test --project=standard --headed",
    "report":        "playwright show-report",
    "codegen":       "playwright codegen https://www.saucedemo.com",
    "typecheck":     "tsc --noEmit",
    "lint":          "eslint . --ext .ts",
    "lint:fix":      "eslint . --ext .ts --fix",
    "format":        "prettier --write .",
    "format:check":  "prettier --check ."
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Install dev dependencies**

Run:
```bash
npm install -D @playwright/test@^1.49.0 @types/node@^22.0.0 typescript@^5.7.0 dotenv@^16.4.0
npm install -D eslint@^9.0.0 @typescript-eslint/parser@^8.0.0 @typescript-eslint/eslint-plugin@^8.0.0 eslint-plugin-playwright@^2.0.0 prettier@^3.4.0
```

Expected: `package-lock.json` created, `node_modules/` populated, no errors.

- [ ] **Step 3: Install Playwright chromium browser**

Run: `npx playwright install chromium`

Expected: chromium downloaded (~140MB). Output ends with `chromium ... downloaded`.

- [ ] **Step 4: Create `.gitignore`**

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

- [ ] **Step 5: Verify install works**

Run: `npx playwright --version`
Expected: `Version 1.49.x` (or newer minor).

Run: `npx tsc --version`
Expected: `Version 5.7.x` (or newer minor).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: bootstrap Node project with Playwright, TS, ESLint, Prettier"
```

---

## Task 2: TypeScript configuration

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Create `tsconfig.json`**

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
      "@data/*":       ["data/*"],
      "@pages/*":      ["src/pages/*"],
      "@components/*": ["src/components/*"],
      "@fixtures/*":   ["src/fixtures/*"],
      "@utils/*":      ["src/utils/*"]
    }
  },
  "include": ["src", "tests", "data", "playwright.config.ts"]
}
```

- [ ] **Step 2: Verify typecheck runs (will pass with no source files)**

Run: `npm run typecheck`
Expected: exits 0, no output (no `.ts` files yet to check).

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: add TypeScript strict config with path aliases"
```

---

## Task 3: ESLint and Prettier configuration

**Files:**
- Create: `.eslintrc.json`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.eslintignore`

- [ ] **Step 1: Create `.eslintrc.json`**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
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
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
  }
}
```

- [ ] **Step 2: Create `.eslintignore`**

```
node_modules/
test-results/
playwright-report/
auth/
data/**/*.json
```

- [ ] **Step 3: Create `.prettierrc.json`**

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

- [ ] **Step 4: Create `.prettierignore`**

```
node_modules/
test-results/
playwright-report/
auth/
package-lock.json
```

- [ ] **Step 5: Verify lint passes (no source files yet)**

Run: `npm run lint`
Expected: exits 0, no errors.

Run: `npm run format:check`
Expected: exits 0, "All matched files use Prettier code style!"

- [ ] **Step 6: Commit**

```bash
git add .eslintrc.json .eslintignore .prettierrc.json .prettierignore
git commit -m "chore: add ESLint with Playwright rules and Prettier config"
```

---

## Task 4: Environment config and folder scaffold

**Files:**
- Create: `.env.example`
- Create: `auth/.gitkeep`
- Create: `src/utils/env.ts`

- [ ] **Step 1: Create `.env.example`**

```
SAUCEDEMO_BASE_URL=https://www.saucedemo.com
SAUCEDEMO_PASSWORD=secret_sauce
```

- [ ] **Step 2: Create local `.env` from example**

Run: `cp .env.example .env`

Expected: `.env` exists in working directory (git-ignored).

- [ ] **Step 3: Create `auth/.gitkeep`**

Empty file. Run: `mkdir auth` if not exists, then create empty file `auth/.gitkeep`.

- [ ] **Step 4: Create `src/utils/env.ts`**

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

- [ ] **Step 5: Create `src/utils/logger.ts`** (minimal stub — referenced in spec §3 folder tree)

```ts
type Level = 'debug' | 'info' | 'error';

const enabled: Record<Level, boolean> = {
  debug: process.env.LOG_LEVEL === 'debug',
  info: process.env.LOG_LEVEL !== 'silent',
  error: true,
};

export const logger = {
  debug: (msg: string) => enabled.debug && console.log(`[debug] ${msg}`),
  info: (msg: string) => enabled.info && console.log(`[info] ${msg}`),
  error: (msg: string) => enabled.error && console.error(`[error] ${msg}`),
};
```

- [ ] **Step 6: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add .env.example auth/.gitkeep src/utils/env.ts src/utils/logger.ts
git commit -m "chore: add env config, dotenv loading, logger stub, auth folder scaffold"
```

---

## Task 5: Data types

**Files:**
- Create: `data/types.ts`

- [ ] **Step 1: Create `data/types.ts`**

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

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add data/types.ts
git commit -m "feat: add data type definitions"
```

---

## Task 6: Reference and scenario JSON data

**Files:**
- Create: `data/shared/products.json`
- Create: `data/scenarios/sort/sort-orders.json`
- Create: `data/scenarios/checkout/valid-checkout.json`
- Create: `data/scenarios/checkout/invalid-postalcode.json`

- [ ] **Step 1: Create `data/shared/products.json`** (all 6 saucedemo products)

```json
[
  {
    "id": "sauce-labs-backpack",
    "name": "Sauce Labs Backpack",
    "price": 29.99,
    "description": "carry.allTheThings() with the sleek, streamlined Sly Pack that melds uncompromising style with unequaled laptop and tablet protection.",
    "imageAlt": "Sauce Labs Backpack"
  },
  {
    "id": "sauce-labs-bike-light",
    "name": "Sauce Labs Bike Light",
    "price": 9.99,
    "description": "A red light isn't the desired state in testing but it sure helps when riding your bike at night. Water-resistant with 3 lighting modes, 1 AAA battery included.",
    "imageAlt": "Sauce Labs Bike Light"
  },
  {
    "id": "sauce-labs-bolt-t-shirt",
    "name": "Sauce Labs Bolt T-Shirt",
    "price": 15.99,
    "description": "Get your testing superhero on with the Sauce Labs bolt T-shirt. From American Apparel, 100% ringspun combed cotton, heather gray with red bolt.",
    "imageAlt": "Sauce Labs Bolt T-Shirt"
  },
  {
    "id": "sauce-labs-fleece-jacket",
    "name": "Sauce Labs Fleece Jacket",
    "price": 49.99,
    "description": "It's not every day that you come across a midweight quarter-zip fleece jacket capable of handling everything from a relaxing day outdoors to a busy day at the office.",
    "imageAlt": "Sauce Labs Fleece Jacket"
  },
  {
    "id": "sauce-labs-onesie",
    "name": "Sauce Labs Onesie",
    "price": 7.99,
    "description": "Rib snap infant onesie for the junior automation engineer in development. Reinforced 3-snap bottom closure, two-needle hemmed sleeves and bottom.",
    "imageAlt": "Sauce Labs Onesie"
  },
  {
    "id": "test-allthethings-t-shirt-red",
    "name": "Test.allTheThings() T-Shirt (Red)",
    "price": 15.99,
    "description": "This classic Sauce Labs t-shirt is perfect to wear when cozying up to your keyboard to automate a few tests. Super-soft and comfy ringspun combed cotton.",
    "imageAlt": "Test.allTheThings() T-Shirt (Red)"
  }
]
```

- [ ] **Step 2: Create `data/scenarios/sort/sort-orders.json`**

```json
[
  {
    "label": "Name (A to Z)",
    "value": "az",
    "expectedFirst": "Sauce Labs Backpack",
    "expectedLast": "Test.allTheThings() T-Shirt (Red)"
  },
  {
    "label": "Name (Z to A)",
    "value": "za",
    "expectedFirst": "Test.allTheThings() T-Shirt (Red)",
    "expectedLast": "Sauce Labs Backpack"
  },
  {
    "label": "Price (low to high)",
    "value": "lohi",
    "expectedFirst": "Sauce Labs Onesie",
    "expectedLast": "Sauce Labs Fleece Jacket"
  },
  {
    "label": "Price (high to low)",
    "value": "hilo",
    "expectedFirst": "Sauce Labs Fleece Jacket",
    "expectedLast": "Sauce Labs Onesie"
  }
]
```

- [ ] **Step 3: Create `data/scenarios/checkout/valid-checkout.json`**

```json
[
  {
    "description": "US address",
    "firstName": "John",
    "lastName": "Doe",
    "postalCode": "12345"
  },
  {
    "description": "international postal code",
    "firstName": "Anna",
    "lastName": "Mueller",
    "postalCode": "10115"
  }
]
```

- [ ] **Step 4: Create `data/scenarios/checkout/invalid-postalcode.json`**

```json
[
  {
    "description": "empty postal code",
    "firstName": "John",
    "lastName": "Doe",
    "postalCode": "",
    "expectError": "Error: Postal Code is required"
  },
  {
    "description": "missing first name",
    "firstName": "",
    "lastName": "Doe",
    "postalCode": "12345",
    "expectError": "Error: First Name is required"
  }
]
```

- [ ] **Step 5: Commit**

```bash
git add data/shared data/scenarios
git commit -m "feat: add reference products and parameterized test scenarios"
```

---

## Task 7: Typed data loaders

**Files:**
- Create: `data/fixtures.ts`

- [ ] **Step 1: Create `data/fixtures.ts`**

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

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Verify lint**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add data/fixtures.ts
git commit -m "feat: add typed data loaders for products and scenarios"
```

---

## Task 8: CartBadge component (leaf — built first)

**Files:**
- Create: `src/components/CartBadge.ts`

- [ ] **Step 1: Create `src/components/CartBadge.ts`**

```ts
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

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/CartBadge.ts
git commit -m "feat(components): add CartBadge component"
```

---

## Task 9: Header component (composes CartBadge)

**Files:**
- Create: `src/components/Header.ts`

- [ ] **Step 1: Create `src/components/Header.ts`**

```ts
import { Page, Locator } from '@playwright/test';
import { CartBadge } from './CartBadge';

export class Header {
  readonly cartBadge: CartBadge;
  readonly menuButton: Locator;
  readonly logoutLink: Locator;
  readonly appLogo: Locator;

  constructor(private readonly page: Page) {
    this.cartBadge = new CartBadge(page);
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
    this.appLogo = page.locator('.app_logo');
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

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.ts
git commit -m "feat(components): add Header composing CartBadge"
```

---

## Task 10: ProductCard component (scoped to one of many)

**Files:**
- Create: `src/components/ProductCard.ts`

- [ ] **Step 1: Create `src/components/ProductCard.ts`**

```ts
import { Page, Locator } from '@playwright/test';

export class ProductCard {
  private readonly root: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly description: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;
  readonly image: Locator;

  constructor(
    private readonly page: Page,
    productName: string,
  ) {
    this.root = page.locator('[data-test="inventory-item"]', { hasText: productName });
    this.name = this.root.locator('[data-test="inventory-item-name"]');
    this.price = this.root.locator('[data-test="inventory-item-price"]');
    this.description = this.root.locator('[data-test="inventory-item-desc"]');
    this.addToCartButton = this.root.getByRole('button', { name: /Add to cart/i });
    this.removeButton = this.root.getByRole('button', { name: /Remove/i });
    this.image = this.root.locator('img.inventory_item_img');
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

  async getImageSrc(): Promise<string> {
    return (await this.image.getAttribute('src')) ?? '';
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProductCard.ts
git commit -m "feat(components): add ProductCard scoped by product name"
```

---

## Task 11: SortDropdown component

**Files:**
- Create: `src/components/SortDropdown.ts`

- [ ] **Step 1: Create `src/components/SortDropdown.ts`**

```ts
import { Page, Locator } from '@playwright/test';
import type { SortOption } from '@data/types';

export class SortDropdown {
  readonly select: Locator;

  constructor(private readonly page: Page) {
    this.select = page.locator('[data-test="product-sort-container"]');
  }

  async selectByValue(value: SortOption['value']): Promise<void> {
    await this.select.selectOption({ value });
  }

  async getSelectedValue(): Promise<string> {
    return (await this.select.inputValue()) ?? '';
  }
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/SortDropdown.ts
git commit -m "feat(components): add SortDropdown using @data/types"
```

---

## Task 12: LoginPage (page-direct locators only)

**Files:**
- Create: `src/pages/LoginPage.ts`

- [ ] **Step 1: Create `src/pages/LoginPage.ts`**

```ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorBanner: Locator;
  readonly errorCloseButton: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.locator('[data-test="username"]');
    this.passwordInput = page.locator('[data-test="password"]');
    this.loginButton = page.locator('[data-test="login-button"]');
    this.errorBanner = page.locator('[data-test="error"]');
    this.errorCloseButton = page.locator('.error-button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
  }

  async loginAs(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async getErrorText(): Promise<string> {
    return (await this.errorBanner.textContent()) ?? '';
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/LoginPage.ts
git commit -m "feat(pages): add LoginPage with page-direct locators"
```

---

## Task 13: InventoryPage (composes Header, SortDropdown, ProductCard)

**Files:**
- Create: `src/pages/InventoryPage.ts`

- [ ] **Step 1: Create `src/pages/InventoryPage.ts`**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import { ProductCard } from '@components/ProductCard';
import { SortDropdown } from '@components/SortDropdown';
import type { SortOption } from '@data/types';

export class InventoryPage {
  readonly header: Header;
  readonly sort: SortDropdown;
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

  async removeProductFromCart(productName: string): Promise<void> {
    const card = new ProductCard(this.page, productName);
    await card.remove();
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sort.selectByValue(option.value);
  }

  async getProductNames(): Promise<string[]> {
    return this.productGrid.locator('[data-test="inventory-item-name"]').allTextContents();
  }

  async getProductCount(): Promise<number> {
    return this.productGrid.locator('[data-test="inventory-item"]').count();
  }

  async getProductCard(productName: string): Promise<ProductCard> {
    return new ProductCard(this.page, productName);
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/InventoryPage.ts
git commit -m "feat(pages): add InventoryPage composing Header/Sort/ProductCard"
```

---

## Task 14: CartPage

**Files:**
- Create: `src/pages/CartPage.ts`

- [ ] **Step 1: Create `src/pages/CartPage.ts`**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import { ProductCard } from '@components/ProductCard';

export class CartPage {
  readonly header: Header;
  readonly cartList: Locator;
  readonly pageTitle: Locator;
  readonly continueShoppingButton: Locator;
  readonly checkoutButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.cartList = page.locator('[data-test="cart-list"]');
    this.pageTitle = page.locator('[data-test="title"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart.html');
    await expect(this.pageTitle).toHaveText('Your Cart');
  }

  async getItemNames(): Promise<string[]> {
    return this.cartList.locator('[data-test="inventory-item-name"]').allTextContents();
  }

  async getItemCount(): Promise<number> {
    return this.cartList.locator('[data-test="inventory-item"]').count();
  }

  async removeItem(productName: string): Promise<void> {
    const card = new ProductCard(this.page, productName);
    await card.remove();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CartPage.ts
git commit -m "feat(pages): add CartPage"
```

---

## Task 15: CheckoutInfoPage

**Files:**
- Create: `src/pages/checkout/CheckoutInfoPage.ts`

- [ ] **Step 1: Create `src/pages/checkout/CheckoutInfoPage.ts`**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import type { CheckoutScenario } from '@data/types';

export class CheckoutInfoPage {
  readonly header: Header;
  readonly pageTitle: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorBanner: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.errorBanner = page.locator('[data-test="error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout-step-one.html');
    await expect(this.pageTitle).toHaveText('Checkout: Your Information');
  }

  async fillForm(scenario: CheckoutScenario): Promise<void> {
    await this.firstNameInput.fill(scenario.firstName);
    await this.lastNameInput.fill(scenario.lastName);
    await this.postalCodeInput.fill(scenario.postalCode);
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async getErrorText(): Promise<string> {
    return (await this.errorBanner.textContent()) ?? '';
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/checkout/CheckoutInfoPage.ts
git commit -m "feat(pages): add CheckoutInfoPage"
```

---

## Task 16: CheckoutOverviewPage

**Files:**
- Create: `src/pages/checkout/CheckoutOverviewPage.ts`

- [ ] **Step 1: Create `src/pages/checkout/CheckoutOverviewPage.ts`**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';

export class CheckoutOverviewPage {
  readonly header: Header;
  readonly pageTitle: Locator;
  readonly cartList: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.cartList = page.locator('[data-test="cart-list"]');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]');
    this.taxLabel = page.locator('[data-test="tax-label"]');
    this.totalLabel = page.locator('[data-test="total-label"]');
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout-step-two.html');
    await expect(this.pageTitle).toHaveText('Checkout: Overview');
  }

  async getItemNames(): Promise<string[]> {
    return this.cartList.locator('[data-test="inventory-item-name"]').allTextContents();
  }

  async getSubtotal(): Promise<number> {
    const text = (await this.subtotalLabel.textContent()) ?? '';
    const match = text.match(/\$([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  async getTotal(): Promise<number> {
    const text = (await this.totalLabel.textContent()) ?? '';
    const match = text.match(/\$([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/checkout/CheckoutOverviewPage.ts
git commit -m "feat(pages): add CheckoutOverviewPage"
```

---

## Task 17: CheckoutCompletePage

**Files:**
- Create: `src/pages/checkout/CheckoutCompletePage.ts`

- [ ] **Step 1: Create `src/pages/checkout/CheckoutCompletePage.ts`**

```ts
import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';

export class CheckoutCompletePage {
  readonly header: Header;
  readonly pageTitle: Locator;
  readonly thankYouHeader: Locator;
  readonly completeText: Locator;
  readonly ponyExpressImage: Locator;
  readonly backHomeButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.thankYouHeader = page.locator('[data-test="complete-header"]');
    this.completeText = page.locator('[data-test="complete-text"]');
    this.ponyExpressImage = page.locator('[data-test="pony-express"]');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  async expectComplete(): Promise<void> {
    await expect(this.pageTitle).toHaveText('Checkout: Complete!');
    await expect(this.thankYouHeader).toHaveText('Thank you for your order!');
  }

  async backHome(): Promise<void> {
    await this.backHomeButton.click();
  }
}
```

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/pages/checkout/CheckoutCompletePage.ts
git commit -m "feat(pages): add CheckoutCompletePage"
```

---

## Task 18: Test fixture (page injection)

**Files:**
- Create: `src/fixtures/test.ts`

- [ ] **Step 1: Create `src/fixtures/test.ts`**

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

- [ ] **Step 2: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/fixtures/test.ts
git commit -m "feat(fixtures): add test fixture injecting all pages"
```

---

## Task 19: Playwright configuration

**Files:**
- Create: `playwright.config.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

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

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Verify Playwright lists projects**

Run: `npx playwright test --list`
Expected: lists all 7 projects (`setup`, `no-auth`, `standard`, `problem`, `performance_glitch`, `error`, `visual`). May say "No tests found" since no specs exist yet — that's fine.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: add Playwright config with multi-user projects"
```

---

## Task 20: Auth setup file

**Files:**
- Create: `tests/auth.setup.ts`

- [ ] **Step 1: Create `tests/auth.setup.ts`**

```ts
import { test as setup } from '@playwright/test';
import path from 'path';
import { env } from '@utils/env';

const users = ['standard', 'problem', 'performance_glitch', 'error', 'visual'] as const;

for (const user of users) {
  setup(`authenticate as ${user}`, async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="username"]').fill(`${user}_user`);
    await page.locator('[data-test="password"]').fill(env.password);
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/inventory.html');
    await page.context().storageState({ path: path.resolve('auth', `${user}.json`) });
  });
}
```

- [ ] **Step 2: Run setup project to generate storageState files**

Run: `npx playwright test --project=setup`
Expected:
- 5 setup tests pass
- 5 files created: `auth/standard.json`, `auth/problem.json`, `auth/performance_glitch.json`, `auth/error.json`, `auth/visual.json`
- Each JSON file contains a `cookies` array with a `session-username` cookie

If any of the 5 fails: check `.env` exists with `SAUCEDEMO_PASSWORD=secret_sauce`, check internet connectivity to saucedemo.com, check `npx playwright install chromium` was run.

- [ ] **Step 3: Verify typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add tests/auth.setup.ts
git commit -m "feat(tests): add auth setup generating storageState per user"
```

---

## Task 21: Login spec (3 tests, @no-auth)

**Files:**
- Create: `tests/login/login.spec.ts`

- [ ] **Step 1: Create `tests/login/login.spec.ts`**

```ts
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

  test('@no-auth invalid password shows generic error', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.loginAs('standard_user', 'wrong_password');
    await expect(loginPage.errorBanner).toBeVisible();
    expect(await loginPage.getErrorText()).toContain('Username and password do not match');
  });
});
```

- [ ] **Step 2: Run login tests**

Run: `npm run test:no-auth`
Expected: 3 tests pass on the `no-auth` project.

If any fail: check the actual error text on saucedemo.com (open `https://www.saucedemo.com` and reproduce manually). Update the assertion to match exact text.

- [ ] **Step 3: Verify lint catches no issues**

Run: `npm run lint`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add tests/login/login.spec.ts
git commit -m "test(login): add 3 @no-auth login tests"
```

---

## Task 22: Inventory browse spec (1 test, @all-users)

**Files:**
- Create: `tests/inventory/browse.spec.ts`

- [ ] **Step 1: Create `tests/inventory/browse.spec.ts`**

```ts
import { test, expect } from '@fixtures/test';
import { loadProducts } from '@data/fixtures';

test('@all-users inventory shows all 6 products with correct names', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  expect(await inventoryPage.getProductCount()).toBe(6);

  const expectedNames = loadProducts().map((p) => p.name).sort();
  const actualNames = (await inventoryPage.getProductNames()).sort();
  expect(actualNames).toEqual(expectedNames);
});
```

- [ ] **Step 2: Run on standard user first (fast iteration)**

Run: `npm run test:standard -- inventory/browse`
Expected: 1 test passes (1 instance, since `--project=standard` runs only that user).

- [ ] **Step 3: Run on full matrix (5 user projects)**

Run: `npx playwright test inventory/browse`
Expected: 5 test instances pass (one per authenticated user). Note: `problem_user` may have visual quirks but the *count* and *names* should still match.

- [ ] **Step 4: Commit**

```bash
git add tests/inventory/browse.spec.ts
git commit -m "test(inventory): add @all-users browse test verifying 6 products"
```

---

## Task 23: Inventory sort spec (4 parameterized tests, @all-users)

**Files:**
- Create: `tests/inventory/sort.spec.ts`

- [ ] **Step 1: Create `tests/inventory/sort.spec.ts`**

```ts
import { test, expect } from '@fixtures/test';
import { loadSortOrders } from '@data/fixtures';

for (const option of loadSortOrders()) {
  test(`@all-users sort by ${option.label} → first=${option.expectedFirst}`, async ({
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.sortBy(option);
    const names = await inventoryPage.getProductNames();
    expect(names[0]).toBe(option.expectedFirst);
    expect(names[names.length - 1]).toBe(option.expectedLast);
  });
}
```

- [ ] **Step 2: Run sort tests on standard user**

Run: `npm run test:standard -- inventory/sort`
Expected: 4 tests pass (4 sort options × 1 user).

- [ ] **Step 3: Run on full matrix**

Run: `npx playwright test inventory/sort`
Expected: 20 test instances pass (4 sorts × 5 users).

- [ ] **Step 4: Commit**

```bash
git add tests/inventory/sort.spec.ts
git commit -m "test(inventory): add @all-users sort tests parameterized by JSON"
```

---

## Task 24: Cart add/remove spec (2 tests, @all-users)

**Files:**
- Create: `tests/cart/add-remove.spec.ts`

- [ ] **Step 1: Create `tests/cart/add-remove.spec.ts`**

```ts
import { test, expect } from '@fixtures/test';

test.describe('cart add/remove (@all-users)', () => {
  test('@all-users adding a product increments the cart badge', async ({ inventoryPage }) => {
    await inventoryPage.goto();
    expect(await inventoryPage.header.cartBadge.getCount()).toBe(0);

    await inventoryPage.addProductToCart('Sauce Labs Backpack');
    expect(await inventoryPage.header.cartBadge.getCount()).toBe(1);

    await inventoryPage.addProductToCart('Sauce Labs Bike Light');
    expect(await inventoryPage.header.cartBadge.getCount()).toBe(2);
  });

  test('@all-users removing a product decrements the cart badge', async ({
    inventoryPage,
    cartPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.addProductToCart('Sauce Labs Backpack');
    await inventoryPage.addProductToCart('Sauce Labs Bike Light');

    await inventoryPage.header.openCart();
    await expect(cartPage.pageTitle).toHaveText('Your Cart');
    expect(await cartPage.getItemCount()).toBe(2);

    await cartPage.removeItem('Sauce Labs Backpack');
    expect(await cartPage.getItemCount()).toBe(1);
    expect(await cartPage.header.cartBadge.getCount()).toBe(1);
  });
});
```

- [ ] **Step 2: Run cart tests on standard user**

Run: `npm run test:standard -- cart/add-remove`
Expected: 2 tests pass.

- [ ] **Step 3: Run on full matrix**

Run: `npx playwright test cart/add-remove`
Expected: 10 test instances pass (2 tests × 5 users). Note: `problem_user` may behave oddly with cart actions; if a test fails for `problem_user` only, that's a finding to note (saucedemo's intended behavior). For Phase A, the test is expected to pass for all 5 — the broken behavior for `problem_user` is in the visual layer (images), not cart logic.

If `problem_user` fails on cart logic specifically (e.g., the wrong product is added), tag this test `@standard` instead and document the discovery in a follow-up commit.

- [ ] **Step 4: Commit**

```bash
git add tests/cart/add-remove.spec.ts
git commit -m "test(cart): add @all-users add/remove tests using cartBadge composition"
```

---

## Task 25: Checkout happy-path spec (2 parameterized tests, @standard)

**Files:**
- Create: `tests/checkout/happy-path.spec.ts`

- [ ] **Step 1: Create `tests/checkout/happy-path.spec.ts`**

```ts
import { test, expect } from '@fixtures/test';
import { loadValidCheckouts, loadProducts } from '@data/fixtures';

for (const scenario of loadValidCheckouts()) {
  test(`@standard checkout — ${scenario.description}`, async ({
    inventoryPage,
    cartPage,
    checkoutInfoPage,
    checkoutOverviewPage,
    checkoutCompletePage,
  }) => {
    const backpack = loadProducts().find((p) => p.id === 'sauce-labs-backpack');
    if (!backpack) throw new Error('Test data missing: sauce-labs-backpack');

    await inventoryPage.goto();
    await inventoryPage.addProductToCart(backpack.name);
    await inventoryPage.header.openCart();

    await expect(cartPage.pageTitle).toHaveText('Your Cart');
    await cartPage.checkout();

    await expect(checkoutInfoPage.pageTitle).toHaveText('Checkout: Your Information');
    await checkoutInfoPage.fillForm(scenario);
    await checkoutInfoPage.continue();

    await expect(checkoutOverviewPage.pageTitle).toHaveText('Checkout: Overview');
    expect(await checkoutOverviewPage.getItemNames()).toContain(backpack.name);
    expect(await checkoutOverviewPage.getSubtotal()).toBe(backpack.price);
    await checkoutOverviewPage.finish();

    await checkoutCompletePage.expectComplete();
  });
}
```

- [ ] **Step 2: Run checkout happy-path on standard user**

Run: `npx playwright test --project=standard checkout/happy-path`
Expected: 2 tests pass (2 valid checkout scenarios).

If subtotal assertion fails, the cause is usually: saucedemo shows the subtotal as `Item total: $29.99` (with the dollar sign and label). The regex in `getSubtotal()` should extract correctly. If it fails, run `npx playwright test --project=standard --debug` and inspect the actual text in the locator.

- [ ] **Step 3: Commit**

```bash
git add tests/checkout/happy-path.spec.ts
git commit -m "test(checkout): add @standard happy-path with parameterized scenarios"
```

---

## Task 26: Checkout validation spec (2 parameterized tests, @standard)

**Files:**
- Create: `tests/checkout/validation.spec.ts`

- [ ] **Step 1: Create `tests/checkout/validation.spec.ts`**

```ts
import { test, expect } from '@fixtures/test';
import { loadInvalidPostal, loadProducts } from '@data/fixtures';

for (const scenario of loadInvalidPostal()) {
  test(`@standard checkout validation — ${scenario.description}`, async ({
    inventoryPage,
    cartPage,
    checkoutInfoPage,
  }) => {
    const backpack = loadProducts().find((p) => p.id === 'sauce-labs-backpack');
    if (!backpack) throw new Error('Test data missing: sauce-labs-backpack');

    await inventoryPage.goto();
    await inventoryPage.addProductToCart(backpack.name);
    await inventoryPage.header.openCart();
    await cartPage.checkout();

    await checkoutInfoPage.fillForm(scenario);
    await checkoutInfoPage.continue();

    await expect(checkoutInfoPage.errorBanner).toBeVisible();
    expect(await checkoutInfoPage.getErrorText()).toContain(scenario.expectError ?? '');
  });
}
```

- [ ] **Step 2: Run validation tests**

Run: `npx playwright test --project=standard checkout/validation`
Expected: 2 tests pass (2 invalid scenarios).

- [ ] **Step 3: Commit**

```bash
git add tests/checkout/validation.spec.ts
git commit -m "test(checkout): add @standard validation tests with expectError"
```

---

## Task 27: Visual inventory-images spec (1 test, @problem)

**Files:**
- Create: `tests/visual/inventory-images.spec.ts`

- [ ] **Step 1: Create `tests/visual/inventory-images.spec.ts`**

```ts
import { test, expect } from '@fixtures/test';

// Saucedemo's "problem_user" intentionally serves the wrong image for every product
// (all images point to the same broken-image asset). This test asserts that
// behavior so we'd catch a regression if saucedemo "fixed" the problem user.
test('@problem problem_user inventory images all share one broken src', async ({
  inventoryPage,
}) => {
  await inventoryPage.goto();

  const productNames = await inventoryPage.getProductNames();
  expect(productNames.length).toBe(6);

  const srcs = await Promise.all(
    productNames.map(async (name) => {
      const card = await inventoryPage.getProductCard(name);
      return card.getImageSrc();
    }),
  );

  // All 6 product images should resolve to the SAME asset (the bug-pattern of problem_user)
  const uniqueSrcs = new Set(srcs);
  expect(uniqueSrcs.size).toBe(1);
});
```

- [ ] **Step 2: Run problem-only test**

Run: `npm run test:problem -- visual/inventory-images`
Expected: 1 test passes on the `problem` project.

If saucedemo has changed `problem_user`'s behavior since this plan was written and all images now have unique srcs, the test will fail with `expect(uniqueSrcs.size).toBe(1)`. In that case: log the actual srcs, adjust the assertion to match what `problem_user` actually does (e.g., "at least one product has a wrong image alt"), and document the change in the commit message.

- [ ] **Step 3: Commit**

```bash
git add tests/visual/inventory-images.spec.ts
git commit -m "test(visual): add @problem image-src test for problem_user"
```

---

## Task 28: Run the full matrix and verify Definition of Done

**Files:** none modified — verification only.

- [ ] **Step 1: Clean previous results** (PowerShell on Windows)

Run:
```powershell
Remove-Item -Recurse -Force test-results, playwright-report -ErrorAction SilentlyContinue
Remove-Item auth/*.json -Force -ErrorAction SilentlyContinue
```

(POSIX equivalent if running under WSL/Git Bash: `rm -rf test-results playwright-report auth/*.json`)

- [ ] **Step 2: Run the full matrix from a clean state**

Run: `npm test`

Expected counts per project:
| Project | Tests | Source |
|---|---|---|
| `setup` | 5 | one auth-setup per user |
| `no-auth` | 3 | login.spec.ts |
| `standard` | 11 | browse(1) + sort(4) + add-remove(2) + happy(2) + validation(2) |
| `problem` | 8 | browse(1) + sort(4) + add-remove(2) + visual(1) |
| `performance_glitch` | 7 | browse(1) + sort(4) + add-remove(2) |
| `error` | 7 | browse(1) + sort(4) + add-remove(2) |
| `visual` | 7 | browse(1) + sort(4) + add-remove(2) |
| **Total** | **48** | |

Run report: `npm run report`. Inspect each project's pane.

- [ ] **Step 3: Verify all Definition-of-Done criteria from the spec**

Run each in turn and confirm exit 0:
```bash
npm run typecheck
npm run lint
npm run format:check
npm run test:standard
npm run test:no-auth
```

- [ ] **Step 4: Verify pattern coverage matrix**

Open `docs/superpowers/specs/2026-05-09-phase-a-framework-foundation-design.md` Section 9. Visually confirm each row has the file it claims:
- Page with locators only: `LoginPage`, `CheckoutCompletePage` ✓
- Page composing components: `InventoryPage`, `CartPage` ✓
- Component composing component: `Header` → `CartBadge` ✓
- `storageState` setup: `auth.setup.ts` ✓
- `no-auth` project: `tests/login/*` ✓
- `@all-users` matrix tag: `browse`, `sort`, `add-remove` ✓
- Single-user pin tag: `happy-path` (`@standard`), `inventory-images` (`@problem`) ✓
- JSON-driven parameterization: `sort`, `happy-path`, `validation` ✓
- `@data/*` typed loader imports: every test using scenarios ✓
- `@fixtures/test` page injection: every test ✓
- `expectError` negative paths: `validation` ✓

- [ ] **Step 5: Final commit (if any verification scripts produced changes; otherwise skip)**

If nothing changed, skip. Otherwise:
```bash
git status
git add <changed files>
git commit -m "chore: phase A complete — full matrix passing"
```

- [ ] **Step 6: Tag the milestone**

Run:
```bash
git tag -a phase-a-complete -m "Phase A framework foundation complete"
```

---

## Self-review notes (already applied)

The plan was reviewed against the spec before writing. Coverage check:

| Spec section | Tasks |
|---|---|
| §3 Folder structure | Tasks 4, 8–17, 18, 19, 20, 21–27 (every folder has a creator) |
| §4 Composition rules | Encoded in components/pages tasks (8–17): `readonly` fields, no fluent returns, `root`-scoped components, page-direct locators on LoginPage |
| §5 Multi-user infra | Task 19 (config), Task 20 (auth.setup), Task 21 (no-auth tag), Tasks 22–27 (all-users + pinned tags) |
| §6 Data layer | Tasks 5, 6, 7 |
| §7 Page/Component examples | Tasks 8–17 implement them; canonical example matches Task 13 InventoryPage |
| §8 Configuration & tooling | Tasks 1, 2, 3, 4, 19 |
| §9 Initial test scope | Tasks 21–27 (matches table 1:1) |
| §10 Definition of Done | Task 28 verifies every criterion |
| §11 Out of scope | Plan contains no CI workflow, no cross-browser config, no AI tooling — confirmed |
