// Tool-agnostic TCMS contracts. case-mapper + qase-client both depend on these;
// no Qase specifics leak here, so a future Xray/Zephyr/Kiwi client implements the
// same TcmsSeam (per the Phase K design — the "thin seam").

export type TcmsStatus = 'passed' | 'failed' | 'skipped';
export type TcmsBucket = 'Positive' | 'Negative' | 'Edge';

export interface TcmsStep {
  action: string;
  expected: string; // '' when the step has no specific expected result
}

export interface TcmsCase {
  suitePath: string[]; // e.g. ['login', 'no auth', 'Positive'] — the suite tree
  title: string; // prose test title — the case title within the leaf suite
  steps: TcmsStep[];
  description: string; // provenance + AC text
  preconditions: string; // user/context, e.g. 'Session: standard_user'
  tags: string[];
  bucket: TcmsBucket;
  // Structured provenance — some seams (Xray/Zephyr) link test↔requirement by Jira key.
  jiraKey: string;
  sourceUrl: string;
  status: TcmsStatus; // run outcome; carried for seams that can set case status (e.g. Xray). sync.ts records run status via CaseResult.
}

// One per-test record from /from-issue's Step 6 semantic model, written to the
// records file the skill hands the sync CLI (Step 11.5).
export interface TestRecord {
  title: string; // prose title (matches the spec test title)
  acText: string; // normalized AC text → the human-readable expected outcome
  user: string; // 'standard_user' | 'problem_user' | … | 'no-auth'
  tags: string[];
  bucket: TcmsBucket;
  feature: string; // suite root, e.g. 'login'
  contextLabel: string; // e.g. 'no auth', 'problem_user'
}

export interface SyncMeta {
  jiraKey: string;
  sourceUrl: string;
  runTitle: string; // e.g. 'from-issue SW-1 — 2026-05-28'
}

export interface CaseResult {
  caseId: number;
  status: TcmsStatus;
}

// The seam every TCMS backend implements. qase-client.ts is the first impl.
export interface TcmsSeam {
  ensureSuitePath(path: string[]): Promise<number>; // create-as-needed → leaf suite id
  upsertCase(suiteId: number, c: TcmsCase): Promise<number>; // find-or-create by (suite,title)
  recordResults(results: CaseResult[], meta: SyncMeta): Promise<void>; // create run + results
}
