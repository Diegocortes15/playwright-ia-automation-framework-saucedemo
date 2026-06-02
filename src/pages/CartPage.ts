// Created by /from-issue on 2026-06-01 from Jira SW-6.
// Source: https://diegocortes15.atlassian.net/browse/SW-6
// Title: [SW][QA][Inventory] User can add products to cart
// Manual edits are welcome — this file is not regenerated automatically.

import { test, type Locator, type Page } from '@playwright/test';
import { Header } from '@components/Header';

export class CartPage {
  // Composed components first (ADR-0001 rule #6).
  readonly header: Header;
  // Page-direct locators second.
  private readonly cartList: Locator;
  private readonly itemNames: Locator;
  private readonly continueShoppingButton: Locator;
  // Public so a test can assert it's displayed (AC 1, SW-7) — mirrors the
  // LoginPage.errorBanner pattern for visibility assertions.
  readonly checkoutButton: Locator;

  constructor(public readonly page: Page) {
    this.header = new Header(page);
    this.cartList = page.locator('[data-test="cart-list"]');
    this.itemNames = this.cartList.locator('[data-test="inventory-item-name"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  // Composed / intent-level action — body wrapped in exactly one test.step.
  async goto(): Promise<void> {
    await test.step('Navigate to the cart page', async () => {
      await this.page.goto('/cart.html');
    });
  }

  // A single cart row, scoped by its product title. Exact match so a short
  // name can't also match a longer one that contains it (playwright-conventions
  // "Exact-match for named-element filters").
  private cartItem(productName: string): Locator {
    return this.cartList.locator('[data-test="inventory-item"]').filter({
      has: this.page.getByText(productName, { exact: true }),
    });
  }

  // Composed action — remove one product from the cart.
  async removeItem(productName: string): Promise<void> {
    await test.step(`Remove "${productName}" from the cart`, async () => {
      await this.cartItem(productName).getByRole('button', { name: /^Remove$/i }).click();
    });
  }

  // Composed action — return to the inventory page.
  async continueShopping(): Promise<void> {
    await test.step('Continue shopping', async () => {
      await this.continueShoppingButton.click();
    });
  }

  // Composed action — proceed to Checkout: Your Information (SW-7).
  async checkout(): Promise<void> {
    await test.step('Proceed to checkout', async () => {
      await this.checkoutButton.click();
    });
  }

  // Queries — return data, never a Locator (ADR-0001 rule #8).

  /** Product titles in cart-list DOM order (saucedemo preserves insertion order). */
  async getItemNames(): Promise<string[]> {
    return (await this.itemNames.allTextContents()).map((name) => name.trim());
  }

  async getItemCount(): Promise<number> {
    return this.cartList.locator('[data-test="inventory-item"]').count();
  }

  async getItemQuantity(productName: string): Promise<string> {
    return (
      (await this.cartItem(productName).locator('[data-test="item-quantity"]').textContent())?.trim() ??
      ''
    );
  }

  async getItemDescription(productName: string): Promise<string> {
    return (
      (await this.cartItem(productName)
        .locator('[data-test="inventory-item-desc"]')
        .textContent())?.trim() ?? ''
    );
  }

  async getItemPrice(productName: string): Promise<string> {
    return (
      (await this.cartItem(productName)
        .locator('[data-test="inventory-item-price"]')
        .textContent())?.trim() ?? ''
    );
  }

  async hasRemoveButton(productName: string): Promise<boolean> {
    return (await this.cartItem(productName).getByRole('button', { name: /^Remove$/i }).count()) > 0;
  }

  /** Cart count from the header badge; 0 when the badge is absent (empty cart). */
  async getCartBadgeCount(): Promise<number> {
    return this.header.getCartItemCount();
  }
}
