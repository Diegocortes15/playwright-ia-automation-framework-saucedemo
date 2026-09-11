import { spawnSync } from 'node:child_process';
import { recordRun } from './run-report';
import { parseEngines } from '../utils/run-environment';

// Usage (via tsx): run-and-report.ts <LABEL> [playwright args...]
// Runs `npx playwright test <args>`, then records a Qase run titled <LABEL>.
// Records regardless of test pass/fail (you want failures in Qase too).
//
// RUN_ENGINES (comma-separated: chromium,firefox,webkit) names what this run executed on,
// so the Qase record reports the real engine instead of assuming Chromium. Set by
// `scripts/run-suite.sh`; unset means chromium. This is an entry point, so reading the
// environment here is deliberate — `run-environment.ts` itself stays free of it.
async function main(): Promise<void> {
  const label = process.argv[2];
  const pwArgs = process.argv.slice(3);
  spawnSync('npx', ['playwright', 'test', ...pwArgs], { stdio: 'inherit', shell: true });
  await recordRun(label, parseEngines(process.env.RUN_ENGINES));
}

if (process.argv[1]?.endsWith('run-and-report.ts')) {
  main().catch((err) => {
    console.error(`Qase run failed: ${err}`);
    process.exitCode = 0;
  });
}
