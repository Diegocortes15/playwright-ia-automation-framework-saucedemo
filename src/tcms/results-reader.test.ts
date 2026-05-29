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
