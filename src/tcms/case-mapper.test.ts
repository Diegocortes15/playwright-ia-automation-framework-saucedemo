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
};
const meta = { jiraKey: 'SW-1', sourceUrl: 'https://x/browse/SW-1' };

test('maps suite path, title, and AC-as-expected on the last step', () => {
  const c = mapToCase(record, ['Navigate to the login page', 'Submit credentials'], 'passed', meta);
  expect(c.suitePath).toEqual(['login', 'no auth', 'Positive']);
  expect(c.title).toBe(record.title);
  expect(c.steps).toEqual([
    { action: 'Navigate to the login page', expected: '' },
    { action: 'Submit credentials', expected: record.acText },
  ]);
  expect(c.preconditions).toBe('Session: standard_user');
  expect(c.description).toContain('SW-1');
  expect(c.description).toContain(record.acText);
  expect(c.status).toBe('passed');
});

test('no test.step → one synthetic step carrying the AC as expected', () => {
  const c = mapToCase({ ...record, user: 'no-auth' }, [], 'failed', meta);
  expect(c.steps).toEqual([
    { action: 'Automated test (no granular steps recorded)', expected: record.acText },
  ]);
  expect(c.preconditions).toBe('No authentication');
  expect(c.status).toBe('failed');
});
