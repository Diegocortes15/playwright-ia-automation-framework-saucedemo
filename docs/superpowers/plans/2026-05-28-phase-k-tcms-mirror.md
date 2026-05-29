# Phase K — Optional TCMS Mirror via `/from-issue` (Qase) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an opt-in capability that mirrors `/from-issue`-generated tests into Qase as human-readable test cases (steps + expected + status), behind a swappable seam, without changing the default run.

**Architecture:** A pure `src/tcms/` core (`types` → `case-mapper` + `results-reader`) feeds a thin Qase REST seam (`qase-client`) via an orchestrator (`sync`, a `tsx` CLI). `/from-issue` Step 11.5 writes a records file from its semantic model and invokes the CLI; the CLI merges those records with `test-results/results.json` (for `test.step` names + pass/fail) and upserts cases keyed by suite-path + title. Off unless `QASE_*` env is set.

**Tech Stack:** TypeScript (ESM), Node 22 + `tsx` (run the TS CLI), Playwright Test (unit-test runner via a dedicated config), Node global `fetch` (Qase REST, `Token:` header), Prettier/ESLint/tsc gates.

**Spec:** [`docs/superpowers/specs/2026-05-28-phase-k-tcms-mirror-design.md`](../specs/2026-05-28-phase-k-tcms-mirror-design.md)

**Branch:** `phase-k-tcms-mirror` (off `main`; spec already committed).

**Grounded facts (verified during planning):**

- The PW JSON reporter's top-level `results[0].steps[]` contains **only `test.step()` entries** (`title` + `duration`; no hooks, no `expect`, no `category` field in PW 1.59). Extraction = ordered top-level step titles (with a defensive hook/category filter for version drift).
- On `e2e-jira-from-issues` (where `/from-issue` runs), Page Objects wrap actions in `test.step`, so steps are present. On `main` they are not — irrelevant here because unit tests use synthetic inputs and the live proof runs on `e2e`.
- Qase REST: base `https://api.qase.io/v1`; auth header **`Token: <token>`** (confirm against the token's curl example — Task 9); project code in the path; `POST /case/{code}`, `GET /case/{code}?filters[search]=`, `PATCH /case/{code}/{id}`, `GET|POST /suite/{code}`, `POST /run/{code}`, `POST /result/{code}/{run_id}` with `status` ∈ `passed|failed|blocked|skipped|invalid`.
- Node 22.15 cannot run `.ts` directly → `tsx` devDependency.
- No unit-test runner exists → a dedicated `playwright.unit.config.ts` (no new dependency).

---

## Execution & sequencing

1. Tasks 1–6 build `src/tcms/` bottom-up (types → pure mappers → env → seam → orchestrator), each gated by `npm run test:unit` / `tsc` / `eslint` and committed.
2. Tasks 7–8 wire the skill workflow + write the ADR/docs (Prettier-gated).
3. Task 9 proves it against a free Qase project, then **Integration A** merges `phase-k-tcms-mirror` → `main` (`--no-ff`) → `e2e-jira-from-issues`.

---

## File Structure

| File                                                              | Responsibility                                                         | Task |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| `src/tcms/types.ts`                                               | Tool-agnostic contracts: `TcmsCase`, `TestRecord`, `TcmsSeam`, …       | 1    |
| `playwright.unit.config.ts` + `package.json` script               | Non-browser unit-test harness (`npm run test:unit`)                    | 2    |
| `src/tcms/case-mapper.ts` (+ `.test.ts`)                          | Pure: record + steps + status → `TcmsCase` (human-readable steps)      | 2    |
| `src/tcms/results-reader.ts` (+ `.test.ts`)                       | Pure: parsed PW JSON → `Map<normTitle, {steps, status}>`               | 3    |
| `src/utils/env.ts`, `.env.example`                                | Optional `qaseConfig()` reader (TCMS off when unset)                   | 4    |
| `src/tcms/qase-client.ts` (+ `.test.ts`)                          | The seam: Qase REST via `fetch` (`Token:` auth), implements `TcmsSeam` | 5    |
| `src/tcms/sync.ts` (+ `.test.ts`)                                 | Orchestrator `runSync()` + `tsx` CLI `main()`                          | 6    |
| `package.json`                                                    | `tsx` devDependency                                                    | 6    |
| `.claude/skills/from-issue/references/workflow.md`                | New Step 11.5 (opt-in push)                                            | 7    |
| `.claude/skills/from-issue/references/tcms-sync.md`               | Mapping rules + gating + failure handling                              | 7    |
| `.claude/skills/from-issue/references/pr-description-template.md` | Qase-sync summary / warning lines                                      | 7    |
| `docs/adr/0016-tcms-mirror.md`                                    | Decision record                                                        | 8    |
| `docs/test-case-management.md`                                    | Amend "Why no TCMS" → opt-in mirror                                    | 8    |
| `docs/tcms.md`, `CLAUDE.md`                                       | Usage guide + one-line pointer                                         | 8    |

---

## Task 1: `src/tcms/types.ts` — the contracts

**Files:** Create `src/tcms/types.ts`.

- [ ] **Step 1: Write the file.**

```ts
// Tool-agnostic TCMS contracts. case-mapper + qase-client both depend on these;
// no Qase specifics leak here, so a future Xray/Zephyr/Kiwi client implements the
// same TcmsSeam (per the Phase K design — the "thin seam").

export type TcmsStatus = 'passed' | 'failed' | 'skipped';

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
  bucket: string; // 'Positive' | 'Negative' | 'Edge'
  jiraKey: string;
  sourceUrl: string;
  status: TcmsStatus;
}

// One per-test record from /from-issue's Step 6 semantic model, written to the
// records file the skill hands the sync CLI (Step 11.5).
export interface TestRecord {
  title: string; // prose title (matches the spec test title)
  acText: string; // normalized AC text → the human-readable expected outcome
  user: string; // 'standard_user' | 'problem_user' | … | 'no-auth'
  tags: string[];
  bucket: string;
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
```

- [ ] **Step 2: Typecheck + commit.**

Run: `npx tsc --noEmit`
Expected: exit 0 (no output).

```bash
git add src/tcms/types.ts
git commit -m "feat(tcms): tool-agnostic TCMS contracts" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: unit harness + `case-mapper.ts` (TDD)

**Files:** Create `playwright.unit.config.ts`, modify `package.json`, create `src/tcms/case-mapper.ts` + `src/tcms/case-mapper.test.ts`.

- [ ] **Step 1: Create the unit-test config.**

```ts
// playwright.unit.config.ts — runs pure (non-browser) unit tests under src/tcms.
// Separate from playwright.config.ts so the matrix/grep stays untouched and these
// tests don't need a browser or storageState. No new test-runner dependency.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src/tcms',
  testMatch: '**/*.test.ts',
  fullyParallel: true,
  reporter: [['list']],
});
```

- [ ] **Step 2: Add the npm script.** In `package.json` `scripts`, add after `"test:smoke"`:

```json
    "test:unit": "playwright test -c playwright.unit.config.ts",
```

- [ ] **Step 3: Write the failing test.** Create `src/tcms/case-mapper.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { mapToCase } from './case-mapper';
import type { TestRecord } from './types';

const record: TestRecord = {
  title: 'standard_user logs in successfully and lands on inventory',
  acText: 'The browser lands on the Products / Inventory page (/inventory.html)',
  user: 'standard_user',
  tags: ['@no-auth', '@smoke'],
  bucket: 'Positive',
  feature: 'login',
  contextLabel: 'no auth',
};
const meta = { jiraKey: 'SW-1', sourceUrl: 'https://x/browse/SW-1' };

test('maps suite path, title, and AC-as-expected on the last step', () => {
  const c = mapToCase(record, ['Navigate to the login page', 'Submit credentials'], 'passed', meta);
  expect(c.suitePath).toEqual(['login', 'no auth', 'Positive']);
  expect(c.title).toBe(record.title);
  expect(c.steps).toEqual([
    { action: 'Navigate to the login page', expected: '' },
    { action: 'Submit credentials', expected: record.acText },
  ]);
  expect(c.preconditions).toBe('Session: standard_user');
  expect(c.description).toContain('SW-1');
  expect(c.description).toContain(record.acText);
  expect(c.status).toBe('passed');
});

test('no test.step → one synthetic step carrying the AC as expected', () => {
  const c = mapToCase({ ...record, user: 'no-auth' }, [], 'failed', meta);
  expect(c.steps).toEqual([
    { action: 'Automated test (no granular steps recorded)', expected: record.acText },
  ]);
  expect(c.preconditions).toBe('No authentication');
  expect(c.status).toBe('failed');
});
```

- [ ] **Step 4: Run it — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './case-mapper'` (or "mapToCase is not a function").

- [ ] **Step 5: Implement `src/tcms/case-mapper.ts`.**

```ts
import type { TcmsCase, TcmsStep, TcmsStatus, TestRecord } from './types';

const NO_STEPS_ACTION = 'Automated test (no granular steps recorded)';

// Map a /from-issue record + executed test.step names + run status → a TcmsCase.
// Pure: no I/O, no Qase knowledge. Human-readable steps are composed here.
export function mapToCase(
  record: TestRecord,
  stepTitles: string[],
  status: TcmsStatus,
  meta: { jiraKey: string; sourceUrl: string },
): TcmsCase {
  return {
    suitePath: [record.feature, record.contextLabel, record.bucket],
    title: record.title,
    steps: toSteps(stepTitles, record.acText),
    description: `Covers Jira ${meta.jiraKey} — ${meta.sourceUrl}\n\n${record.acText}`,
    preconditions: record.user === 'no-auth' ? 'No authentication' : `Session: ${record.user}`,
    tags: record.tags,
    bucket: record.bucket,
    jiraKey: meta.jiraKey,
    sourceUrl: meta.sourceUrl,
    status,
  };
}

// Step actions = the executed test.step names; the covered AC text is the
// human-readable expected outcome, attached to the LAST step. A test with no
// test.step still yields one step carrying the AC as its expected result.
function toSteps(stepTitles: string[], acText: string): TcmsStep[] {
  if (stepTitles.length === 0) return [{ action: NO_STEPS_ACTION, expected: acText }];
  return stepTitles.map((action, i) => ({
    action,
    expected: i === stepTitles.length - 1 ? acText : '',
  }));
}
```

- [ ] **Step 6: Run it — verify it passes.**

Run: `npm run test:unit`
Expected: PASS — 2 passed.

- [ ] **Step 7: Commit.**

```bash
git add playwright.unit.config.ts package.json src/tcms/case-mapper.ts src/tcms/case-mapper.test.ts
git commit -m "feat(tcms): pure case-mapper + unit harness" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `src/tcms/results-reader.ts` (TDD)

**Files:** Create `src/tcms/results-reader.ts` + `src/tcms/results-reader.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `src/tcms/results-reader.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { indexResults, normalizeTitle } from './results-reader';

// Mirrors the real PW JSON shape verified during planning: nested suites → specs,
// each spec's tests[0].results[0] has status + top-level steps (test.step only).
const report = {
  suites: [
    {
      title: 'login/login.spec.ts',
      suites: [
        {
          title: 'login (@no-auth)',
          specs: [
            {
              title: '@no-auth standard_user logs in successfully and lands on inventory',
              tests: [
                {
                  results: [
                    {
                      status: 'passed',
                      steps: [
                        { title: 'Navigate to the login page', duration: 5 },
                        { title: 'Submit credentials', duration: 9 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test('normalizeTitle strips embedded tags, collapses space, lowercases', () => {
  expect(normalizeTitle('@no-auth  Standard_User Logs In')).toBe('standard_user logs in');
});

test('indexes by normalized title with ordered step titles + mapped status', () => {
  const idx = indexResults(report);
  const hit = idx.get(normalizeTitle('standard_user logs in successfully and lands on inventory'));
  expect(hit).toBeTruthy();
  expect(hit!.steps).toEqual(['Navigate to the login page', 'Submit credentials']);
  expect(hit!.status).toBe('passed');
});

test('hook steps and timedOut status are handled defensively', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'x',
            tests: [
              {
                results: [
                  {
                    status: 'timedOut',
                    steps: [
                      { title: 'Before Hooks', duration: 1 },
                      { title: 'Real step', duration: 2 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('x')!;
  expect(hit.steps).toEqual(['Real step']);
  expect(hit.status).toBe('failed');
});
```

- [ ] **Step 2: Run it — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './results-reader'`.

- [ ] **Step 3: Implement `src/tcms/results-reader.ts`.**

```ts
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
```

- [ ] **Step 4: Run it — verify it passes.**

Run: `npm run test:unit`
Expected: PASS — all tests pass (Task 2 + Task 3).

- [ ] **Step 5: Commit.**

```bash
git add src/tcms/results-reader.ts src/tcms/results-reader.test.ts
git commit -m "feat(tcms): results-reader indexes PW JSON by title" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `qaseConfig()` in `env.ts` + `.env.example`

**Files:** Modify `src/utils/env.ts`, `.env.example`. Read both first.

- [ ] **Step 1: Append the optional config reader to `src/utils/env.ts`** (after the existing `env` export):

```ts
export interface QaseConfig {
  apiToken: string;
  projectCode: string;
  apiHost: string;
}

// Optional — returns null when TCMS is not configured (capability stays off).
// NOT via required(): absence is the normal "TCMS off" state, not an error.
export function qaseConfig(): QaseConfig | null {
  const apiToken = process.env.QASE_API_TOKEN?.trim();
  const projectCode = process.env.QASE_PROJECT_CODE?.trim();
  if (!apiToken || !projectCode) return null;
  return {
    apiToken,
    projectCode,
    apiHost: process.env.QASE_API_HOST?.trim() || 'https://api.qase.io/v1',
  };
}
```

- [ ] **Step 2: Document the vars in `.env.example`** (append):

```bash
# Optional — Qase TCMS mirror (Phase K). When unset, /from-issue skips the push.
# QASE_API_TOKEN=your_qase_api_token
# QASE_PROJECT_CODE=SAUCE
# QASE_API_HOST=https://api.qase.io/v1
```

- [ ] **Step 3: Typecheck + commit.**

Run: `npx tsc --noEmit`
Expected: exit 0.

```bash
git add src/utils/env.ts .env.example
git commit -m "feat(tcms): optional qaseConfig() env reader (off when unset)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `qase-client.ts` — the Qase REST seam (TDD with a `fetch` stub)

**Files:** Create `src/tcms/qase-client.ts` + `src/tcms/qase-client.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `src/tcms/qase-client.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { QaseClient } from './qase-client';
import type { QaseConfig } from '../utils/env';
import type { TcmsCase } from './types';

const cfg: QaseConfig = {
  apiToken: 'tok',
  projectCode: 'SAUCE',
  apiHost: 'https://api.qase.io/v1',
};

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | undefined;
}

function stubFetch(responder: (call: Call) => unknown): Call[] {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const call: Call = {
      url: String(url),
      method: init.method ?? 'GET',
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    return {
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => responder(call),
    } as Response;
  }) as typeof fetch;
  return calls;
}

const baseCase: TcmsCase = {
  suitePath: ['login', 'no auth', 'Positive'],
  title: 'standard_user logs in',
  steps: [
    { action: 'Navigate to the login page', expected: '' },
    { action: 'Submit credentials', expected: 'Lands on inventory' },
  ],
  description: 'd',
  preconditions: 'No authentication',
  tags: [],
  bucket: 'Positive',
  jiraKey: 'SW-1',
  sourceUrl: 'u',
  status: 'passed',
};

test('upsertCase creates when none matches: Token auth, classic steps, suite_id', async () => {
  const calls = stubFetch((c) =>
    c.method === 'GET' ? { result: { entities: [] } } : { result: { id: 42 } },
  );
  const id = await new QaseClient(cfg).upsertCase(7, baseCase);
  expect(id).toBe(42);
  const post = calls.find((c) => c.method === 'POST')!;
  expect(post.url).toBe('https://api.qase.io/v1/case/SAUCE');
  expect(post.headers.Token).toBe('tok');
  expect(post.body!.steps_type).toBe('classic');
  expect(post.body!.suite_id).toBe(7);
  expect((post.body!.steps as { expected_result: string }[])[1].expected_result).toBe(
    'Lands on inventory',
  );
});

test('upsertCase updates (PATCH) when a same-title/suite case exists', async () => {
  const calls = stubFetch((c) =>
    c.method === 'GET'
      ? { result: { entities: [{ id: 99, title: 'standard_user logs in', suite_id: 7 }] } }
      : { result: { id: 99 } },
  );
  const id = await new QaseClient(cfg).upsertCase(7, baseCase);
  expect(id).toBe(99);
  expect(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/case/SAUCE/99'))).toBe(true);
});

test('recordResults creates a run then posts each result with a valid status', async () => {
  const calls = stubFetch((c) =>
    c.url.includes('/run/') ? { result: { id: 5 } } : { result: { id: 1 } },
  );
  await new QaseClient(cfg).recordResults([{ caseId: 42, status: 'passed' }], {
    jiraKey: 'SW-1',
    sourceUrl: 'u',
    runTitle: 'from-issue SW-1 — 2026-05-28',
  });
  const run = calls.find((c) => c.url.endsWith('/run/SAUCE'))!;
  expect(run.body!.is_autotest).toBe(true);
  const result = calls.find((c) => c.url === 'https://api.qase.io/v1/result/SAUCE/5')!;
  expect(result.body).toEqual({ case_id: 42, status: 'passed' });
});
```

- [ ] **Step 2: Run it — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './qase-client'`.

- [ ] **Step 3: Implement `src/tcms/qase-client.ts`.**

```ts
import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta } from './types';
import type { QaseConfig } from '../utils/env';

interface Entity {
  id: number;
  title: string;
  parent_id?: number | null;
  suite_id?: number | null;
}
interface ListResp {
  result: { entities: Entity[] };
}
interface IdResp {
  result: { id: number };
}

// The seam: the ONLY module that knows Qase's REST API. A future Xray/Zephyr/Kiwi
// client implements the same TcmsSeam interface. Auth is the `Token:` header
// (confirm against the token's curl example — see plan Task 9).
export class QaseClient implements TcmsSeam {
  constructor(private readonly cfg: QaseConfig) {}

  private async rpc<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.cfg.apiHost}${path}`, {
      method,
      headers: { Token: this.cfg.apiToken, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Qase ${method} ${path} → ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  }

  async ensureSuitePath(path: string[]): Promise<number> {
    let parentId: number | undefined;
    let suiteId = 0;
    for (const title of path) {
      suiteId = await this.ensureSuite(title, parentId);
      parentId = suiteId;
    }
    return suiteId;
  }

  private async ensureSuite(title: string, parentId?: number): Promise<number> {
    const code = this.cfg.projectCode;
    const q = new URLSearchParams({ 'filters[search]': title, limit: '100' });
    const found = await this.rpc<ListResp>('GET', `/suite/${code}?${q}`);
    const match = found.result.entities.find(
      (s) => s.title === title && (s.parent_id ?? undefined) === parentId,
    );
    if (match) return match.id;
    const created = await this.rpc<IdResp>('POST', `/suite/${code}`, {
      title,
      parent_id: parentId,
    });
    return created.result.id;
  }

  async upsertCase(suiteId: number, c: TcmsCase): Promise<number> {
    const code = this.cfg.projectCode;
    const q = new URLSearchParams({ 'filters[search]': c.title, limit: '100' });
    const found = await this.rpc<ListResp>('GET', `/case/${code}?${q}`);
    const body = {
      title: c.title,
      suite_id: suiteId,
      description: c.description,
      preconditions: c.preconditions,
      steps_type: 'classic',
      steps: c.steps.map((s, i) => ({
        position: i + 1,
        action: s.action,
        expected_result: s.expected,
      })),
    };
    const match = found.result.entities.find((x) => x.title === c.title && x.suite_id === suiteId);
    if (match) {
      await this.rpc('PATCH', `/case/${code}/${match.id}`, body);
      return match.id;
    }
    const created = await this.rpc<IdResp>('POST', `/case/${code}`, body);
    return created.result.id;
  }

  async recordResults(results: CaseResult[], meta: SyncMeta): Promise<void> {
    const code = this.cfg.projectCode;
    const run = await this.rpc<IdResp>('POST', `/run/${code}`, {
      title: meta.runTitle,
      cases: results.map((r) => r.caseId),
      is_autotest: true,
    });
    for (const r of results) {
      await this.rpc('POST', `/result/${code}/${run.result.id}`, {
        case_id: r.caseId,
        status: r.status,
      });
    }
  }
}
```

- [ ] **Step 4: Run it — verify it passes; lint.**

Run: `npm run test:unit`
Expected: PASS — all unit tests (Tasks 2, 3, 5) pass.
Run: `npx eslint src/tcms`
Expected: exit 0.

- [ ] **Step 5: Commit.**

```bash
git add src/tcms/qase-client.ts src/tcms/qase-client.test.ts
git commit -m "feat(tcms): Qase REST seam (find-or-create cases, record results)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: `sync.ts` — orchestrator + `tsx` CLI (TDD)

**Files:** Create `src/tcms/sync.ts` + `src/tcms/sync.test.ts`, modify `package.json` (add `tsx`).

- [ ] **Step 1: Add `tsx` as a devDependency.**

Run: `npm install --save-dev tsx@^4`
Expected: `tsx` appears in `package.json` devDependencies; exit 0.

- [ ] **Step 2: Write the failing test.** Create `src/tcms/sync.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { runSync } from './sync';
import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta, TestRecord } from './types';

class FakeSeam implements TcmsSeam {
  public upserted: TcmsCase[] = [];
  public recorded: CaseResult[] = [];
  async ensureSuitePath(): Promise<number> {
    return 1;
  }
  async upsertCase(_suiteId: number, c: TcmsCase): Promise<number> {
    this.upserted.push(c);
    return this.upserted.length; // deterministic id
  }
  async recordResults(results: CaseResult[], _meta: SyncMeta): Promise<void> {
    this.recorded = results;
  }
}

const records: TestRecord[] = [
  {
    title: 'standard_user logs in successfully and lands on inventory',
    acText: 'Lands on inventory',
    user: 'standard_user',
    tags: ['@no-auth'],
    bucket: 'Positive',
    feature: 'login',
    contextLabel: 'no auth',
  },
  {
    title: 'a test with no result in the report',
    acText: 'x',
    user: 'no-auth',
    tags: [],
    bucket: 'Negative',
    feature: 'login',
    contextLabel: 'no auth',
  },
];
const report = {
  suites: [
    {
      title: 's',
      specs: [
        {
          title: '@no-auth standard_user logs in successfully and lands on inventory',
          tests: [
            {
              results: [{ status: 'passed', steps: [{ title: 'Navigate' }, { title: 'Submit' }] }],
            },
          ],
        },
      ],
    },
  ],
};
const meta: SyncMeta = { jiraKey: 'SW-1', sourceUrl: 'u', runTitle: 'r' };

test('matched records become cases + results; unmatched are reported, not synced', async () => {
  const seam = new FakeSeam();
  const outcome = await runSync({ records, meta, report }, seam);
  expect(outcome.synced.map((s) => s.title)).toEqual([records[0].title]);
  expect(outcome.missing).toEqual([records[1].title]);
  expect(seam.upserted).toHaveLength(1);
  expect(seam.upserted[0].steps.at(-1)).toEqual({
    action: 'Submit',
    expected: 'Lands on inventory',
  });
  expect(seam.recorded).toEqual([{ caseId: 1, status: 'passed' }]);
});

test('no matches → recordResults is not called', async () => {
  const seam = new FakeSeam();
  const outcome = await runSync({ records: [records[1]], meta, report }, seam);
  expect(outcome.synced).toHaveLength(0);
  expect(seam.recorded).toEqual([]);
});
```

- [ ] **Step 3: Run it — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './sync'`.

- [ ] **Step 4: Implement `src/tcms/sync.ts`.**

```ts
import { readFileSync } from 'node:fs';
import type { TcmsSeam, TestRecord, SyncMeta, CaseResult, TcmsStatus } from './types';
import { indexResults, normalizeTitle } from './results-reader';
import { mapToCase } from './case-mapper';
import { QaseClient } from './qase-client';
import { qaseConfig } from '../utils/env';

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
function parseArgs(argv: string[]): { records: string; results: string } {
  let records = '';
  let results = 'test-results/results.json';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--records') records = argv[++i];
    else if (argv[i] === '--results') results = argv[++i];
  }
  if (!records) throw new Error('Missing --records <file>');
  return { records, results };
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
```

- [ ] **Step 5: Run it — verify it passes; typecheck + lint.**

Run: `npm run test:unit`
Expected: PASS — all unit tests pass.
Run: `npx tsc --noEmit && npx eslint src/tcms`
Expected: both exit 0.

- [ ] **Step 6: Smoke-test the CLI's "off" path** (no env → graceful skip):

Run: `npx tsx src/tcms/sync.ts --records /dev/null`
Expected: prints `TCMS off (...) — skipping Qase sync.` and exits 0 (does NOT throw on the missing file, because the off-check returns first).

- [ ] **Step 7: Commit.**

```bash
git add src/tcms/sync.ts src/tcms/sync.test.ts package.json package-lock.json
git commit -m "feat(tcms): sync orchestrator + tsx CLI (gated, fail-safe)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Wire `/from-issue` Step 11.5 + skill references

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`, `.claude/skills/from-issue/references/pr-description-template.md`; create `.claude/skills/from-issue/references/tcms-sync.md`. Read each first.

- [ ] **Step 1: Create `.claude/skills/from-issue/references/tcms-sync.md`.**

````markdown
# Optional TCMS Sync (Qase) — Step 11.5

The opt-in mirror of generated tests into a TCMS (default: Qase), behind the
`src/tcms/` seam. See [ADR-0016](../../../../docs/adr/0016-tcms-mirror.md) and
[`docs/tcms.md`](../../../../docs/tcms.md). **One-way: code is the source of truth.**

## When it runs

Step 11.5 of [`workflow.md`](workflow.md) — after the tests run (Step 10) and the
branch is pushed (Step 11), before the PR (Step 12). **Skipped entirely** when:

- `dry-run` was passed (no external side effects), OR
- `QASE_API_TOKEN` / `QASE_PROJECT_CODE` are unset (capability off).

A failure here NEVER aborts the run or blocks the PR (it is a downstream mirror).

## What the skill does

1. Build a records file from the Step 6 model — one object per generated test:

   ```json
   {
     "meta": {
       "jiraKey": "SW-1",
       "sourceUrl": "https://…/browse/SW-1",
       "runTitle": "from-issue SW-1 — 2026-05-28"
     },
     "records": [
       {
         "title": "<prose test title, exactly as written in the spec>",
         "acText": "<the normalized AC text this test covers — the human-readable expected outcome>",
         "user": "standard_user | … | no-auth",
         "tags": ["@no-auth", "@smoke"],
         "bucket": "Positive | Negative | Edge",
         "feature": "<feature slug, e.g. login>",
         "contextLabel": "<context label, e.g. 'no auth' / 'problem_user'>"
       }
     ]
   }
   ```

   Write it via the Write tool to `.tcms-records.json`.

2. Invoke the sync CLI (reads the just-produced `test-results/results.json` for the
   executed `test.step` names + pass/fail):

   ```bash
   npx tsx src/tcms/sync.ts --records .tcms-records.json
   ```

3. Capture stdout for the PR body (Step 12). Then delete the temp file:

   ```bash
   rm .tcms-records.json
   ```

## Mapping (implemented in `src/tcms/case-mapper.ts` — do not re-derive)

- **suite path** = `feature › contextLabel › bucket` (nested Qase suites).
- **case title** = the prose test title.
- **steps** = executed `test.step` names (from the report); the **last step's
  expected_result = the AC text** (the human-readable outcome). No `test.step` →
  one synthetic step carrying the AC.
- **description** = `Covers Jira <KEY> — <url>` + AC text. **preconditions** = the
  user/context. **status** = the run's pass/fail.
- Cases are **upserted by suite-path + title** — never store a Qase id in code.

## Cross-cutting `po_modified` note

If this run modified a SHARED Page Object method (`po_modified = true`, Step 5),
other tickets' tests' steps changed too but are not in this run's records. Add to
the PR body: `⚠️ a shared method changed — N other Qase cases may have stale steps;
refresh via the whole-suite backfill extension.` (The MVP does not auto-refresh them.)
````

- [ ] **Step 2: Add Step 11.5 to `workflow.md`.** FIND the start of Step 12:

```markdown
### 12. Open PR
```

REPLACE WITH:

```markdown
### 11.5. Sync test cases to the TCMS (optional, Qase)

**Skip entirely** if `dry-run` was passed OR `QASE_API_TOKEN`/`QASE_PROJECT_CODE`
are unset. Per [`references/tcms-sync.md`](tcms-sync.md) (read it before this step):
write `.tcms-records.json` from the Step 6 model, run `npx tsx src/tcms/sync.ts
--records .tcms-records.json`, capture stdout for the PR body, then `rm
.tcms-records.json`. A non-zero/failed sync is recorded as a PR warning and
**never aborts** the run or blocks the PR (it is a one-way downstream mirror).

### 12. Open PR
```

- [ ] **Step 3: Add the sync line to `pr-description-template.md`.** FIND the Verification section heading (the line beginning `## Verification` or the typecheck/test bullet area — match the existing template) and append a bullet:

```markdown
- 🗂️ **TCMS sync (Qase):** <synced N / unmatched M, or "skipped — not configured", or "⚠️ failed: <error>">. <Include the `po_modified` stale-steps warning here when applicable.>
```

- [ ] **Step 4: Format + consistency + commit.**

```bash
npx prettier --check .claude/skills/from-issue/references/tcms-sync.md .claude/skills/from-issue/references/workflow.md .claude/skills/from-issue/references/pr-description-template.md
grep -n "11.5" .claude/skills/from-issue/references/workflow.md   # expect: present
grep -n "tcms-sync" .claude/skills/from-issue/references/workflow.md   # expect: the cross-ref
```

Expected: prettier passes; both greps match. (If prettier reports issues, run `npx prettier --write` on the three files and re-check.)

```bash
git add .claude/skills/from-issue/references/tcms-sync.md .claude/skills/from-issue/references/workflow.md .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(tcms): wire /from-issue Step 11.5 optional Qase sync" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: ADR-0016 + docs + CLAUDE.md

**Files:** Create `docs/adr/0016-tcms-mirror.md`, `docs/tcms.md`; modify `docs/test-case-management.md`, `CLAUDE.md`. Read `docs/adr/0000-template.md`, `docs/test-case-management.md`, and the CLAUDE.md "Custom skills" section first.

- [ ] **Step 1: Write `docs/adr/0016-tcms-mirror.md`** (follow `0000-template.md` structure):

```markdown
# ADR-0016: Optional one-way TCMS mirror via /from-issue (Qase default)

## Status

Accepted (2026-05-28). Scopes the "no TCMS" stance in
[`docs/test-case-management.md`](../test-case-management.md): TCMS stays **off by
default**; this adds an **opt-in** mirror.

## Context

`docs/test-case-management.md` ships no TCMS because, for a code-first suite, a TCMS
usually means duplicate maintenance, ID drift, and a stale second source of truth.
But it also names the revisit trigger: non-technical stakeholders needing a UI to
browse test cases and results. This repo is also a portfolio piece, so a cloud,
recruiter-recognizable catalog has standalone value.

## Decision

A one-way **code → TCMS mirror**, pushed from `/from-issue` Step 11.5 (opt-in, env-
gated), behind a thin `src/tcms/` seam (`TcmsSeam`). Default backend: **Qase**
(cloud, free tier, REST + `Token:` auth, first-class `action`/`expected` steps).
Cases are **upserted by suite-path + title** — no TCMS id is ever stored in code
(avoids the drift the no-TCMS doc warns about). Steps come from the run's
`test.step` names; the expected result is the normalized AC text. A sync failure is
a PR warning, never a blocker.

## Consequences

- Non-technical reviewers get a browsable, human-readable catalog + latest status.
- Code stays the single source of truth; the mirror is disposable and rebuildable.
- The seam keeps Xray/Zephyr/Kiwi swappable for client mandates (none implemented).
- Out of scope (YAGNI): whole-suite backfill, manual cases, bidirectional sync,
  orphan cleanup on rename. See the spec for the full non-goals list.

## Alternatives considered

- **Self-hosted Kiwi:** local-only (unreachable by reviewers/CI) and its RPC API
  has no method to push test steps. Rejected; possible future on-prem seam impl.
- **Testiny / Tuskr:** nice UIs but unverified API/step support; the seam keeps them
  open. **Xray/Zephyr:** paid, unvalidatable on a free plan.
- **Custom PW reporter:** runner-coupled, pollutes config; rejected for an opt-in
  capability. **Storing a Qase id per spec:** the exact drift we avoid.
```

- [ ] **Step 2: Amend `docs/test-case-management.md`.** FIND the "Why no TCMS?" section opening line and insert a pointer immediately under the `## Why no TCMS?` heading:

```markdown
> **Update (ADR-0016, 2026-05-28):** TCMS remains **off by default** for the reasons
> below. An **opt-in one-way mirror** (default: Qase) is now available via
> `/from-issue` — see [`docs/tcms.md`](tcms.md) and
> [ADR-0016](adr/0016-tcms-mirror.md). The reasoning below is why it is opt-in, not
> on by default.
```

- [ ] **Step 3: Write `docs/tcms.md`** (usage guide):

````markdown
# Optional TCMS Mirror (Qase)

An **opt-in, one-way** mirror of the automated suite into a TCMS so non-technical
reviewers can browse and approve human-readable test cases. Off unless configured.
Decision: [ADR-0016](adr/0016-tcms-mirror.md). Design:
[`superpowers/specs/2026-05-28-phase-k-tcms-mirror-design.md`](superpowers/specs/2026-05-28-phase-k-tcms-mirror-design.md).

## Turn it on (free Qase project)

1. Create a free Qase account + project; note its **project code** (e.g. `SAUCE`).
2. Create an API token (Qase → Apps/API tokens). Confirm the auth header from the
   token page's curl example — it is the **`Token:`** header.
3. Set env (e.g. in `.env`):

   ```bash
   QASE_API_TOKEN=...
   QASE_PROJECT_CODE=SAUCE
   # QASE_API_HOST=https://api.qase.io/v1   # override only for self-hosted
   ```

That's it — the next `/from-issue` run (not `dry-run`) pushes its tests at Step 11.5.

## What gets synced (one-way, code → Qase)

- A **suite tree** `feature › context › bucket`, a **case** per test (prose title),
  **classic steps** from the `test.step` names with the **AC text as the final
  step's expected result**, plus description/preconditions/status.
- Cases are **upserted by suite-path + title** — re-running an updating ticket
  updates the same case. No Qase id is stored in code.

## Swapping the backend (the seam)

`src/tcms/qase-client.ts` is the only Qase-aware file; it implements `TcmsSeam`
(`src/tcms/types.ts`). To target Xray/Zephyr/self-hosted Kiwi, add a sibling client
implementing the same interface and construct it in `src/tcms/sync.ts`. Teams who
prefer a typed SDK can swap the hand-rolled `fetch` for the official `qaseio` client.

## Not included (YAGNI)

Whole-suite backfill (`npm run tcms:sync`), manual cases, bidirectional sync, and
orphan cleanup on rename are out of scope — see the spec's non-goals.
````

- [ ] **Step 4: Add a CLAUDE.md pointer.** In the "Custom skills" list (the `/from-issue` bullet) append one sentence, and add a row to the "Where things live" table.

Append to the `/from-issue` bullet:

```markdown
Optionally mirrors generated tests into a TCMS (Qase) at PR time when `QASE_*` is set — opt-in, one-way, [ADR-0016](docs/adr/0016-tcms-mirror.md) / [`docs/tcms.md`](docs/tcms.md).
```

Add to the "Where things live" table:

```markdown
| TCMS mirror (optional Qase seam) | `src/tcms/` (`types.ts`, `case-mapper.ts`, `results-reader.ts`, `qase-client.ts`, `sync.ts`) |
```

- [ ] **Step 5: Format + commit.**

```bash
npx prettier --check docs/adr/0016-tcms-mirror.md docs/tcms.md docs/test-case-management.md CLAUDE.md
```

Expected: passes (else `--write` then re-check).

```bash
git add docs/adr/0016-tcms-mirror.md docs/tcms.md docs/test-case-management.md CLAUDE.md
git commit -m "docs(tcms): ADR-0016 + usage guide; amend no-TCMS stance" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Prove it against a live Qase project, then integrate

**Files:** none (verification + branch integration).

- [ ] **Step 1: Provision.** Create a free Qase project (code e.g. `SAUCE`) + API token. Confirm the `Token:` header from the curl example. Export `QASE_API_TOKEN` / `QASE_PROJECT_CODE`.

- [ ] **Step 2: Produce a real report with steps.** On `e2e-jira-from-issues` (Page Objects use `test.step`), run a spec:

```bash
git stash --include-untracked   # if needed to switch cleanly; restore after
git checkout e2e-jira-from-issues
npx playwright test tests/login/login.spec.ts --project=no-auth
```

Expected: `test-results/results.json` exists with non-empty `steps` for the login tests.

- [ ] **Step 3: Hand-build a records file** matching those tests (one record per login test, real prose titles + AC text) at `/tmp/tcms-records.json`, then run the CLI from the branch that has `src/tcms/` (cherry-pick/merge order: do this after Integration A, or temporarily copy `src/tcms` + run via tsx). Simplest: perform Step 3–4 **after Integration A** so `e2e` already has `src/tcms/`.

```bash
npx tsx src/tcms/sync.ts --records /tmp/tcms-records.json
```

Expected stdout: `Qase sync: N synced, 0 unmatched.`

- [ ] **Step 4: Verify in the Qase UI.** Cases appear under `login › no auth › Positive|Negative` with readable steps (the last step's expected = the AC) and a run with pass/fail. Re-run the CLI → the same cases update in place (no duplicates). If the `Token:` header is wrong, the run errors with a `401/403` from the seam — fix the header per the curl example and re-run.

- [ ] **Step 5: Confirm the "off" guarantee.** With `QASE_API_TOKEN` unset, run the full suite:

```bash
npm test
```

Expected: identical to today — no TCMS activity, no failures introduced.

- [ ] **Integration A: merge to main, then e2e.**

```bash
git checkout main && git merge --no-ff phase-k-tcms-mirror -m "Merge phase-k-tcms-mirror: optional Qase TCMS mirror via /from-issue (Phase K)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin main
git checkout e2e-jira-from-issues && git merge main -m "Merge main into e2e-jira-from-issues: Phase K TCMS mirror" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin e2e-jira-from-issues
git branch -d phase-k-tcms-mirror
```

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (one-way) → Tasks 5/6 (push only). Decision 2 (upsert by suite-path+title, no id in code) → Task 5 `upsertCase`/`ensureSuitePath` + Task 6. Decision 3 (Step 11.5, dry-run skip) → Task 7. Decision 4 (mapping) → Tasks 2/3 + `tcms-sync.md`. Decision 5 (seam: mapper/client/sync/types) → Tasks 1/2/3/5/6. Decision 6 (gating) → Task 4 + Task 7 skip + Task 9 Step 5. Decision 7 (never block PR) → Task 6 `main()` catch + Task 7. Decision 8 (`po_modified` flag) → `tcms-sync.md` + PR template. Decision 9 (ADR-0016 + amend) → Task 8. Verification approach → Tasks 2/3/5/6 (unit), Task 9 (live + off). No gaps.

**Placeholder scan:** No TBD/TODO. Every code step shows complete code; every command has expected output. The one runtime unknown (Qase `Token:` vs `Bearer`) is written as `Token` with an explicit Task 9 confirm-and-fix step — not a placeholder.

**Type consistency:** `TcmsCase`/`TestRecord`/`TcmsSeam`/`CaseResult`/`SyncMeta`/`TcmsStatus` defined in Task 1 are used unchanged in Tasks 2/3/5/6. `mapToCase(record, stepTitles, status, meta)` signature matches between Task 2 impl, its test, and Task 6 `runSync`. `indexResults`/`normalizeTitle` match between Task 3 and Task 6. `QaseClient` implements `TcmsSeam` (Task 5) and is constructed in Task 6. `qaseConfig()`/`QaseConfig` (Task 4) are imported in Tasks 5 (type) and 6 (value). Relative imports (`../utils/env`, `./types`, …) are used throughout `src/tcms/` so both `tsx` and the Playwright unit runner resolve them without alias config.

```

```
