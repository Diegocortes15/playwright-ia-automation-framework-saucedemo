import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// Clean-room config (e2e-jira-from-issues branch), grown ticket-by-ticket.
// SW-1 (login) needed only @no-auth. SW-2 (footer) is the first ticket on an
// authenticated page (inventory), so it introduces the `setup` + `standard`
// projects. Further user projects (problem/error/visual/firefox/webkit) get
// added as later tickets require them.

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
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'no-auth',
      testIgnore: /.*\.setup\.ts/,
      grep: /@no-auth/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'standard',
      testIgnore: /.*\.setup\.ts/,
      grep: /@all-users|@standard/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'auth/standard.json',
      },
    },
  ],
});
