import { Page, Locator } from '@playwright/test';
import type { SortOption } from '@data/types';

export class SortDropdown {
  readonly select: Locator;

  constructor(page: Page) {
    this.select = page.locator('[data-test="product-sort-container"]');
  }

  async selectByValue(value: SortOption['value']): Promise<void> {
    await this.select.selectOption({ value });
  }

  async getSelectedValue(): Promise<string> {
    return (await this.select.inputValue()) ?? '';
  }
}
