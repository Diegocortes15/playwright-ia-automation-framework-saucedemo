export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  imageAlt: string;
}

export interface CheckoutScenario {
  description: string;
  firstName: string;
  lastName: string;
  postalCode: string;
  expectError?: string;
}

export interface SortOption {
  label: 'Name (A to Z)' | 'Name (Z to A)' | 'Price (low to high)' | 'Price (high to low)';
  value: 'az' | 'za' | 'lohi' | 'hilo';
  expectedFirst: string;
  expectedLast: string;
}
