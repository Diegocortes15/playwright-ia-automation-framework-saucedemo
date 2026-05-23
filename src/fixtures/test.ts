// Blank-slate fixture (experiment-rebuild-from-scratch branch).
// As /scaffold-page-object generates page objects, register them here so
// tests can destructure them from `test()` args (e.g., `async ({ loginPage }) => ...`).
//
// Pattern when adding a page (manual step today — see GAPS.md):
//   1. import { LoginPage } from '@pages/LoginPage';
//   2. add `loginPage: LoginPage` to the Pages type
//   3. add a fixture entry: loginPage: async ({ page }, use) => { await use(new LoginPage(page)); }

import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';

type Pages = {
  loginPage: LoginPage;
};

export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
});
export { expect };
