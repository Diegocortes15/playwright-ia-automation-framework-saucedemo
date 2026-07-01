import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Report annotations linking a test to its Jira ticket(s), derived from the committed
// per-test provenance in `.tcms/records/<feature>.json` (the same source the Qase
// mirror uses). The fixture pushes these automatically, so there is no per-test
// boilerplate and multi-ticket files stay correct. A missing/unmatched record simply
// yields no annotation.

interface JiraRef {
  key: string;
  url: string;
}
interface RecordEntry {
  title: string;
  jira?: JiraRef[];
}

const RECORDS_DIR = '.tcms/records';
const featureCache = new Map<string, Map<string, JiraRef[]>>();

// Title → jira[] index for one feature's records file (read once, then cached).
function indexFor(feature: string): Map<string, JiraRef[]> {
  const cached = featureCache.get(feature);
  if (cached) return cached;
  const index = new Map<string, JiraRef[]>();
  try {
    const parsed = JSON.parse(readFileSync(join(RECORDS_DIR, `${feature}.json`), 'utf-8')) as {
      records?: RecordEntry[];
    };
    for (const r of parsed.records ?? []) index.set(r.title, r.jira ?? []);
  } catch {
    // No records file for this feature (or unreadable) — annotate nothing.
  }
  featureCache.set(feature, index);
  return index;
}

// Playwright test annotations for the test titled `title` in feature `feature`.
export function jiraAnnotations(
  feature: string,
  title: string,
): { type: string; description: string }[] {
  return (indexFor(feature).get(title) ?? []).map((j) => ({ type: 'issue', description: j.url }));
}
