#!/usr/bin/env node
//
// Say out loud when a test only passed on retry.
//
// `retries: 2` on CI means a flaky test does not fail the job: Playwright exits 0 and the run
// is green. Before this, nothing in the repository read the word "flaky" — a run could carry a
// test that failed and then passed, and the only trace was a line in a log nobody opens.
//
// It never fails the build, deliberately. A flake is not a failure, and a gate that turns one
// into a red build teaches people to re-run until it is green, which is worse than silence.
// It reports, and on CI it reports as a GitHub warning annotation so it lands on the run
// summary where someone will actually see it.

import { existsSync, readFileSync } from 'node:fs';

const RESULTS = 'test-results/results.json';

if (!existsSync(RESULTS)) {
  console.log(`report-flaky: no ${RESULTS} — nothing ran, nothing to report.`);
  process.exit(0);
}

function* eachSpec(node) {
  for (const spec of node.specs ?? []) yield spec;
  for (const suite of node.suites ?? []) yield* eachSpec(suite);
}

const report = JSON.parse(readFileSync(RESULTS, 'utf-8'));
const flaky = [];

for (const spec of eachSpec({ suites: report.suites ?? [] })) {
  for (const test of spec.tests ?? []) {
    const attempts = test.results ?? [];
    const last = attempts[attempts.length - 1];
    // More than one attempt, and the last one passed: it failed, then it did not.
    if (attempts.length > 1 && last?.status === 'passed') {
      flaky.push({
        title: spec.title,
        project: test.projectName ?? 'unknown',
        attempts: attempts.length,
        file: `${spec.file}:${spec.line}`,
      });
    }
  }
}

if (flaky.length === 0) {
  console.log('report-flaky: no test needed a retry.');
  process.exit(0);
}

const onCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
console.log(
  `report-flaky: ${flaky.length} test(s) passed only on retry — the run is green anyway.`,
);
for (const f of flaky) {
  const line = `${f.title} [${f.project}] — passed on attempt ${f.attempts} of ${f.attempts}`;
  console.log(`  ${line}`);
  console.log(`    ${f.file}`);
  if (onCI) console.log(`::warning file=${f.file}::flaky — ${line}`);
}
