import productsJson from './shared/products.json';
import validCheckoutJson from './scenarios/checkout/valid-checkout.json';
import invalidPostalJson from './scenarios/checkout/invalid-postalcode.json';
import sortOrdersJson from './scenarios/sort/sort-orders.json';
import type { Product, CheckoutScenario, SortOption } from './types';

export const loadProducts = (): Product[] => productsJson as Product[];
export const loadValidCheckouts = (): CheckoutScenario[] => validCheckoutJson as CheckoutScenario[];
export const loadInvalidPostal = (): CheckoutScenario[] => invalidPostalJson as CheckoutScenario[];
export const loadSortOrders = (): SortOption[] => sortOrdersJson as SortOption[];
