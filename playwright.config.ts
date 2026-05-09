import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

const userProjects = ['standard', 'problem', 'performance_glitch', 'error', 'visual'] as const;

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
    ...userProjects.map((u) => ({
      name: u,
      testIgnore: /.*\.setup\.ts/,
      grep: new RegExp(`@all-users|@${u}`),
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: `auth/${u}.json`,
        ...(u === 'performance_glitch' ? { navigationTimeout: 30_000 } : {}),
      },
    })),
  ],
});
