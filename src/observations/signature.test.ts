import { test, expect } from '@playwright/test';
import { hostOf, isThirdParty, signatureFor, stripQuery } from './signature';
import type { ObservationEvent } from './types';

const BASE = 'https://www.saucedemo.com';

test('stripQuery drops the query string and hash so varying ids do not fork a signature', () => {
  expect(stripQuery('https://api.example.com/v1/orders?id=42&t=1699')).toBe(
    'https://api.example.com/v1/orders',
  );
  expect(stripQuery('https://example.com/page#section')).toBe('https://example.com/page');
  expect(stripQuery('https://example.com/plain')).toBe('https://example.com/plain');
});

test('stripQuery falls back to string splitting on an unparseable URL', () => {
  expect(stripQuery('not a url?x=1')).toBe('not a url');
});

test('hostOf returns undefined rather than throwing on garbage', () => {
  expect(hostOf('https://www.saucedemo.com/inventory.html')).toBe('www.saucedemo.com');
  expect(hostOf('¯\\_(ツ)_/¯')).toBeUndefined();
});

test('isThirdParty marks a different host, and only a different host', () => {
  expect(isThirdParty('https://events.backtrace.io/api/submit', BASE)).toBe(true);
  expect(isThirdParty('https://www.saucedemo.com/inventory.html', BASE)).toBe(false);
  // Same host, different path or scheme — still first-party.
  expect(isThirdParty('https://www.saucedemo.com/cart.html?x=1', BASE)).toBe(false);
});

test('isThirdParty stays false when either URL is missing or unparseable', () => {
  expect(isThirdParty(undefined, BASE)).toBe(false);
  expect(isThirdParty('not-a-url', BASE)).toBe(false);
  expect(isThirdParty('https://example.com', 'not-a-url')).toBe(false);
});

test('two calls of the same failed request produce one signature despite differing query strings', () => {
  const first: ObservationEvent = {
    kind: 'failed-request',
    message: '401 Unauthorized',
    url: 'https://events.backtrace.io/api/submit?universe=A&token=1',
    method: 'POST',
    httpStatus: 401,
  };
  const second: ObservationEvent = { ...first, url: `${first.url ?? ''}&nonce=zzz` };
  expect(signatureFor(first)).toBe(signatureFor(second));
  expect(signatureFor(first)).toBe(
    'failed-request:POST:https://events.backtrace.io/api/submit:401',
  );
});

test('a different status on the same endpoint is a different signature', () => {
  const base: ObservationEvent = {
    kind: 'failed-request',
    message: '',
    url: 'https://www.saucedemo.com/inventory.html',
    method: 'GET',
    httpStatus: 404,
  };
  expect(signatureFor(base)).not.toBe(signatureFor({ ...base, httpStatus: 500 }));
});

test('message-based signatures collapse whitespace and cap length', () => {
  const noisy: ObservationEvent = {
    kind: 'console-error',
    message: `  Cannot read   properties\n\tof undefined  `,
  };
  expect(signatureFor(noisy)).toBe('console-error:Cannot read properties of undefined');
  const long: ObservationEvent = { kind: 'page-error', message: 'x'.repeat(500) };
  expect(signatureFor(long).length).toBeLessThanOrEqual('page-error:'.length + 200);
});

test('dialogs are keyed by type and message', () => {
  const dialog: ObservationEvent = {
    kind: 'dialog',
    message: 'Sorting is broken! This error has been reported to Backtrace.',
    dialogType: 'alert',
  };
  expect(signatureFor(dialog)).toBe(
    'dialog:alert:Sorting is broken! This error has been reported to Backtrace.',
  );
});
