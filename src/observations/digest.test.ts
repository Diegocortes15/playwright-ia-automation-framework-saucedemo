import { test, expect } from '@playwright/test';
import { describeObservation, groupOf, iconFor, renderDigest } from './digest';
import type { Observation } from './types';

function obs(overrides: Partial<Observation> = {}): Observation {
  return {
    signature: 'sig',
    kind: 'failed-request',
    thirdParty: false,
    count: 1,
    seenIn: ['checkout'],
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    status: 'new',
    sample: { message: '404', test: 'some test', project: 'chromium-standard' },
    ...overrides,
  };
}

test('every kind renders as a sentence a non-engineer can read', () => {
  expect(
    describeObservation(
      obs({
        sample: {
          message: '500',
          url: 'https://app/x',
          method: 'POST',
          httpStatus: 500,
          test: 't',
          project: 'p',
        },
      }),
    ),
  ).toContain('the server itself failed');

  expect(
    describeObservation(
      obs({ kind: 'console-error', sample: { message: 'boom', test: 't', project: 'p' } }),
    ),
  ).toContain('wrote an error to the browser console');

  expect(
    describeObservation(
      obs({ kind: 'page-error', sample: { message: 'boom', test: 't', project: 'p' } }),
    ),
  ).toContain('threw an error nobody caught');

  expect(
    describeObservation(
      obs({
        kind: 'dialog',
        sample: { message: 'Sorting is broken!', dialogType: 'alert', test: 't', project: 'p' },
      }),
    ),
  ).toContain('opened a native `alert` box');
});

test('a third-party request is described as third party, a first-party one is not', () => {
  const url = 'https://vendor.example/api';
  const sample = { message: '401', url, method: 'POST', httpStatus: 401, test: 't', project: 'p' };
  expect(describeObservation(obs({ thirdParty: true, sample }))).toContain('a third-party service');
  expect(describeObservation(obs({ thirdParty: false, sample }))).toContain('the application');
});

test('unreviewed entries come first — the digest is a queue, not an archive', () => {
  const digest = renderDigest(
    {
      observations: [
        obs({ signature: 'a', status: 'ignored', note: 'known' }),
        obs({ signature: 'b', status: 'new' }),
      ],
    },
    '2026-09-05',
  );

  expect(digest).toContain('**1 not yet reviewed · 1 reviewed.**');
  expect(digest.indexOf('## Not yet reviewed')).toBeLessThan(digest.indexOf('## Already reviewed'));
  expect(digest).toContain('**Reviewed — marked `ignored`.** known');
});

test('one fact seen across several features renders as one entry, naming them all', () => {
  const digest = renderDigest(
    { observations: [obs({ seenIn: ['cart', 'checkout', 'inventory'], count: 6 })] },
    '2026-09-05',
  );
  expect(digest).toContain('3 features (`cart`, `checkout`, `inventory`)');
  expect(digest).toContain('Seen 6 times');
  // One entry, not one per feature — that was the bug this shape fixes.
  expect(digest.split('#### ').length - 1).toBe(1);
});

test('an empty run says so instead of rendering empty headings', () => {
  const digest = renderDigest({ observations: [] }, '2026-09-05');
  expect(digest).toContain('Nothing recorded.');
  expect(digest).not.toContain('## Not yet reviewed');
});

test('kinds map to the devtools tab a reader would go looking in', () => {
  expect(groupOf('failed-request')).toBe('Network');
  expect(groupOf('console-error')).toBe('Console');
  // An uncaught exception surfaces in the console, so it belongs with console errors.
  expect(groupOf('page-error')).toBe('Console');
  expect(groupOf('dialog')).toBe('Dialogs');
});

test('the icon carries severity, so a 500 never looks like a 404', () => {
  expect(iconFor('failed-request', 500)).toBe('🔥'); // the server itself failed
  expect(iconFor('failed-request', 503)).toBe('🔥');
  expect(iconFor('failed-request', 401)).toBe('🔒'); // rejected, not broken
  expect(iconFor('failed-request', 403)).toBe('🔒');
  expect(iconFor('failed-request', 404)).toBe('🔍');
  expect(iconFor('failed-request', 429)).toBe('⏳');
  expect(iconFor('failed-request', 418)).toBe('⚠️'); // any other 4xx
  expect(iconFor('failed-request', undefined)).toBe('⚠️');
});

test('non-network kinds get their own icon regardless of status code', () => {
  expect(iconFor('page-error')).toBe('💥'); // uncaught — the page broke
  expect(iconFor('console-error')).toBe('❗');
  expect(iconFor('dialog')).toBe('💬');
});
