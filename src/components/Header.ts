// Created by /from-issue on 2026-06-01 from Jira SW-6 (first cart ticket).
// Manual edits are welcome — this file is not regenerated automatically.

import { test, type Locator, type Page } from '@playwright/test';
import { CartBadge } from '@components/CartBadge';
import { BurgerMenu } from '@components/BurgerMenu';

// The saucedemo header is shared across authenticated pages (inventory, cart,
// checkout). It composes two self-contained widgets — the cart-count badge and
// the burger side-panel — and holds the page-direct cart link, so it lives as a
// component composed by every authenticated page (composition rule #10).
export class Header {
  // Composed child components first (ADR-0001 rule #6) — each is nesting depth 2 (rule #11).
  readonly cartBadge: CartBadge;
  readonly burgerMenu: BurgerMenu;
  // Header-direct locators second. Public so a composing page can re-expose it
  // for a visibility assertion (the cart icon, SW-8) — mirrors the public
  // readonly Locator pattern used for CartPage.checkoutButton.
  readonly cartLink: Locator;

  constructor(public readonly page: Page) {
    this.cartBadge = new CartBadge(page);
    this.burgerMenu = new BurgerMenu(page);
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
