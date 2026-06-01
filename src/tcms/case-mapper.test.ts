// Pure unit test: assertions come from '@playwright/test' on purpose, not
// '@fixtures/test' (that wrapper injects browser/page-object fixtures for e2e specs).
import { test, expect } from '@playwright/test';
import { mapToCase } from './case-mapper';
import type { TestRecord } from './types';

const record: TestRecord = {
  title: 'standard_user logs in successfully and lands on inventory',
  acText: 'The browser lands on the Products / Inventory page (/inventory.html)',
  user: 'standard_user',
  tags: ['@no-auth', '@smoke'],
  bucket: 'Positive',
  feature: 'login',
  contextLabel: 'no auth',
  jira: [{ key: 'SW-1', url: 'https://x/browse/SW-1' }],
};

test('maps suite path, title, and AC-as-expected on the last step', () => {
  const c = mapToCase(record, ['Navigate to the login page', 'Submit credentials'], 'passed');
  expect(c.suitePath).toEqual(['login', 'no auth', 'Positive']);
  expect(c.title).toBe(record.title);
  expect(c.steps).toEqual([
    { action: 'Navigate to the login page', expected: '' },
    { action: 'Submit credentials', expected: record.acText },
  ]);
  expect(c.preconditions).toBe('Session: standard_user');
  expect(c.description).toBe(`Covers Jira SW-1 — https://x/browse/SW-1\n\n${record.acText}`);
  expect(c.jira).toEqual(record.jira);
  expect(c.status).toBe('passed');
});

test('a case covering multiple tickets lists one provenance line per ticket', () => {
  const multi = {
    ...record,
    jira: [
      { key: 'SW-4', url: 'https://x/browse/SW-4' },
      { key: 'SW-9', url: 'https://x/browse/SW-9' },
    ],
  };
  const c = mapToCase(multi, [], 'passed');
  expect(c.description).toBe(
    `Covers Jira SW-4 — https://x/browse/SW-4\nCovers Jira SW-9 — https://x/browse/SW-9\n\n${record.acText}`,
  );
});

test('no test.step → one synthetic step carrying the AC as expected', () => {
  const c = mapToCase({ ...record, user: 'no-auth' }, [], 'failed');
  expect(c.steps).toEqual([
    { action: 'Automated test (no granular steps recorded)', expected: record.acText },
  ]);
  expect(c.preconditions).toBe('No authentication');
  expect(c.status).toBe('failed');
});
