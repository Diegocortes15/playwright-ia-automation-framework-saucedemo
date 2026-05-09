import { test, expect } from '@fixtures/test';
import { loadProducts } from '@data/fixtures';

test('@all-users inventory shows all 6 products with correct names', async ({ inventoryPage }) => {
  await inventoryPage.goto();
  expect(await inventoryPage.getProductCount()).toBe(6);

  const expectedNames = loadProducts()
    .map((p) => p.name)
    .sort();
  const actualNames = (await inventoryPage.getProductNames()).sort();
  expect(actualNames).toEqual(expectedNames);
});
