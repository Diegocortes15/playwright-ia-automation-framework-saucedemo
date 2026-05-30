import { spawnSync } from 'node:child_process';
import { recordRun } from './run-report';

// Usage (via tsx): run-and-report.ts <LABEL> [playwright args...]
// Runs `npx playwright test <args>`, then records a Qase run titled <LABEL>.
// Records regardless of test pass/fail (you want failures in Qase too).
async function main(): Promise<void> {
  const label = process.argv[2];
  const pwArgs = process.argv.slice(3);
  spawnSync('npx', ['playwright', 'test', ...pwArgs], { stdio: 'inherit', shell: true });
  await recordRun(label);
}

if (process.argv[1]?.endsWith('run-and-report.ts')) {
  main().catch((err) => {
    console.error(`Qase run failed: ${err}`);
    process.exitCode = 0;
  });
}
