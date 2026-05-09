import { Page, Locator } from '@playwright/test';
import { CartBadge } from './CartBadge';

export class Header {
  readonly cartBadge: CartBadge;
  readonly menuButton: Locator;
  readonly logoutLink: Locator;
  readonly appLogo: Locator;

  constructor(page: Page) {
    this.cartBadge = new CartBadge(page);
    this.menuButton = page.locator('#react-burger-menu-btn');
    this.logoutLink = page.locator('#logout_sidebar_link');
    this.appLogo = page.locator('.app_logo');
  }

  async openCart(): Promise<void> {
    await this.cartBadge.click();
  }

  async logout(): Promise<void> {
    await this.menuButton.click();
    await this.logoutLink.click();
  }
}
