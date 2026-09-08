import type { TcmsStatus } from './types';

export interface IndexedResult {
  steps: string[];
  status: TcmsStatus;
  failedProjects: string[]; // project names where the test did not pass (for the run comment)
  /**
   * Projects where the test needed a retry to pass. Green, and not the same thing as green:
   * Playwright exits 0 on a flake, so a run can be a success with something quietly wrong in
   * it. Nothing in this project read that word before.
   */
  flakyProjects: string[];
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
    const perProject = (spec.tests ?? []).map((t) => {
      const attempts = t.results ?? [];
      // The LAST attempt, not the first. With `retries: 2` on CI a flaky test's attempts are
      // [failed, passed]: reading attempt 0 reported it as a failure to the TCMS while the CI
      // job reported success, so the two records contradicted each other and neither said
      // "flaky". The last attempt is also the one with complete steps — a failed first attempt
      // stops partway through them.
      const last = attempts[attempts.length - 1];
      return {
        project: t.projectName,
        status: mapStatus(last?.status),
        flaky: attempts.length > 1 && last?.status === 'passed',
        steps: extractSteps(last?.steps ?? []),
      };
    });
    if (perProject.length === 0) continue;
    out.set(normalizeTitle(spec.title), aggregate(perProject));
  }
}

// Collapse one logical test's per-project results into a single IndexedResult.
// passed only if every project passed; skipped only if every project skipped;
// otherwise failed. Steps are identical across projects — take the first non-empty.
function aggregate(
  perProject: { project?: string; status: TcmsStatus; flaky: boolean; steps: string[] }[],
): IndexedResult {
  const named = (pick: (p: (typeof perProject)[number]) => boolean): string[] =>
    perProject
      .filter(pick)
      .map((p) => p.project)
      .filter((p): p is string => Boolean(p));

  const failedProjects = named((p) => p.status === 'failed');
  // A flake is recorded as passed, because it passed and the job agrees. The fact that it
  // needed a retry rides in the comment instead of being invented as a status Qase has no
  // word for.
  const flakyProjects = named((p) => p.flaky);
  const allPassed = perProject.every((p) => p.status === 'passed');
  const allSkipped = perProject.every((p) => p.status === 'skipped');
  const status: TcmsStatus = allPassed ? 'passed' : allSkipped ? 'skipped' : 'failed';
  const steps = perProject.find((p) => p.steps.length > 0)?.steps ?? [];
  return { steps, status, failedProjects, flakyProjects };
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
