import { basename, dirname } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { InventoryPage } from '@pages/InventoryPage';
import { CartPage } from '@pages/CartPage';
import { CheckoutInfoPage } from '@pages/checkout/CheckoutInfoPage';
import { CheckoutOverviewPage } from '@pages/checkout/CheckoutOverviewPage';
import { CheckoutCompletePage } from '@pages/checkout/CheckoutCompletePage';
import { reportAnnotations } from '@utils/report-annotations';

type Pages = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutInfoPage: CheckoutInfoPage;
  checkoutOverviewPage: CheckoutOverviewPage;
  checkoutCompletePage: CheckoutCompletePage;
};

export const test = base.extend<Pages & { _reportAnnotation: void }>({
  // Auto fixture — annotate each test in the Playwright report with its Jira
  // ticket link(s) and the acceptance criterion it covers, derived from
  // `.tcms/records/<feature>.json` (feature = the spec's parent dir). No per-test
  // boilerplate; correct for augmented multi-ticket feature files.
  _reportAnnotation: [
    async ({}, use, testInfo) => {
      const feature = basename(dirname(testInfo.file));
      testInfo.annotations.push(...reportAnnotations(feature, testInfo.title));
      await use();
    },
    { auto: true },
  ],

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  inventoryPage: async ({ page }, use) => {
    await use(new InventoryPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutInfoPage: async ({ page }, use) => {
    await use(new CheckoutInfoPage(page));
  },
  checkoutOverviewPage: async ({ page }, use) => {
    await use(new CheckoutOverviewPage(page));
  },
  checkoutCompletePage: async ({ page }, use) => {
    await use(new CheckoutCompletePage(page));
  },
});
export { expect };
