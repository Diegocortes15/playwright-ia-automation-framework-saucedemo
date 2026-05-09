import { Page, Locator } from '@playwright/test';

export class CartBadge {
  readonly badge: Locator;
  readonly icon: Locator;

  constructor(page: Page) {
    this.badge = page.locator('[data-test="shopping-cart-badge"]');
    this.icon = page.locator('[data-test="shopping-cart-link"]');
  }

  async getCount(): Promise<number> {
    try {
      await this.badge.waitFor({ state: 'attached', timeout: 1000 });
    } catch {
      return 0;
    }
    return parseInt((await this.badge.textContent()) ?? '0', 10);
  }

  async click(): Promise<void> {
    await this.icon.click();
  }
}
