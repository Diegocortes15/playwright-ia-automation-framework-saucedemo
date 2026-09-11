import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { FullConfig } from '@playwright/test';
import { APP_BUILD_FILE, probeAppBuild, formatAppBuild } from './app-build';

// Guarantees that every run records which build of the application it exercised, including
// a bare `npx playwright test` that never went through `scripts/run-suite.sh`.
//
// It is a FALLBACK, not a second prober. run-suite.sh probes before Playwright starts,
// because only a value present at config-eval time reaches the report's header chips; when
// it has done so, APP_BUILD_LINE is already set and the file already written, and probing
// again would cost a request and risk two disagreeing answers for one run.
export default async function globalSetup(config: FullConfig): Promise<void> {
  if (process.env.APP_BUILD_LINE && existsSync(APP_BUILD_FILE)) return;

  const baseUrl =
    (config.projects[0]?.use?.baseURL as string | undefined) ?? 'https://www.saucedemo.com';
  const build = await probeAppBuild(baseUrl, process.env.APP_BUILD);

  mkdirSync('test-results', { recursive: true });
  writeFileSync(APP_BUILD_FILE, `${JSON.stringify(build, null, 2)}\n`);

  // No header chip on this path: the config was evaluated before this ran. The line is
  // printed and the file written, so triage and the Qase record still have it.
  console.log(`Build under test: ${formatAppBuild(build)}`);
}
