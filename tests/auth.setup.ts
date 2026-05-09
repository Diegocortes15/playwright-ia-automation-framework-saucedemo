import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '@utils/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.resolve(__dirname, '..', 'auth');

const users = ['standard', 'problem', 'performance_glitch', 'error', 'visual'] as const;

for (const user of users) {
  setup(`authenticate as ${user}`, async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-test="username"]').fill(`${user}_user`);
    await page.locator('[data-test="password"]').fill(env.password);
    await page.locator('[data-test="login-button"]').click();
    await page.waitForURL('**/inventory.html');
    await page.context().storageState({ path: path.join(authDir, `${user}.json`) });
  });
}
