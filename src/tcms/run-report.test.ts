import { test, expect } from '@playwright/test';
import { selectResults, runTitle } from './run-report';
import type { QaseMap } from './types';

const map: QaseMap = {
  'footer › standard_user › Positive › footer shows the copyright': 9,
  'login › no auth › Positive › standard_user logs in': 17,
};

const report = {
  suites: [
    {
      title: 's',
      specs: [
        {
          title: 'standard_user logs in',
          tests: [
            {
              projectName: 'no-auth',
              results: [{ status: 'passed', steps: [{ title: 'Submit' }] }],
            },
          ],
        },
        {
          title: 'footer shows the copyright',
          tests: [
            {
              projectName: 'standard',
              results: [{ status: 'failed', steps: [{ title: 'Read' }] }],
            },
          ],
        },
        {
          title: 'a brand-new test not in the map',
          tests: [{ projectName: 'standard', results: [{ status: 'passed', steps: [] }] }],
        },
      ],
    },
  ],
};

test('selectResults matches ran tests to existing case ids; unmapped go to skipped', () => {
  const { results, skipped } = selectResults(report, map);
  expect(results).toContainEqual({ caseId: 17, status: 'passed', comment: undefined });
  expect(results).toContainEqual({ caseId: 9, status: 'failed', comment: 'failed on: standard' });
  expect(results).toHaveLength(2);
  expect(skipped).toEqual(['a brand-new test not in the map']);
});

test('runTitle names the run by the features present (sorted, deduped)', () => {
  const results = selectResults(report, map).results;
  expect(runTitle(map, results, '2026-05-29')).toBe('On-demand: footer, login — 2026-05-29');
});

test('runTitle falls back to a generic scope when no features resolve', () => {
  expect(runTitle(map, [], '2026-05-29')).toBe('On-demand: tests — 2026-05-29');
});
