import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TcmsSeam, TestRecord, QaseMap } from './types';
import { indexResults, normalizeTitle } from './results-reader';
import { mapToCase } from './case-mapper';
import { loadMap, saveMap, logicalKey, orphanedIds, mergeMap } from './map-store';
import { QaseClient } from './qase-client';
import { qaseConfig } from '../utils/qase-env';

// A record plus its file-level provenance (from the records file's meta block).
export type EnrichedRecord = TestRecord & { jiraKey: string; sourceUrl: string };

export interface SuiteSyncInput {
  records: EnrichedRecord[];
  report: unknown; // parsed test-results/results.json
  oldMap: QaseMap;
}
export interface SuiteSyncOutcome {
  synced: string[]; // logical keys upserted
  unlinked: string[]; // records with no matching run result
  archived: number[]; // case ids archived
  newMap: QaseMap;
}

// Pure orchestration (inject the seam): records drive structure + AC text; the
// report supplies steps + aggregated multi-project status, matched by title.
export async function runSuiteSync(
  input: SuiteSyncInput,
  seam: TcmsSeam,
): Promise<SuiteSyncOutcome> {
  const index = indexResults(input.report);
  const outcome: SuiteSyncOutcome = { synced: [], unlinked: [], archived: [], newMap: {} };

  for (const record of input.records) {
    const key = logicalKey([record.feature, record.contextLabel, record.bucket], record.title);
    const hit = index.get(normalizeTitle(record.title));
    if (!hit) {
      // This test exists (it has a record) but did not run in THIS invocation. Keep
      // its case as-is by carrying its existing id forward, so a partial sync never
      // archives it. (A brand-new record that hasn't run yet has no id to carry.)
      const existing = input.oldMap[key];
      if (existing !== undefined) outcome.newMap[key] = existing;
      outcome.unlinked.push(record.title);
      continue;
    }
    const c = mapToCase(record, hit.steps, hit.status, {
      jiraKey: record.jiraKey,
      sourceUrl: record.sourceUrl,
    });
    const suiteId = await seam.ensureSuitePath(c.suitePath);
    const caseId = await seam.upsertCase(suiteId, c);
    outcome.newMap[key] = caseId;
    outcome.synced.push(key);
  }

  // Archive ONLY cases whose record no longer exists — i.e. a map key produced by NO
  // current record (ran or carried-forward above). A test that merely didn't run this
  // invocation is carried forward, so a partial sync archives nothing. Records drive
  // existence; results only drive content refresh.
  for (const id of orphanedIds(input.oldMap, Object.keys(outcome.newMap))) {
    await seam.archiveCase(id);
    outcome.archived.push(id);
  }
  outcome.newMap = mergeMap(input.oldMap, outcome.newMap);

  return outcome;
}

// ---- records loader + CLI (run via tsx): src/tcms/suite-sync.ts ----
interface RecordsFile {
  meta: { jiraKey: string; sourceUrl: string };
  records: TestRecord[];
}

export function loadRecords(dir: string): EnrichedRecord[] {
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return []; // no .tcms/records dir → nothing to sync
  }
  const all: EnrichedRecord[] = [];
  for (const f of files) {
    let parsed: RecordsFile;
    try {
      parsed = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as RecordsFile;
    } catch (e) {
      throw new Error(`Failed to parse records file ${join(dir, f)}: ${e}`);
    }
    all.push(
      ...parsed.records.map((r) => ({
        ...r,
        jiraKey: parsed.meta.jiraKey,
        sourceUrl: parsed.meta.sourceUrl,
      })),
    );
  }
  return all;
}

async function main(): Promise<void> {
  const cfg = qaseConfig();
  if (!cfg) {
    console.log('TCMS off (QASE_API_TOKEN/QASE_PROJECT_CODE unset) — skipping Qase sync.');
    return;
  }
  const recordsDir = '.tcms/records';
  const mapPath = 'qase-map.json';
  const records = loadRecords(recordsDir);
  if (records.length === 0) {
    console.log(`No records under ${recordsDir} — nothing to sync.`);
    return;
  }
  if (!existsSync('test-results/results.json')) {
    console.log('No test-results/results.json — run the suite first; skipping Qase sync.');
    return;
  }
  const report = JSON.parse(readFileSync('test-results/results.json', 'utf-8'));
  const outcome = await runSuiteSync(
    { records, report, oldMap: loadMap(mapPath) },
    new QaseClient(cfg),
  );
  saveMap(mapPath, outcome.newMap);
  console.log(
    `Qase suite sync: ${outcome.synced.length} synced, ${outcome.archived.length} archived, ${outcome.unlinked.length} unlinked.`,
  );
  if (outcome.unlinked.length)
    console.log(`Unlinked (record but no run result): ${outcome.unlinked.join('; ')}`);
}

if (process.argv[1]?.endsWith('suite-sync.ts')) {
  main().catch((err) => {
    // A mirror outage never fails the build (Qase is downstream).
    console.error(`Qase suite sync failed: ${err}`);
    process.exitCode = 0;
  });
}
