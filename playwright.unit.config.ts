// playwright.unit.config.ts — runs pure (non-browser) unit tests under src/tcms.
// Separate from playwright.config.ts so the matrix/grep stays untouched and these
// tests don't need a browser or storageState. No new test-runner dependency.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tcms',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  reporter: [['list']],
});
