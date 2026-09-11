import { test, expect } from '@playwright/test';
import {
  formatEnvironmentLine,
  parseEngines,
  runEnvironment,
  type RunEnvironment,
} from './run-environment';

const sample: RunEnvironment = {
  os: 'Ubuntu 24.04.4 LTS',
  node: '22.15.0',
  playwright: '1.59.1',
  chromium: '147.0.7727.15',
  firefox: '148.0.2',
  webkit: '26.4',
};

test('formatEnvironmentLine shortens Chromium and Node to their major versions', () => {
  expect(formatEnvironmentLine(sample)).toBe(
    'Ubuntu 24.04.4 LTS · Chromium 147 · Node 22 · Playwright 1.59.1',
  );
});

// The bug this guards: the line hardcoded `Chromium`, so a WebKit run told Slack, Qase and
// the report header that Chromium 147 ran. The engine reported must be the engine used.
test('formatEnvironmentLine names the engines the run actually used', () => {
  expect(formatEnvironmentLine(sample, ['webkit'])).toBe(
    'Ubuntu 24.04.4 LTS · WebKit 26 · Node 22 · Playwright 1.59.1',
  );
  expect(formatEnvironmentLine(sample, ['chromium', 'firefox', 'webkit'])).toBe(
    'Ubuntu 24.04.4 LTS · Chromium 147 · Firefox 148 · WebKit 26 · Node 22 · Playwright 1.59.1',
  );
});

test('formatEnvironmentLine falls back to chromium rather than listing no browser', () => {
  expect(formatEnvironmentLine(sample, [])).toBe(
    'Ubuntu 24.04.4 LTS · Chromium 147 · Node 22 · Playwright 1.59.1',
  );
});

test('formatEnvironmentLine keeps an unresolved version readable', () => {
  expect(formatEnvironmentLine({ ...sample, webkit: 'unknown' }, ['webkit'])).toContain(
    'WebKit unknown',
  );
});

test('parseEngines keeps canonical order and drops what it does not know', () => {
  expect(parseEngines('webkit,chromium')).toEqual(['chromium', 'webkit']);
  expect(parseEngines('firefox webkit')).toEqual(['firefox', 'webkit']);
  expect(parseEngines('safari,ie11')).toEqual([]);
  expect(parseEngines(undefined)).toEqual([]);
});

test('runEnvironment resolves every field to a non-empty, real value', () => {
  const env = runEnvironment();
  expect(env.os.length).toBeGreaterThan(0);
  expect(env.node).toMatch(/^\d+\.\d+/); // e.g. '22.15.0' — no leading 'v'
  expect(env.playwright).toMatch(/^\d+\.\d+/); // e.g. '1.59.1'
  // Read without a browser launch, and for every engine — including ones this machine has
  // never downloaded, which is what lets the line be rendered before `playwright install`.
  expect(env.chromium).toMatch(/^\d+\./); // e.g. '147.0.7727.15'
  expect(env.firefox).toMatch(/^\d+\./); // e.g. '148.0.2'
  expect(env.webkit).toMatch(/^\d+\./); // e.g. '26.4'
});
