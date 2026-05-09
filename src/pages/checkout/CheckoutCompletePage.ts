import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';

export class CheckoutCompletePage {
  readonly header: Header;
  readonly pageTitle: Locator;
  readonly thankYouHeader: Locator;
  readonly completeText: Locator;
  readonly ponyExpressImage: Locator;
  readonly backHomeButton: Locator;

  constructor(page: Page) {
    this.header = new Header(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.thankYouHeader = page.locator('[data-test="complete-header"]');
    this.completeText = page.locator('[data-test="complete-text"]');
    this.ponyExpressImage = page.locator('[data-test="pony-express"]');
    this.backHomeButton = page.locator('[data-test="back-to-products"]');
  }

  async expectComplete(): Promise<void> {
    await expect(this.pageTitle).toHaveText('Checkout: Complete!');
    await expect(this.thankYouHeader).toHaveText('Thank you for your order!');
  }

  async backHome(): Promise<void> {
    await this.backHomeButton.click();
  }
}
