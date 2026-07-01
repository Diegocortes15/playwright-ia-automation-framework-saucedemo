import { test, expect } from '@playwright/test';
import { selectResults, runTitle, nowET, triggerTag } from './run-report';
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

test('selectResults ignores auth.setup pseudo-tests (not reported as skipped)', () => {
  const withSetup = {
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'authenticate as standard',
            tests: [{ projectName: 'setup', results: [{ status: 'passed', steps: [] }] }],
          },
          {
            title: 'a brand-new test not in the map',
            tests: [{ projectName: 'standard', results: [{ status: 'passed', steps: [] }] }],
          },
        ],
      },
    ],
  };
  const { skipped } = selectResults(withSetup, map);
  expect(skipped).toEqual(['a brand-new test not in the map']);
});

test('runTitle names the run by features, upper-cased, with the when string', () => {
  const results = selectResults(report, map).results;
  expect(runTitle(map, results, '2026-05-30 14:00 ET')).toBe(
    'ON-DEMAND: FOOTER, LOGIN — 2026-05-30 14:00 ET',
  );
});

test('runTitle uses an explicit label (e.g. SMOKE/REGRESSION) when given', () => {
  expect(runTitle(map, [], '2026-05-30 14:00 ET', 'regression')).toBe(
    'REGRESSION — 2026-05-30 14:00 ET',
  );
});

test('runTitle falls back to a generic scope when no features resolve', () => {
  expect(runTitle(map, [], '2026-05-30 14:00 ET')).toBe('ON-DEMAND: TESTS — 2026-05-30 14:00 ET');
});

test('nowET returns a YYYY-MM-DD HH:MM ET string', () => {
  expect(nowET(new Date('2026-05-30T18:15:00Z'))).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2} ET$/);
});

test('triggerTag: empty locally, Automated for schedule, Manual (actor) for dispatch', () => {
  const { GITHUB_EVENT_NAME, GITHUB_TRIGGERING_ACTOR, GITHUB_ACTOR } = process.env;
  try {
    delete process.env.GITHUB_EVENT_NAME;
    expect(triggerTag()).toBe('');
    process.env.GITHUB_EVENT_NAME = 'schedule';
    expect(triggerTag()).toBe(' · Automated');
    process.env.GITHUB_EVENT_NAME = 'workflow_dispatch';
    process.env.GITHUB_TRIGGERING_ACTOR = 'diego';
    expect(triggerTag()).toBe(' · Manual (diego)');
  } finally {
    const saved = { GITHUB_EVENT_NAME, GITHUB_TRIGGERING_ACTOR, GITHUB_ACTOR };
    delete process.env.GITHUB_EVENT_NAME;
    delete process.env.GITHUB_TRIGGERING_ACTOR;
    delete process.env.GITHUB_ACTOR;
    Object.assign(
      process.env,
      Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined)),
    );
  }
});
