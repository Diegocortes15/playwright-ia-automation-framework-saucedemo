import { test, expect } from '@fixtures/test';
import { loadInvalidPostal, getProductById } from '@data/fixtures';

const backpack = getProductById('sauce-labs-backpack');

for (const scenario of loadInvalidPostal()) {
  test(`@standard checkout validation — ${scenario.description}`, async ({
    inventoryPage,
    cartPage,
    checkoutInfoPage,
  }) => {
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
