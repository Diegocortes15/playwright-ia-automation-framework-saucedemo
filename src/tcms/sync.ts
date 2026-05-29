import { readFileSync } from 'node:fs';
import type { TcmsSeam, TestRecord, SyncMeta, CaseResult, TcmsStatus } from './types';
import { indexResults, normalizeTitle } from './results-reader';
import { mapToCase } from './case-mapper';
import { QaseClient } from './qase-client';
import { qaseConfig } from '../utils/qase-env';

export interface SyncInput {
  records: TestRecord[];
  meta: SyncMeta;
  report: unknown; // parsed test-results/results.json
}
export interface SyncOutcome {
  synced: { title: string; status: TcmsStatus }[];
  missing: string[];
}

// Pure orchestration: map matched records → cases via the seam, then record
// results. Testable with a fake seam (no env, no file I/O).
export async function runSync(input: SyncInput, seam: TcmsSeam): Promise<SyncOutcome> {
  const index = indexResults(input.report);
  const outcome: SyncOutcome = { synced: [], missing: [] };
  const results: CaseResult[] = [];
  for (const record of input.records) {
    const hit = index.get(normalizeTitle(record.title));
    if (!hit) {
      outcome.missing.push(record.title);
      continue;
    }
    const c = mapToCase(record, hit.steps, hit.status, input.meta);
    const suiteId = await seam.ensureSuitePath(c.suitePath);
    const caseId = await seam.upsertCase(suiteId, c);
    results.push({ caseId, status: hit.status });
    outcome.synced.push({ title: record.title, status: hit.status });
  }
  if (results.length > 0) await seam.recordResults(results, input.meta);
  return outcome;
}

// ---- CLI (run via tsx): src/tcms/sync.ts --records <file> [--results <file>] ----
export function parseArgs(argv: string[]): { records: string; results: string } {
  let records = '';
  let results = 'test-results/results.json';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--records') records = takeValue(argv, ++i, '--records');
    else if (argv[i] === '--results') results = takeValue(argv, ++i, '--results');
  }
  if (!records) throw new Error('Missing --records <file>');
  return { records, results };
}

function takeValue(argv: string[], i: number, flag: string): string {
  const value = argv[i];
  if (value === undefined) throw new Error(`${flag} requires a value`);
  return value;
}

async function main(): Promise<void> {
  const cfg = qaseConfig();
  if (!cfg) {
    console.log('TCMS off (QASE_API_TOKEN/QASE_PROJECT_CODE unset) — skipping Qase sync.');
    return;
  }
  const args = parseArgs(process.argv.slice(2));
  const payload = JSON.parse(readFileSync(args.records, 'utf-8')) as {
    records: TestRecord[];
    meta: SyncMeta;
  };
  const report = JSON.parse(readFileSync(args.results, 'utf-8'));
  const outcome = await runSync(
    { records: payload.records, meta: payload.meta, report },
    new QaseClient(cfg),
  );
  console.log(`Qase sync: ${outcome.synced.length} synced, ${outcome.missing.length} unmatched.`);
  if (outcome.missing.length) console.log(`Unmatched: ${outcome.missing.join('; ')}`);
}

// Execute main() only when run as a script, not when imported by the unit test.
if (process.argv[1]?.endsWith('sync.ts')) {
  main().catch((err) => {
    // Decision 7: a mirror outage never fails the /from-issue run.
    console.error(`Qase sync failed: ${err}`);
    process.exitCode = 0;
  });
}
