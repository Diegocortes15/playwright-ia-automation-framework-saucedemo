import type { TcmsStatus } from './types';

export interface IndexedResult {
  steps: string[];
  status: TcmsStatus;
  failedProjects: string[]; // project names where the test did not pass (for the run comment)
}

const HOOK_TITLES = new Set(['Before Hooks', 'After Hooks', 'Worker Cleanup']);

interface PwStep {
  title: string;
  category?: string;
  duration?: number;
}
interface PwResult {
  status?: string;
  steps?: PwStep[];
}
interface PwSpec {
  title: string;
  tests?: { projectName?: string; results?: PwResult[] }[];
}
interface PwSuite {
  suites?: PwSuite[];
  specs?: PwSpec[];
}

// Index a parsed PW JSON report by normalized test title. Pure: caller reads the
// file and passes the parsed object.
export function indexResults(report: unknown): Map<string, IndexedResult> {
  const out = new Map<string, IndexedResult>();
  // Non-object / malformed input yields an empty map; no throw by design.
  const root = report as { suites?: PwSuite[] };
  for (const suite of root.suites ?? []) walk(suite, out);
  return out;
}

function walk(suite: PwSuite, out: Map<string, IndexedResult>): void {
  for (const child of suite.suites ?? []) walk(child, out);
  for (const spec of suite.specs ?? []) {
    const perProject = (spec.tests ?? []).map((t) => ({
      project: t.projectName,
      status: mapStatus(t.results?.[0]?.status),
      steps: extractSteps(t.results?.[0]?.steps ?? []),
    }));
    if (perProject.length === 0) continue;
    out.set(normalizeTitle(spec.title), aggregate(perProject));
  }
}

// Collapse one logical test's per-project results into a single IndexedResult.
// passed only if every project passed; skipped only if every project skipped;
// otherwise failed. Steps are identical across projects — take the first non-empty.
function aggregate(
  perProject: { project?: string; status: TcmsStatus; steps: string[] }[],
): IndexedResult {
  const failedProjects = perProject
    .filter((p) => p.status === 'failed')
    .map((p) => p.project)
    .filter((p): p is string => Boolean(p));
  const allPassed = perProject.every((p) => p.status === 'passed');
  const allSkipped = perProject.every((p) => p.status === 'skipped');
  const status: TcmsStatus = allPassed ? 'passed' : allSkipped ? 'skipped' : 'failed';
  const steps = perProject.find((p) => p.steps.length > 0)?.steps ?? [];
  return { steps, status, failedProjects };
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
