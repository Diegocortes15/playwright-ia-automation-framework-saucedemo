import productsJson from './shared/products.json' with { type: 'json' };
import validCheckoutJson from './scenarios/checkout/valid-checkout.json' with { type: 'json' };
import invalidPostalJson from './scenarios/checkout/invalid-postalcode.json' with { type: 'json' };
import sortOrdersJson from './scenarios/sort/sort-orders.json' with { type: 'json' };
import type { Product, CheckoutScenario, SortOption } from './types';

export const loadProducts = (): Product[] => productsJson as Product[];
export const loadValidCheckouts = (): CheckoutScenario[] => validCheckoutJson as CheckoutScenario[];
export const loadInvalidPostal = (): CheckoutScenario[] => invalidPostalJson as CheckoutScenario[];
export const loadSortOrders = (): SortOption[] => sortOrdersJson as SortOption[];

export const getProductById = (id: string): Product => {
  const product = loadProducts().find((p) => p.id === id);
  if (!product) throw new Error(`Product not found in shared/products.json: ${id}`);
  return product;
};
