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
  // Header-direct locators second. Public so a composing page can re-expose it
  // for a visibility assertion (the cart icon, SW-8) — mirrors the public
  // readonly Locator pattern used for CartPage.checkoutButton.
  readonly cartLink: Locator;
  // Burger menu toggle + Logout link (SW-10). Both are React-internal elements
  // with no data-test, so a CSS id is the best available selector (selector
  // order #4) — documented in docs/app/flows.md §6.
  private readonly menuButton: Locator;
  private readonly logoutLink: Locator;

  constructor(public readonly page: Page) {
    this.cartBadge = new CartBadge(page);
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
  }

  // Composed action — body wrapped in exactly one test.step.
  async openCart(): Promise<void> {
    await test.step('Open the cart from the header', async () => {
      await this.cartLink.click();
    });
  }

  // Composed action — open the burger menu and log out (SW-10). Saucedemo ends
  // the session and returns the browser to the login screen (/).
  async logout(): Promise<void> {
    await test.step('Log out via the burger menu', async () => {
      await this.menuButton.click();
      await this.logoutLink.click();
    });
  }

  // Query — delegates to the badge child (ADR-0001 rule #8).
  async getCartItemCount(): Promise<number> {
    return this.cartBadge.getCount();
  }
}
