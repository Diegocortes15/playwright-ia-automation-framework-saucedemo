import { test, expect } from '@fixtures/test';

test.describe('cart add/remove (@all-users)', () => {
  test('@all-users adding a product increments the cart badge', async ({ inventoryPage }) => {
    await inventoryPage.goto();
    expect(await inventoryPage.header.cartBadge.getCount()).toBe(0);

    await inventoryPage.addProductToCart('Sauce Labs Backpack');
    expect(await inventoryPage.header.cartBadge.getCount()).toBe(1);

    await inventoryPage.addProductToCart('Sauce Labs Bike Light');
    expect(await inventoryPage.header.cartBadge.getCount()).toBe(2);
  });

  test('@all-users removing a product decrements the cart badge', async ({
    inventoryPage,
    cartPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.addProductToCart('Sauce Labs Backpack');
    await inventoryPage.addProductToCart('Sauce Labs Bike Light');

    await inventoryPage.header.openCart();
    await expect(cartPage.pageTitle).toHaveText('Your Cart');
    expect(await cartPage.getItemCount()).toBe(2);

    await cartPage.removeItem('Sauce Labs Backpack');
    expect(await cartPage.getItemCount()).toBe(1);
    expect(await cartPage.header.cartBadge.getCount()).toBe(1);
  });
});
