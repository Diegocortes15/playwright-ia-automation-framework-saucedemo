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
