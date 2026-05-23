# Playwright Conventions Reference

The `/from-issue` skill consults this doc when rendering test files (Step 7 of [`workflow.md`](workflow.md)). These conventions are lifted from https://playwright.dev/docs/best-practices so the skill has them available offline.

## Locator preference order

Use the highest-priority locator that uniquely identifies the element. **This matches CLAUDE.md's "Selector preference order" exactly** (single source of truth). Upstream Playwright docs recommend `getByRole` first; this project prioritizes `[data-test="..."]` attributes because saucedemo (and most apps the framework targets) provide explicit testing affordances.

### 1. `[data-test="..."]` attribute selectors

```ts
await page.locator('[data-test="login-button"]').click();
```

Explicit testing affordance. CLAUDE.md's required default. Survives styling changes; brittle only if someone removes the attribute (which a code reviewer would catch).

### 2. `getByRole(name, options)` with accessible name

```ts
await page.getByRole('button', { name: 'Login' }).click();
await page.getByRole('textbox', { name: 'Username' }).fill('standard_user');
```

When no `data-test` attribute exists. Survives most UI refactors (text/style changes don't break the locator if the role + name stay), accessibility-friendly.

### 3. Text-based matchers (`getByLabel`, `getByText`, `getByPlaceholder`)

```ts
await page.getByLabel('Username').fill('standard_user');
await page.getByText('Login').click();
```

When neither `data-test` nor an accessible role is exposed but a human-visible label exists.

### 4. CSS selectors (last resort)

```ts
await page.locator('.btn-primary').click();
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
