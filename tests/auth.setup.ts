import { test as setup } from '@playwright/test';
import path from 'path';
import { env } from '@utils/env';

// Generates per-user storageState consumed by the authenticated projects in
// playwright.config.ts. The clean-room branch grows ticket-by-ticket: only
// `standard` is wired so far (first needed by SW-2 / footer). Add users here
// as later tickets introduce their projects.
const users = ['standard'] as const;

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
