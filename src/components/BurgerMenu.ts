// Extracted from Header (SW-11) — the burger menu is a self-contained widget, so
// it lives as its own component composed by Header (like CartBadge). Manual edits
// are welcome — this file is not regenerated automatically.

import { test, type Locator, type Page } from '@playwright/test';

// The saucedemo burger side-panel (react-burger-menu): a toggle button opens a
// panel of options — All Items, About, Reset App State, Logout — with a close (X).
// Composed by Header (nesting depth 2, like CartBadge — ADR-0001 rule #11). The
// option links are React-internal with no data-test, so CSS ids are the best
// available selector (selector order #4). The panel collapses its option links to
// width 0 when closed and 252 when open, so Playwright treats them as hidden/visible
// accordingly — which is what lets a spec assert the panel opened or closed via
// toBeVisible() / toBeHidden().
export class BurgerMenu {
  // Public option locators so a spec can assert their visibility (mirrors the
  // public-readonly-Locator pattern used for cartLink / CartPage.checkoutButton).
  readonly allItemsOption: Locator;
  readonly aboutOption: Locator;
  readonly resetAppStateOption: Locator;
  // Toggle + close + logout link are internal — specs go through the actions below.
  private readonly openButton: Locator;
  private readonly closeButton: Locator;
  private readonly logoutLink: Locator;

  constructor(public readonly page: Page) {
    // The react-burger-menu widget renders its toggle and close button with no data-test
    // attribute (verified live against the app), so the id is the top level available here.
    // eslint-disable-next-line no-restricted-syntax -- no data-test on this widget
    this.openButton = page.locator('#react-burger-menu-btn');
    // eslint-disable-next-line no-restricted-syntax -- no data-test on this widget
    this.closeButton = page.locator('#react-burger-cross-btn');
    this.logoutLink = page.locator('[data-test="logout-sidebar-link"]');
    this.allItemsOption = page.locator('[data-test="inventory-sidebar-link"]');
    this.aboutOption = page.locator('[data-test="about-sidebar-link"]');
    this.resetAppStateOption = page.locator('[data-test="reset-sidebar-link"]');
  }

  // Composed actions — each wrapped in exactly one test.step.
  async open(): Promise<void> {
    await test.step('Open the burger menu', async () => {
      await this.openButton.click();
    });
  }

  async close(): Promise<void> {
    await test.step('Close the burger menu', async () => {
      await this.closeButton.click();
    });
  }

  // Open the panel and log out — saucedemo ends the session and returns to login (/).
  async logout(): Promise<void> {
    await test.step('Log out via the burger menu', async () => {
      await this.openButton.click();
      await this.logoutLink.click();
    });
  }

  // Pick a side-panel option (the panel must already be open).
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
}
