import { defineConfig, devices } from '@playwright/test';
import 'dotenv/config';

// Blank-slate config (experiment-rebuild-from-scratch branch).
// Single no-auth chromium project as the bare minimum. The 9-project matrix
// (5 saucedemo users × 3 browsers) was deleted because it depended on
// `tests/auth.setup.ts` producing storageState files per user — which itself
// depended on `LoginPage`. The whole chain was wiped to validate the AI skills'
// ability to rebuild it.
//
// As the experiment progresses, expect to rebuild:
//   - tests/auth.setup.ts (or replacement) — produces storageState
//   - per-user projects (with `storageState`, `dependencies: ['setup']`)
//   - firefox/webkit projects
// Track gaps in GAPS.md as you go.

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
