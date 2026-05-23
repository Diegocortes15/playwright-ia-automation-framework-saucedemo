import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// Blank-slate config (experiment-rebuild-from-scratch-v2 branch — ADR-0009 verification).
// Single no-auth chromium project. The 9-project matrix was deleted because it depended
// on tests/auth.setup.ts producing storageState files per user. As the v2 experiment
// progresses, expect to rebuild projects as auth chain is restored.

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
