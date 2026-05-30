import { existsSync, readFileSync } from 'node:fs';
import type { CaseResult, QaseMap } from './types';
import { indexResults, normalizeTitle } from './results-reader';
import { loadMap } from './map-store';
import { QaseClient } from './qase-client';
import { qaseConfig } from '../utils/qase-env';

const SEP = ' › '; // matches map-store's logical-key separator
const QASE_WEB_BASE = 'https://app.qase.io'; // cloud web app (run links); self-hosted differs

// title (normalized) → case id, derived from the map keys' last segment.
function titleIndex(map: QaseMap): Map<string, number> {
  const out = new Map<string, number>();
  for (const [key, id] of Object.entries(map)) {
    out.set(normalizeTitle(key.split(SEP).at(-1) ?? ''), id);
  }
  return out;
}

// Pure: match the tests that ran (from the report) to existing cases via the map.
// Unmapped tests (ran but not in Qase yet) go to `skipped`. Never touches the catalog.
export function selectResults(
  report: unknown,
  map: QaseMap,
): { results: CaseResult[]; skipped: string[] } {
  const byTitle = titleIndex(map);
  const results: CaseResult[] = [];
  const skipped: string[] = [];
  for (const [normTitle, hit] of indexResults(report)) {
    const caseId = byTitle.get(normTitle);
    if (caseId === undefined) {
      skipped.push(normTitle);
      continue;
    }
    results.push({
      caseId,
      status: hit.status,
      comment: hit.failedProjects.length
        ? `failed on: ${hit.failedProjects.join(', ')}`
        : undefined,
    });
  }
  return { results, skipped };
}

// Pure: title the run by the distinct features (first map-key segment) of the matched cases.
export function runTitle(map: QaseMap, results: CaseResult[], date: string): string {
  const featureById = new Map<number, string>();
  for (const [key, id] of Object.entries(map)) featureById.set(id, key.split(SEP)[0] ?? '');
  const features = [
    ...new Set(
      results.map((r) => featureById.get(r.caseId)).filter((f): f is string => Boolean(f)),
    ),
  ].sort();
  return `On-demand: ${features.length ? features.join(', ') : 'tests'} — ${date}`;
}

// ---- record-only CLI (run via tsx): src/tcms/run-report.ts ----
async function main(): Promise<void> {
  const cfg = qaseConfig();
  if (!cfg) {
    console.log('TCMS off (QASE_API_TOKEN/QASE_PROJECT_CODE unset) — skipping Qase run.');
    return;
  }
  if (!existsSync('test-results/results.json')) {
    console.log('No test-results/results.json — run the tests first, then `npm run tcms:run`.');
    return;
  }
  const report = JSON.parse(readFileSync('test-results/results.json', 'utf-8'));
  const map = loadMap('qase-map.json');
  const { results, skipped } = selectResults(report, map);
  if (results.length === 0) {
    console.log('No matching Qase cases for this run. Run `npm run tcms:sync` to refresh the map.');
    if (skipped.length) console.log(`Not in Qase: ${skipped.join('; ')}`);
    return;
  }
  const title = runTitle(map, results, new Date().toISOString().slice(0, 10));
  const runId = await new QaseClient(cfg).recordResults(results, {
    jiraKey: '',
    sourceUrl: '',
    runTitle: title,
  });
  console.log(`Qase run created — ${results.length} result(s) recorded.`);
  console.log(`  ${QASE_WEB_BASE}/run/${cfg.projectCode}/dashboard/${runId}`);
  if (skipped.length) {
    console.log(`Skipped (not in Qase yet — run \`npm run tcms:sync\`): ${skipped.join('; ')}`);
  }
}

if (process.argv[1]?.endsWith('run-report.ts')) {
  main().catch((err) => {
    // A Qase outage never blocks the dev.
    console.error(`Qase run failed: ${err}`);
    process.exitCode = 0;
  });
}
