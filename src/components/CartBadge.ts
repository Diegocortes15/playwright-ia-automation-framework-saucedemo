import { Page, Locator } from '@playwright/test';

export class CartBadge {
  readonly badge: Locator;
  readonly icon: Locator;

  constructor(page: Page) {
    this.badge = page.locator('[data-test="shopping-cart-badge"]');
    this.icon = page.locator('[data-test="shopping-cart-link"]');
  }

  async getCount(): Promise<number> {
    if (!(await this.badge.isVisible())) return 0;
    return parseInt((await this.badge.textContent()) ?? '0', 10);
  }

  async click(): Promise<void> {
    await this.icon.click();
  }
}
