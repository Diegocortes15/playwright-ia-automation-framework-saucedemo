// Typed loaders for externalized test data (per data-placement.md / CLAUDE.md).
// Specs import named datasets from '@data/fixtures' — never read JSON directly.
// JSON is read via fs (not an `import ... json` — the project runs as native ESM,
// which would require an import attribute and is brittle through Playwright's loader).
// First externalized dataset: the saucedemo product catalog (shared reference
// data reused by inventory and, in future, cart/checkout specs).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { Product } from './types';

const dataDir = dirname(fileURLToPath(import.meta.url));

function load<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(dataDir, relativePath), 'utf-8')) as T;
}

/** The 6 saucedemo products in default inventory (Name A→Z) display order. */
export const products: readonly Product[] = load<Product[]>('shared/products.json');
