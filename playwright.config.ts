import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// Blank-slate config (experiment-rebuild-from-scratch-v4 branch).
// Single no-auth chromium project. Validates D.1.1 — should produce
// generated tests with clean tag chips (one no-auth per test, not 3-4)
// and test.step blocks for readable HTML reports.

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.SAUCEDEMO_BASE_URL ?? 'https://www.saucedemo.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'no-auth',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
