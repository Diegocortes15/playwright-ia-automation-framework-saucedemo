import { test, expect } from '@playwright/test';
import { runSync } from './sync';
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
  async archiveCase(_caseId: number): Promise<void> {
    // no-op stub — archiveCase not exercised in sync.test.ts
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
