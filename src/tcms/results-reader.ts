import type { TcmsStatus } from './types';

export interface IndexedResult {
  steps: string[];
  status: TcmsStatus;
}

const HOOK_TITLES = new Set(['Before Hooks', 'After Hooks', 'Worker Cleanup']);

interface PwStep {
  title: string;
  category?: string;
}
interface PwResult {
  status?: string;
  steps?: PwStep[];
}
interface PwSpec {
  title: string;
  tests?: { results?: PwResult[] }[];
}
interface PwSuite {
  suites?: PwSuite[];
  specs?: PwSpec[];
}

// Index a parsed PW JSON report by normalized test title. Pure: caller reads the
// file and passes the parsed object.
export function indexResults(report: unknown): Map<string, IndexedResult> {
  const out = new Map<string, IndexedResult>();
  for (const suite of (report as { suites?: PwSuite[] }).suites ?? []) walk(suite, out);
  return out;
}

function walk(suite: PwSuite, out: Map<string, IndexedResult>): void {
  for (const child of suite.suites ?? []) walk(child, out);
  for (const spec of suite.specs ?? []) {
    const result = spec.tests?.[0]?.results?.[0];
    if (!result) continue;
    out.set(normalizeTitle(spec.title), {
      steps: extractSteps(result.steps ?? []),
      status: mapStatus(result.status),
    });
  }
}

// PW 1.59 top-level steps are the test.step calls. Defensively drop hook entries
// and any non-test.step category should a future PW version include them.
function extractSteps(steps: PwStep[]): string[] {
  return steps
    .filter((s) => !HOOK_TITLES.has(s.title))
    .filter((s) => s.category === undefined || s.category === 'test.step')
    .map((s) => s.title);
}

export function normalizeTitle(title: string): string {
  return title
    .replace(/@[\w-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapStatus(status: string | undefined): TcmsStatus {
  if (status === 'passed') return 'passed';
  if (status === 'skipped') return 'skipped';
  return 'failed'; // failed | timedOut | interrupted
}
