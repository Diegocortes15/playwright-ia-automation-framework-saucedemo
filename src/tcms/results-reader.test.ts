import { test, expect } from '@playwright/test';
import { indexResults, normalizeTitle } from './results-reader';

// Mirrors the real PW JSON shape verified during planning: nested suites → specs,
// each spec's tests[0].results[0] has status + top-level steps (test.step only).
const report = {
  suites: [
    {
      title: 'login/login.spec.ts',
      suites: [
        {
          title: 'login (@no-auth)',
          specs: [
            {
              title: '@no-auth standard_user logs in successfully and lands on inventory',
              tests: [
                {
                  results: [
                    {
                      status: 'passed',
                      steps: [
                        { title: 'Navigate to the login page', duration: 5 },
                        { title: 'Submit credentials', duration: 9 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test('normalizeTitle strips embedded tags, collapses space, lowercases', () => {
  expect(normalizeTitle('@no-auth  Standard_User Logs In')).toBe('standard_user logs in');
});

test('indexes by normalized title with ordered step titles + mapped status', () => {
  const idx = indexResults(report);
  const hit = idx.get(normalizeTitle('standard_user logs in successfully and lands on inventory'));
  expect(hit).toBeTruthy();
  expect(hit!.steps).toEqual(['Navigate to the login page', 'Submit credentials']);
  expect(hit!.status).toBe('passed');
  expect(hit!.failedProjects).toEqual([]);
});

test('hook steps and timedOut status are handled defensively', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'x',
            tests: [
              {
                results: [
                  {
                    status: 'timedOut',
                    steps: [
                      { title: 'Before Hooks', duration: 1 },
                      { title: 'Real step', duration: 2 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('x')!;
  expect(hit.steps).toEqual(['Real step']);
  expect(hit.status).toBe('failed');
  expect(hit.failedProjects).toEqual([]);
});

test('skipped status maps through; all hook titles are filtered', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'y',
            tests: [
              {
                results: [
                  {
                    status: 'skipped',
                    steps: [
                      { title: 'Before Hooks', duration: 1 },
                      { title: 'Kept step', duration: 2 },
                      { title: 'After Hooks', duration: 1 },
                      { title: 'Worker Cleanup', duration: 1 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('y')!;
  expect(hit.steps).toEqual(['Kept step']);
  expect(hit.status).toBe('skipped');
});

test('aggregates across projects: passed only if all projects passed', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'cross-project test',
            tests: [
              {
                projectName: 'standard',
                results: [{ status: 'passed', steps: [{ title: 'Step A' }] }],
              },
              {
                projectName: 'problem',
                results: [{ status: 'failed', steps: [{ title: 'Step A' }] }],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('cross-project test')!;
  expect(hit.status).toBe('failed');
  expect(hit.failedProjects).toEqual(['problem']);
  expect(hit.steps).toEqual(['Step A']);
});

test('all projects passed → passed, no failed projects', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 't',
            tests: [
              { projectName: 'standard', results: [{ status: 'passed', steps: [{ title: 'X' }] }] },
              {
                projectName: 'firefox-standard',
                results: [{ status: 'passed', steps: [{ title: 'X' }] }],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('t')!;
  expect(hit.status).toBe('passed');
  expect(hit.failedProjects).toEqual([]);
});

test('skipped only when every project skipped', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'all-skip',
            tests: [
              { projectName: 'a', results: [{ status: 'skipped', steps: [] }] },
              { projectName: 'b', results: [{ status: 'skipped', steps: [] }] },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('all-skip')!;
  expect(hit.status).toBe('skipped');
  expect(hit.failedProjects).toEqual([]);
});
