import { test, expect } from '@playwright/test';
import { runSync, parseArgs } from './sync';
import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta, TestRecord } from './types';

class FakeSeam implements TcmsSeam {
  public upserted: TcmsCase[] = [];
  public recorded: CaseResult[] = [];
  async ensureSuitePath(): Promise<number> {
    return 1;
  }
  async upsertCase(_suiteId: number, c: TcmsCase): Promise<number> {
    this.upserted.push(c);
    return this.upserted.length; // deterministic id
  }
  async recordResults(results: CaseResult[], _meta: SyncMeta): Promise<void> {
    this.recorded = results;
  }
}

const records: TestRecord[] = [
  {
    title: 'standard_user logs in successfully and lands on inventory',
    acText: 'Lands on inventory',
    user: 'standard_user',
    tags: ['@no-auth'],
    bucket: 'Positive',
    feature: 'login',
    contextLabel: 'no auth',
  },
  {
    title: 'a test with no result in the report',
    acText: 'x',
    user: 'no-auth',
    tags: [],
    bucket: 'Negative',
    feature: 'login',
    contextLabel: 'no auth',
  },
];
const report = {
  suites: [
    {
      title: 's',
      specs: [
        {
          title: '@no-auth standard_user logs in successfully and lands on inventory',
          tests: [
            {
              results: [{ status: 'passed', steps: [{ title: 'Navigate' }, { title: 'Submit' }] }],
            },
          ],
        },
      ],
    },
  ],
};
const meta: SyncMeta = { jiraKey: 'SW-1', sourceUrl: 'u', runTitle: 'r' };

test('matched records become cases + results; unmatched are reported, not synced', async () => {
  const seam = new FakeSeam();
  const outcome = await runSync({ records, meta, report }, seam);
  expect(outcome.synced.map((s) => s.title)).toEqual([records[0].title]);
  expect(outcome.missing).toEqual([records[1].title]);
  expect(seam.upserted).toHaveLength(1);
  expect(seam.upserted[0].steps.at(-1)).toEqual({
    action: 'Submit',
    expected: 'Lands on inventory',
  });
  expect(seam.recorded).toEqual([{ caseId: 1, status: 'passed' }]);
});

test('no matches → recordResults is not called', async () => {
  const seam = new FakeSeam();
  const outcome = await runSync({ records: [records[1]], meta, report }, seam);
  expect(outcome.synced).toHaveLength(0);
  expect(seam.recorded).toEqual([]);
});

test('parseArgs reads --records and defaults --results', () => {
  expect(parseArgs(['--records', 'r.json'])).toEqual({
    records: 'r.json',
    results: 'test-results/results.json',
  });
});

test('parseArgs throws when --records is absent', () => {
  expect(() => parseArgs(['--results', 'x.json'])).toThrow('Missing --records');
});

test('parseArgs throws when a flag has no following value', () => {
  expect(() => parseArgs(['--records'])).toThrow('--records requires a value');
});
