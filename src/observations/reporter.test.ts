import { test, expect } from '@playwright/test';
import { mergeObservations } from './reporter';
import type { Observation } from './types';

function obs(overrides: Partial<Observation> = {}): Observation {
  return {
    signature: 'failed-request:GET:https://example.com/a:404',
    kind: 'failed-request',
    thirdParty: false,
    count: 1,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    status: 'new',
    sample: { message: '404', test: 'a test', project: 'chromium-standard' },
    ...overrides,
  };
}

test('human triage survives a re-run — status, note and firstSeen are never overwritten', () => {
  const triaged = obs({
    status: 'ignored',
    note: 'GitHub Pages SPA shim; expected',
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    count: 3,
  });
  const seenAgain = obs({ status: 'new', count: 11, lastSeen: '2026-06-15' });

  const [merged] = mergeObservations([triaged], [seenAgain]);

  // What a human decided:
  expect(merged.status).toBe('ignored');
  expect(merged.note).toBe('GitHub Pages SPA shim; expected');
  expect(merged.firstSeen).toBe('2026-01-01');
  // What the run refreshes:
  expect(merged.count).toBe(11);
  expect(merged.lastSeen).toBe('2026-06-15');
});

test('an unseen signature is added; one absent from this run is kept, not dropped', () => {
  const oldEntry = obs({ signature: 'console-error:gone quiet', kind: 'console-error' });
  const newEntry = obs({ signature: 'failed-request:GET:https://example.com/b:500' });

  const merged = mergeObservations([oldEntry], [newEntry]);

  expect(merged).toHaveLength(2);
  expect(merged.map((o) => o.signature)).toContain('console-error:gone quiet');
  expect(merged.map((o) => o.signature)).toContain('failed-request:GET:https://example.com/b:500');
});

test('output is sorted by kind then signature, so the committed file diffs cleanly', () => {
  const unsorted = [
    obs({ signature: 'failed-request:b', kind: 'failed-request' }),
    obs({ signature: 'console-error:z', kind: 'console-error' }),
    obs({ signature: 'failed-request:a', kind: 'failed-request' }),
    obs({ signature: 'console-error:a', kind: 'console-error' }),
  ];

  const merged = mergeObservations([], unsorted);

  expect(merged.map((o) => o.signature)).toEqual([
    'console-error:a',
    'console-error:z',
    'failed-request:a',
    'failed-request:b',
  ]);
  // Stable across runs: merging the same set again must not reshuffle it.
  expect(mergeObservations(merged, merged).map((o) => o.signature)).toEqual(
    merged.map((o) => o.signature),
  );
});
