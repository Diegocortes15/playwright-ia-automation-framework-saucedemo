import { test, expect } from '@playwright/test';
import { formatEnvironmentLine, runEnvironment, type RunEnvironment } from './run-environment';

const sample: RunEnvironment = {
  os: 'Ubuntu 24.04.4 LTS',
  node: '22.15.0',
  playwright: '1.59.1',
  chromium: '147.0.7727.15',
};

test('formatEnvironmentLine shortens Chromium and Node to their major versions', () => {
  expect(formatEnvironmentLine(sample)).toBe(
    'Ubuntu 24.04.4 LTS · Chromium 147 · Node 22 · Playwright 1.59.1',
  );
});

test('runEnvironment resolves every field to a non-empty, real value', () => {
  const env = runEnvironment();
  expect(env.os.length).toBeGreaterThan(0);
  expect(env.node).toMatch(/^\d+\.\d+/); // e.g. '22.15.0' — no leading 'v'
  expect(env.playwright).toMatch(/^\d+\.\d+/); // e.g. '1.59.1'
  expect(env.chromium).toMatch(/^\d+\./); // e.g. '147.0.7727.15' — read without a browser launch
});
