import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import { ProductCard } from '@components/ProductCard';
import { SortDropdown } from '@components/SortDropdown';
import type { SortOption } from '@data/types';

export class InventoryPage {
  readonly header: Header;
  readonly sort: SortDropdown;
  readonly productGrid: Locator;
  readonly pageTitle: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.sort = new SortDropdown(page);
    this.productGrid = page.locator('[data-test="inventory-list"]');
    this.pageTitle = page.locator('[data-test="title"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/inventory.html');
    await expect(this.pageTitle).toHaveText('Products');
  }

  async addProductToCart(productName: string): Promise<void> {
    const card = new ProductCard(this.page, productName);
    await card.addToCart();
  }

  async removeProductFromCart(productName: string): Promise<void> {
    const card = new ProductCard(this.page, productName);
    await card.remove();
  }

  async sortBy(option: SortOption): Promise<void> {
    await this.sort.selectByValue(option.value);
  }

  async getProductNames(): Promise<string[]> {
    return this.productGrid.locator('[data-test="inventory-item-name"]').allTextContents();
  }

  async getProductCount(): Promise<number> {
    return this.productGrid.locator('[data-test="inventory-item"]').count();
  }

  async getProductCard(productName: string): Promise<ProductCard> {
    return new ProductCard(this.page, productName);
  }
}
