import { Page, Locator } from '@playwright/test';

export class ProductCard {
  private readonly root: Locator;
  readonly name: Locator;
  readonly price: Locator;
  readonly description: Locator;
  readonly addToCartButton: Locator;
  readonly removeButton: Locator;
  readonly image: Locator;

  constructor(
    page: Page,
    productName: string,
  ) {
    this.root = page.locator('[data-test="inventory-item"]', { hasText: productName });
    this.name = this.root.locator('[data-test="inventory-item-name"]');
    this.price = this.root.locator('[data-test="inventory-item-price"]');
    this.description = this.root.locator('[data-test="inventory-item-desc"]');
    this.addToCartButton = this.root.getByRole('button', { name: /Add to cart/i });
    this.removeButton = this.root.getByRole('button', { name: /Remove/i });
    this.image = this.root.locator('img.inventory_item_img');
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  async remove(): Promise<void> {
    await this.removeButton.click();
  }

  async getName(): Promise<string> {
    return (await this.name.textContent()) ?? '';
  }

  async getPrice(): Promise<number> {
    const text = (await this.price.textContent()) ?? '';
    return parseFloat(text.replace('$', ''));
  }

  async getImageSrc(): Promise<string> {
    return (await this.image.getAttribute('src')) ?? '';
  }
}
