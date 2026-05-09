import { test, expect } from '@fixtures/test';

// Saucedemo's "problem_user" intentionally serves the wrong image for every product
// (all images point to the same broken-image asset). This test asserts that
// behavior so we'd catch a regression if saucedemo "fixed" the problem user.
test('@problem problem_user inventory images all share one broken src', async ({
  inventoryPage,
}) => {
  await inventoryPage.goto();

  const productNames = await inventoryPage.getProductNames();
  expect(productNames).toHaveLength(6);

  const srcs = await Promise.all(
    productNames.map(async (name) => {
      const card = await inventoryPage.getProductCard(name);
      return card.getImageSrc();
    }),
  );

  // All 6 product images should resolve to the SAME asset (the problem_user broken-image bug)
  const uniqueSrcs = new Set(srcs);
  expect(uniqueSrcs.size).toBe(1);
});
