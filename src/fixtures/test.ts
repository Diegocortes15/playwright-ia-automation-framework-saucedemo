import { test as base, expect } from '@playwright/test';

type Pages = Record<string, never>;

export const test = base.extend<Pages>({});
export { expect };
