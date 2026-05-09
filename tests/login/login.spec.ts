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
