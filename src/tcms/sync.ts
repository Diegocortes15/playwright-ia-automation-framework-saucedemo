import type { TcmsSeam, TestRecord, SyncMeta, CaseResult, TcmsStatus } from './types';
import { indexResults, normalizeTitle } from './results-reader';
import { mapToCase } from './case-mapper';

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
