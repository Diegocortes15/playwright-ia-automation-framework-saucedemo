// Created by /from-issue on 2026-06-01 from Jira SW-6 (first cart ticket).
// Manual edits are welcome — this file is not regenerated automatically.

import { type Locator, type Page } from '@playwright/test';

// The shopping-cart count badge in the header. saucedemo only renders this
// element when the cart count > 0 — an empty cart has NO badge in the DOM —
// so getCount() reports 0 when the element is absent.
export class CartBadge {
  readonly root: Locator;

  constructor(public readonly page: Page) {
    this.root = page.locator('[data-test="shopping-cart-badge"]');
  }

  // Query — returns data, never a Locator (ADR-0001 rule #8). 0 means the
  // badge is absent (empty cart); saucedemo never renders a literal "0".
  async getCount(): Promise<number> {
    if ((await this.root.count()) === 0) return 0;
    return Number((await this.root.textContent())?.trim() ?? '0');
  }
}
