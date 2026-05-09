import { test, expect } from '@fixtures/test';
import { loadInvalidPostal, loadProducts } from '@data/fixtures';

for (const scenario of loadInvalidPostal()) {
  test(`@standard checkout validation — ${scenario.description}`, async ({
    inventoryPage,
    cartPage,
    checkoutInfoPage,
  }) => {
    const backpack = loadProducts().find((p) => p.id === 'sauce-labs-backpack');
    if (!backpack) throw new Error('Test data missing: sauce-labs-backpack');

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
