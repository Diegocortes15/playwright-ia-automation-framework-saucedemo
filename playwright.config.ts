import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// Blank-slate config (experiment-rebuild-from-scratch-v5 branch).
// Single no-auth chromium project. Validates phase-d1.2 (feature-based
// filenames → login.spec.ts) and phase-d1.3 (test.step on Page Object
// action methods, clean specs) on a fresh /from-issue run.

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
