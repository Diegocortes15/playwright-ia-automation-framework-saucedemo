import { test, expect } from '@playwright/test';
import { runSuiteSync } from './suite-sync';
import type { EnrichedRecord } from './suite-sync';
import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta, QaseMap } from './types';

class FakeSeam implements TcmsSeam {
  public upserted: { suiteId: number; c: TcmsCase }[] = [];
  public results: CaseResult[] = [];
  public archived: number[] = [];
  private nextId = 100;
  async ensureSuitePath(path: string[]): Promise<number> {
    return path.length; // deterministic, non-zero
  }
  async upsertCase(suiteId: number, c: TcmsCase): Promise<number> {
    this.upserted.push({ suiteId, c });
    return this.nextId++;
  }
  async recordResults(results: CaseResult[], _meta: SyncMeta): Promise<void> {
    this.results = results;
  }
  async archiveCase(id: number): Promise<void> {
    this.archived.push(id);
  }
}

const records: EnrichedRecord[] = [
  {
    title: 'standard_user logs in',
    acText: 'Lands on inventory',
    user: 'standard_user',
    tags: ['@no-auth'],
    bucket: 'Positive',
    feature: 'login',
    contextLabel: 'no auth',
    jiraKey: 'SW-1',
    sourceUrl: 'u',
  },
];
const report = {
  suites: [
    {
      title: 's',
      specs: [
        {
          title: 'standard_user logs in',
          tests: [
            {
              projectName: 'standard',
              results: [{ status: 'passed', steps: [{ title: 'Navigate' }, { title: 'Submit' }] }],
            },
          ],
        },
      ],
    },
  ],
};
const meta: SyncMeta = { jiraKey: 'SW-1', sourceUrl: 'u', runTitle: 'Regression — 2026-05-29' };

test('roots cases at feature › context › bucket, records the run, writes the map', async () => {
  const seam = new FakeSeam();
  const out = await runSuiteSync({ records, report, oldMap: {}, meta }, seam);
  expect(seam.upserted).toHaveLength(1);
  expect(seam.upserted[0].c.suitePath).toEqual(['login', 'no auth', 'Positive']);
  expect(seam.upserted[0].c.steps.at(-1)).toEqual({
    action: 'Submit',
    expected: 'Lands on inventory',
  });
  expect(seam.results).toEqual([{ caseId: 100, status: 'passed', comment: undefined }]);
  expect(out.newMap).toEqual({
    'login › no auth › Positive › standard_user logs in': 100,
  });
  expect(out.archived).toEqual([]);
});

test('archives orphans: an old map entry with no current record', async () => {
  const seam = new FakeSeam();
  const oldMap: QaseMap = {
    'login › no auth › Positive › standard_user logs in': 100,
    'login › no auth › Negative › gone test': 200,
  };
  const out = await runSuiteSync({ records, report, oldMap, meta }, seam);
  expect(seam.archived).toEqual([200]);
  expect(out.archived).toEqual([200]);
  expect(out.newMap['login › no auth › Negative › gone test']).toBeUndefined();
});

test('a record with no matching result is reported unlinked, not synced', async () => {
  const seam = new FakeSeam();
  const orphanRecord: EnrichedRecord = { ...records[0], title: 'never ran' };
  const out = await runSuiteSync({ records: [orphanRecord], report, oldMap: {}, meta }, seam);
  expect(seam.upserted).toHaveLength(0);
  expect(out.unlinked).toEqual(['never ran']);
});

test('failed multi-project run carries a comment naming the failing projects', async () => {
  const seam = new FakeSeam();
  const twoProj = {
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'standard_user logs in',
            tests: [
              {
                projectName: 'standard',
                results: [{ status: 'passed', steps: [{ title: 'Navigate' }] }],
              },
              {
                projectName: 'problem',
                results: [{ status: 'failed', steps: [{ title: 'Navigate' }] }],
              },
            ],
          },
        ],
      },
    ],
  };
  await runSuiteSync({ records, report: twoProj, oldMap: {}, meta }, seam);
  expect(seam.results[0].status).toBe('failed');
  expect(seam.results[0].comment).toContain('problem');
});
