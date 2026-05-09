import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';

export class CheckoutOverviewPage {
  readonly header: Header;
  readonly pageTitle: Locator;
  readonly cartList: Locator;
  readonly subtotalLabel: Locator;
  readonly taxLabel: Locator;
  readonly totalLabel: Locator;
  readonly finishButton: Locator;
  readonly cancelButton: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.cartList = page.locator('[data-test="cart-list"]');
    this.subtotalLabel = page.locator('[data-test="subtotal-label"]');
    this.taxLabel = page.locator('[data-test="tax-label"]');
    this.totalLabel = page.locator('[data-test="total-label"]');
    this.finishButton = page.locator('[data-test="finish"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout-step-two.html');
    await expect(this.pageTitle).toHaveText('Checkout: Overview');
  }

  async getItemNames(): Promise<string[]> {
    return this.cartList.locator('[data-test="inventory-item-name"]').allTextContents();
  }

  async getSubtotal(): Promise<number> {
    return this.parsePrice(this.subtotalLabel, 'subtotal');
  }

  async getTotal(): Promise<number> {
    return this.parsePrice(this.totalLabel, 'total');
  }

  private async parsePrice(label: Locator, kind: string): Promise<number> {
    const text = (await label.textContent()) ?? '';
    const match = text.match(/\$([\d.]+)/);
    if (!match) {
      throw new Error(`Could not parse ${kind} from label text: "${text}"`);
    }
    return parseFloat(match[1]);
  }

  async finish(): Promise<void> {
    await this.finishButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
