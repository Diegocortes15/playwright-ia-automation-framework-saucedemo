import { test, expect } from '@playwright/test';
import { runSuiteSync } from './suite-sync';
import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta, QaseMap, TestRecord } from './types';

class FakeSeam implements TcmsSeam {
  public upserted: { suiteId: number; c: TcmsCase }[] = [];
  public archived: number[] = [];
  private nextId = 100;
  async ensureSuitePath(path: string[]): Promise<number> {
    return path.length; // deterministic, non-zero
  }
  async upsertCase(suiteId: number, c: TcmsCase): Promise<number> {
    this.upserted.push({ suiteId, c });
    return this.nextId++;
  }
  async recordResults(_results: CaseResult[], _meta: SyncMeta): Promise<number> {
    return 0; // not exercised — suite-sync is catalog-only
  }
  async archiveCase(id: number): Promise<void> {
    this.archived.push(id);
  }
}

const records: TestRecord[] = [
  {
    title: 'standard_user logs in',
    acText: 'Lands on inventory',
    user: 'standard_user',
    tags: ['@no-auth'],
    bucket: 'Positive',
    feature: 'login',
    contextLabel: 'no auth',
    jira: [{ key: 'SW-1', url: 'u' }],
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

test('roots cases at feature › context › bucket and writes the map', async () => {
  const seam = new FakeSeam();
  const out = await runSuiteSync({ records, report, oldMap: {} }, seam);
  expect(seam.upserted).toHaveLength(1);
  expect(seam.upserted[0].c.suitePath).toEqual(['login', 'no auth', 'Positive']);
  expect(seam.upserted[0].c.steps.at(-1)).toEqual({
    action: 'Submit',
    expected: 'Lands on inventory',
  });
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
  const out = await runSuiteSync({ records, report, oldMap }, seam);
  expect(seam.archived).toEqual([200]);
  expect(out.archived).toEqual([200]);
  expect(out.newMap['login › no auth › Negative › gone test']).toBeUndefined();
});

test('a record with no matching result is reported unlinked, not synced', async () => {
  const seam = new FakeSeam();
  const orphanRecord: TestRecord = { ...records[0], title: 'never ran' };
  const out = await runSuiteSync({ records: [orphanRecord], report, oldMap: {} }, seam);
  expect(seam.upserted).toHaveLength(0);
  expect(out.unlinked).toEqual(['never ran']);
});

test('partial run carries forward non-ran records — archives nothing', async () => {
  const seam = new FakeSeam();
  // The login test exists (has a record + an existing case id 100) but does NOT run
  // in this invocation (empty report). It must be carried forward, never archived.
  const oldMap: QaseMap = { 'login › no auth › Positive › standard_user logs in': 100 };
  const loginRecord: TestRecord = {
    title: 'standard_user logs in',
    acText: 'x',
    user: 'no-auth',
    tags: [],
    bucket: 'Positive',
    feature: 'login',
    contextLabel: 'no auth',
    jira: [{ key: 'SW-1', url: 'u' }],
  };
  const out = await runSuiteSync({ records: [loginRecord], report: { suites: [] }, oldMap }, seam);
  expect(seam.archived).toEqual([]); // nothing archived
  expect(out.archived).toEqual([]);
  expect(out.newMap['login › no auth › Positive › standard_user logs in']).toBe(100); // carried forward
  expect(out.unlinked).toEqual(['standard_user logs in']);
});
