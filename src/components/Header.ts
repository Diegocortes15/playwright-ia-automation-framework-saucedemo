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
  // Burger side-panel options + close button (SW-11). Same React-internal,
  // data-test-less elements as Logout, so CSS ids again. The panel collapses
  // its option links to width 0 when closed and 252 when open, so Playwright
  // treats them as hidden/visible accordingly — which is what lets a spec
  // assert the panel opened (AC 1) or closed (AC 5) via toBeVisible/toBeHidden.
  // The three options are public readonly so a spec can assert their visibility
  // (mirrors cartLink / CartPage.checkoutButton); the close button is private.
  readonly allItemsOption: Locator;
  readonly aboutOption: Locator;
  readonly resetAppStateOption: Locator;
  private readonly menuCloseButton: Locator;

  constructor(public readonly page: Page) {
    this.cartBadge = new CartBadge(page);
    this.cartLink = page.locator('[data-test="shopping-cart-link"]');
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
    this.allItemsOption = page.locator('#inventory_sidebar_link');
    this.aboutOption = page.locator('#about_sidebar_link');
    this.resetAppStateOption = page.locator('#reset_sidebar_link');
    this.menuCloseButton = page.locator('#react-burger-cross-btn');
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

  // Burger side-panel actions (SW-11). logout() above opens-and-acts in one
  // step; these split "open the panel" from "pick an option" so a spec can open
  // the panel and inspect it (AC 1), close it (AC 5), or open-then-select.
  async openMenu(): Promise<void> {
    await test.step('Open the burger menu', async () => {
      await this.menuButton.click();
    });
  }

  async closeMenu(): Promise<void> {
    await test.step('Close the burger menu', async () => {
      await this.menuCloseButton.click();
    });
  }

  // Composed actions — pick a side-panel option (the panel must already be open).
  async selectAllItems(): Promise<void> {
    await test.step('Select "All Items" from the burger menu', async () => {
      await this.allItemsOption.click();
    });
  }

  async selectAbout(): Promise<void> {
    await test.step('Select "About" from the burger menu', async () => {
      await this.aboutOption.click();
    });
  }

  async resetAppState(): Promise<void> {
    await test.step('Reset the app state from the burger menu', async () => {
      await this.resetAppStateOption.click();
    });
  }

  // Query — delegates to the badge child (ADR-0001 rule #8).
  async getCartItemCount(): Promise<number> {
    return this.cartBadge.getCount();
  }
}
