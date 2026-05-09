import { test, expect } from '@fixtures/test';
import { loadSortOrders } from '@data/fixtures';

for (const option of loadSortOrders()) {
  test(`@sort-functional sort by ${option.label} → first=${option.expectedFirst}`, async ({
    inventoryPage,
  }) => {
    await inventoryPage.goto();
    await inventoryPage.sortBy(option);
    const names = await inventoryPage.getProductNames();
    expect(names[0]).toBe(option.expectedFirst);
    expect(names[names.length - 1]).toBe(option.expectedLast);
  });
}
