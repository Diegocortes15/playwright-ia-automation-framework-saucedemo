import { createRequire } from 'module';
import type { Product, CheckoutScenario, SortOption } from './types';

const require = createRequire(import.meta.url);

export const loadProducts = (): Product[] => require('./shared/products.json') as Product[];
export const loadValidCheckouts = (): CheckoutScenario[] =>
  require('./scenarios/checkout/valid-checkout.json') as CheckoutScenario[];
export const loadInvalidPostal = (): CheckoutScenario[] =>
  require('./scenarios/checkout/invalid-postalcode.json') as CheckoutScenario[];
export const loadSortOrders = (): SortOption[] =>
  require('./scenarios/sort/sort-orders.json') as SortOption[];
