import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';
import { AUTH_USERS } from './tests/users';

// Clean-room config (e2e-jira-from-issues), data-driven from tests/users.ts
// (Phase H / ADR-0014). Projects derive from AUTH_USERS, which /from-issue grows
// one user at a time as tickets require authenticated pages. Cross-browser
// (firefox/webkit-standard) + @sort-functional remain a separate ADR-0004 decision.

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
    // One setup project per user (filtered by the auth.setup test title), so a
    // user project authenticates ONLY its own user — not every AUTH_USER. A
    // project dependency runs the whole dependency project, so per-user setup
    // projects are how we scope auth to what each run actually needs.
    ...AUTH_USERS.map((user) => ({
      name: `setup-${user}`,
      testMatch: /.*\.setup\.ts/,
      grep: new RegExp(`authenticate as ${user}$`),
    })),
    {
      name: 'no-auth',
      testIgnore: /.*\.setup\.ts/,
      grep: /@no-auth/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...AUTH_USERS.map((user) => ({
      name: user,
      testIgnore: /.*\.setup\.ts/,
      grep: new RegExp(`@all-users|@${user}`),
      dependencies: [`setup-${user}`],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `auth/${user}.json`,
      },
    })),
  ],
});
