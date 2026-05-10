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
