import { test as setup } from '@playwright/test';
import path from 'path';
import { env } from '@utils/env';
import { AUTH_USERS } from './users';

// Generates per-user storageState consumed by the authenticated projects in
// playwright.config.ts. Both derive from tests/users.ts (AUTH_USERS) — the
// single source of truth /from-issue grows one user at a time (Phase H / ADR-0014).

// Wrapped in a named describe so the HTML report groups these under
// "Authentication" instead of "<anonymous>".
setup.describe('Authentication', () => {
  for (const user of AUTH_USERS) {
    setup(`authenticate as ${user}`, async ({ page }) => {
      await page.goto('/');
      await page.locator('[data-test="username"]').fill(`${user}_user`);
      await page.locator('[data-test="password"]').fill(env.password);
      await page.locator('[data-test="login-button"]').click();
      await page.waitForURL('**/inventory.html');
      await page.context().storageState({ path: path.resolve('auth', `${user}.json`) });
    });
  }
});
