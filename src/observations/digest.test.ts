import { test, expect } from '@playwright/test';
import { describeObservation, groupByVerdict, groupOf, iconFor, renderDigest } from './digest';
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
  // `count` is per-run and `firstSeen` is cumulative, so they must not read as one total.
  expect(digest).toContain('6 times');
  expect(digest).not.toContain('Seen 6 times between');
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

test('the icon separates "the app broke" from "the app refused or lacked something"', () => {
  // Broke:
  expect(iconFor('failed-request', 500)).toBe('🔥');
  expect(iconFor('failed-request', 503)).toBe('🔥');
  expect(iconFor('page-error')).toBe('🔥'); // an uncaught exception is the page breaking
  // Refused or missing — the sentence below the icon says which:
  expect(iconFor('failed-request', 401)).toBe('⚠️');
  expect(iconFor('failed-request', 404)).toBe('⚠️');
  expect(iconFor('failed-request', 429)).toBe('⚠️');
  expect(iconFor('failed-request', undefined)).toBe('⚠️');
});

test('console errors and dialogs keep their own icon', () => {
  expect(iconFor('console-error')).toBe('❗');
  expect(iconFor('dialog')).toBe('💬');
});

test('entries a person gave the same answer to print that answer once', () => {
  const note = 'placeholder credentials — one cause, two detectors.';
  const digest = renderDigest(
    {
      observations: [
        obs({ signature: 'a', status: 'ignored', note }),
        obs({ signature: 'b', status: 'ignored', note }),
        obs({ signature: 'c', status: 'ignored', note }),
      ],
    },
    '2026-09-07',
  );

  // Three facts survive — grouping is a rendering change, never a loss of entries.
  expect(digest.split('#### ').length - 1).toBe(3);
  // One verdict, announced as covering all three.
  expect(digest.split(note).length - 1).toBe(1);
  expect(digest).toContain('### 3 observations, one verdict');
});

test('the same reasoning under two statuses stays two verdicts', () => {
  // Collapsing these would hide that someone reached different conclusions from one argument.
  const note = 'same reasoning';
  const groups = groupByVerdict([
    obs({ signature: 'a', status: 'ignored', note }),
    obs({ signature: 'b', status: 'triaged', note }),
  ]);
  expect(groups).toHaveLength(2);
});

test('entries nobody has explained never pool together', () => {
  // "Nobody explained this" is not a shared explanation, and one heading over both would
  // invent a judgment nobody made.
  const groups = groupByVerdict([obs({ signature: 'a' }), obs({ signature: 'b' })]);
  expect(groups).toHaveLength(2);
  expect(
    renderDigest({ observations: [obs({ signature: 'a' }), obs({ signature: 'b' })] }, 'x'),
  ).not.toContain('one verdict');
});

test('a lone entry renders exactly as it did before grouping existed', () => {
  const digest = renderDigest(
    { observations: [obs({ signature: 'a', status: 'ignored', note: 'known' })] },
    '2026-09-07',
  );
  expect(digest).toContain('**Reviewed — marked `ignored`.** known');
  expect(digest).not.toContain('one verdict');
});

test('grouping preserves the order entries first appeared in', () => {
  const shared = 'shared';
  const groups = groupByVerdict([
    obs({ signature: 'first', status: 'ignored', note: shared }),
    obs({ signature: 'second', status: 'ignored', note: 'other' }),
    obs({ signature: 'third', status: 'ignored', note: shared }),
  ]);
  expect(groups.map((g) => g.observations.map((o) => o.signature))).toEqual([
    ['first', 'third'],
    ['second'],
  ]);
});

test('an entry that stopped happening says so, and says what to do about it', () => {
  const digest = renderDigest(
    {
      observations: [
        obs({ signature: 'a', status: 'ignored', note: 'known', absentSince: '2026-09-08' }),
        obs({ signature: 'b', status: 'ignored', note: 'other' }),
      ],
    },
    '2026-09-08',
  );

  expect(digest).toContain('**Not seen since 2026-09-08**');
  // Both readings named, no verdict — an intermittent event gets marked too.
  expect(digest).toContain('the cause was fixed, or it never fired reliably');
  // Counted in the header, so it is visible without reading every entry.
  expect(digest).toContain('1 not seen when last exercised');
});

test('with nothing absent the header stays two-part, not "0 no longer occurring"', () => {
  const digest = renderDigest({ observations: [obs({ signature: 'a' })] }, '2026-09-08');
  expect(digest).toContain('**1 not yet reviewed · 0 reviewed.**');
  // Only the header is asserted: the intro paragraph always explains what the label means,
  // so a document-wide search for the phrase would match that prose and prove nothing.
  expect(digest).not.toContain('· 0 not seen when last exercised');
});
