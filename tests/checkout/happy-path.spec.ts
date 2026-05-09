import { test, expect } from '@fixtures/test';
import { loadValidCheckouts, getProductById } from '@data/fixtures';

const backpack = getProductById('sauce-labs-backpack');

for (const scenario of loadValidCheckouts()) {
  test(`@standard checkout — ${scenario.description}`, async ({
    inventoryPage,
    cartPage,
    checkoutInfoPage,
    checkoutOverviewPage,
    checkoutCompletePage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.addProductToCart(backpack.name);
    await inventoryPage.header.openCart();

    await expect(cartPage.pageTitle).toHaveText('Your Cart');
    await cartPage.checkout();

    await expect(checkoutInfoPage.pageTitle).toHaveText('Checkout: Your Information');
    await checkoutInfoPage.fillForm(scenario);
    await checkoutInfoPage.continue();

    await expect(checkoutOverviewPage.pageTitle).toHaveText('Checkout: Overview');
    expect(await checkoutOverviewPage.getItemNames()).toContain(backpack.name);
    expect(await checkoutOverviewPage.getSubtotal()).toBe(backpack.price);
    await checkoutOverviewPage.finish();

    await checkoutCompletePage.expectComplete();
  });
}
