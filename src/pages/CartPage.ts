import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import { ProductCard } from '@components/ProductCard';

export class CartPage {
  readonly header: Header;
  readonly cartList: Locator;
  readonly pageTitle: Locator;
  readonly continueShoppingButton: Locator;
  readonly checkoutButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.cartList = page.locator('[data-test="cart-list"]');
    this.pageTitle = page.locator('[data-test="title"]');
    this.continueShoppingButton = page.locator('[data-test="continue-shopping"]');
    this.checkoutButton = page.locator('[data-test="checkout"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart.html');
    await expect(this.pageTitle).toHaveText('Your Cart');
  }

  async getItemNames(): Promise<string[]> {
    return this.cartList.locator('[data-test="inventory-item-name"]').allTextContents();
  }

  async getItemCount(): Promise<number> {
    return this.cartList.locator('[data-test="inventory-item"]').count();
  }

  async removeItem(productName: string): Promise<void> {
    const card = new ProductCard(this.page, productName);
    await card.remove();
  }

  async checkout(): Promise<void> {
    await this.checkoutButton.click();
  }

  async continueShopping(): Promise<void> {
    await this.continueShoppingButton.click();
  }
}
