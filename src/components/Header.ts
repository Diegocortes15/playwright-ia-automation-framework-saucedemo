// Created by /from-issue on 2026-06-01 from Jira SW-6 (first cart ticket).
// Manual edits are welcome — this file is not regenerated automatically.

import { test, type Locator, type Page } from '@playwright/test';
import { CartBadge } from '@components/CartBadge';

// The saucedemo header is shared across authenticated pages (inventory, cart,
// checkout). It carries the cart-count badge and the cart link, so it lives as
// a component composed by both InventoryPage and CartPage (composition rule #10).
export class Header {
  // Composed child component first (ADR-0001 rule #6) — nesting depth 2 (rule #11).
  readonly cartBadge: CartBadge;
  // Header-direct locators second. cartLink is public so a composing page can
  // assert the cart icon's visibility directly (e.g. CheckoutInfoPage, SW-8).
  readonly cartLink: Locator;

  constructor(public readonly page: Page) {
    this.cartBadge = new CartBadge(page);
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
  }

  // Composed action — body wrapped in exactly one test.step.
  async openCart(): Promise<void> {
    await test.step('Open the cart from the header', async () => {
      await this.cartLink.click();
    });
  }

  // Query — delegates to the badge child (ADR-0001 rule #8).
  async getCartItemCount(): Promise<number> {
    return this.cartBadge.getCount();
  }
}
