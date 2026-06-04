// Shared domain types for externalized test data (data/).
// Loaders in fixtures.ts return these; specs import via the @data/* alias.

export interface Product {
  /** Exact product title as displayed on the inventory card. */
  name: string;
  /** Exact product description text. */
  description: string;
  /** Displayed price including the leading "$", e.g. "$29.99". */
  price: string;
}
