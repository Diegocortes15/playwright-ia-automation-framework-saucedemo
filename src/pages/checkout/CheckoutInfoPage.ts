import { Page, Locator, expect } from '@playwright/test';
import { Header } from '@components/Header';
import type { CheckoutScenario } from '@data/types';

export class CheckoutInfoPage {
  readonly header: Header;
  readonly pageTitle: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly postalCodeInput: Locator;
  readonly continueButton: Locator;
  readonly cancelButton: Locator;
  readonly errorBanner: Locator;

  constructor(private readonly page: Page) {
    this.header = new Header(page);
    this.pageTitle = page.locator('[data-test="title"]');
    this.firstNameInput = page.locator('[data-test="firstName"]');
    this.lastNameInput = page.locator('[data-test="lastName"]');
    this.postalCodeInput = page.locator('[data-test="postalCode"]');
    this.continueButton = page.locator('[data-test="continue"]');
    this.cancelButton = page.locator('[data-test="cancel"]');
    this.errorBanner = page.locator('[data-test="error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout-step-one.html');
    await expect(this.pageTitle).toHaveText('Checkout: Your Information');
  }

  async fillForm(scenario: CheckoutScenario): Promise<void> {
    await this.firstNameInput.fill(scenario.firstName);
    await this.lastNameInput.fill(scenario.lastName);
    await this.postalCodeInput.fill(scenario.postalCode);
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  async getErrorText(): Promise<string> {
    return (await this.errorBanner.textContent()) ?? '';
  }
}
