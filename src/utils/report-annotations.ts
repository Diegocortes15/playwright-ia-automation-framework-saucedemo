import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Playwright report annotations for a test, derived from the committed per-test
// provenance in `.tcms/records/<feature>.json` (the same source the Qase mirror
// uses), so there is no per-test boilerplate and multi-ticket feature files stay
// correct. Each test gets:
//   - an `issue` annotation per Jira ticket it traces to (the browse URL), and
//   - a `covers` annotation with the acceptance-criterion text it verifies (acText).
// A missing/unmatched record yields no annotations.

interface JiraRef {
  key: string;
  url: string;
}
interface ExpectedFailureRef {
  key: string;
  url: string;
  reason: string;
}
interface RecordEntry {
  title: string;
  acText?: string;
  jira?: JiraRef[];
  expectedFailure?: ExpectedFailureRef;
}

const RECORDS_DIR = '.tcms/records';
const featureCache = new Map<string, Map<string, RecordEntry>>();

// Title → record index for one feature's records file (read once, then cached).
function indexFor(feature: string): Map<string, RecordEntry> {
  const cached = featureCache.get(feature);
  if (cached) return cached;
  const index = new Map<string, RecordEntry>();
  try {
    const parsed = JSON.parse(readFileSync(join(RECORDS_DIR, `${feature}.json`), 'utf-8')) as {
      records?: RecordEntry[];
    };
    for (const r of parsed.records ?? []) index.set(r.title, r);
  } catch {
    // No records file for this feature (or unreadable) — annotate nothing.
  }
  featureCache.set(feature, index);
  return index;
}

export function reportAnnotations(
  feature: string,
  title: string,
  options: { expectedToFail?: boolean } = {},
): { type: string; description: string }[] {
  const record = indexFor(feature).get(title);
  if (!record) return [];
  const annotations = (record.jira ?? []).map((j) => ({ type: 'issue', description: j.url }));
  if (record.acText) annotations.push({ type: 'covers', description: record.acText });

  // A `test.fail()` test shows up in the HTML report as a bare "expected" status, which tells a
  // reader nothing. Say in words why it is expected to fail, and what will happen when it stops.
  if (options.expectedToFail) {
    const defect = record.expectedFailure;
    annotations.push(
      defect
        ? {
            type: 'known defect',
            description:
              `${defect.key} — ${defect.reason} ` +
              'This test asserts the correct behaviour and is expected to fail while the defect ' +
              'is open, so the suite stays green. The day it is fixed the run reports ' +
              '"Expected to fail, but passed." — remove the test.fail() marker in that same ' +
              `pull request. ${defect.url}`,
          }
        : {
            // ADR-0024: "An unattributed test.fail() is indistinguishable from a test somebody
            // gave up on." Detection, not prevention — it never fails the run.
            type: '⚠ unattributed expected failure',
            description:
              'This test is marked test.fail() but its record names no defect, so nobody can ' +
              'tell whether it locks in a known bug or was quietly given up on. Add ' +
              'expectedFailure to its entry in .tcms/records/, naming the filed defect ' +
              '(ADR-0024).',
          },
    );
  }
  return annotations;
}
