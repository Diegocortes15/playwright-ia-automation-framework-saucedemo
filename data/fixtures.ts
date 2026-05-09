// JSON imports use createRequire(import.meta.url) instead of native ESM
// `import x from './x.json'` because Node 22 + "type": "module" doesn't
// support raw JSON imports without import attributes (`with { type: 'json' }`).
// TypeScript's resolveJsonModule handles type-checking, but runtime resolution
// needs CommonJS semantics here. Planned cleanup: switch to import attributes
// in Phase A.5 once Playwright + TS toolchain support is verified.
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

export const getProductById = (id: string): Product => {
  const product = loadProducts().find((p) => p.id === id);
  if (!product) throw new Error(`Product not found in shared/products.json: ${id}`);
  return product;
};
