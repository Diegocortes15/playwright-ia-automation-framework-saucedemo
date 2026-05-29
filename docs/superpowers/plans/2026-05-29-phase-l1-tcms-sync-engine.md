# Phase L1 — Whole-Suite Qase Sync Engine + Merge-Time CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mirror the entire automated suite into Qase at **merge** time — records-driven, deduped per logical test across projects, grouped under a **Regression** suite, marked **automated**, with orphan **archive** and an auto-written `qase-map.json`.

**Architecture:** A records-driven whole-suite orchestrator (`suite-sync.ts`) reads all committed `.tcms/records/*.json` (structure + AC text, written by `/from-issue` instead of pushing) and the full `test-results/results.json` (steps + multi-project status), then find-or-creates one Qase case per logical test under `Regression › feature › context › bucket`, records one run, writes `qase-map.json`, and archives cases whose records vanished. A merge-only, gated, fail-safe CI step runs it. Pure modules are unit-tested with synthetic fixtures; the two Qase API specifics (the `automation` field + the archive mechanism) are probed live before coding.

**Tech Stack:** TypeScript (ESM), Node 22 + `tsx`, Playwright Test (unit runner via `playwright.unit.config.ts`), Node global `fetch` (Qase REST, `Token:` header), Prettier/ESLint/tsc gates.

**Spec:** [`docs/superpowers/specs/2026-05-29-phase-l1-tcms-sync-engine-design.md`](../specs/2026-05-29-phase-l1-tcms-sync-engine-design.md)

**Branch:** `phase-l1-tcms-sync-engine` (off `main`; spec already committed).

**Grounded facts (verified against the current code):**

- `src/tcms/results-reader.ts` exports `indexResults(report): Map<string, IndexedResult>` + `normalizeTitle(title)`; `IndexedResult = { steps: string[]; status: TcmsStatus }`. Its `walk` reads only `spec.tests[0].results[0]` — **L1 aggregates across all `spec.tests[]`** (one per project).
- `src/tcms/qase-client.ts` `QaseClient implements TcmsSeam` with `ensureSuitePath`, `upsertCase`, `recordResults` via a private `rpc()` (`Token:` header). L1 adds `archiveCase()` + an `automation` flag on the case body.
- `src/tcms/case-mapper.ts` exports `mapToCase(record, stepTitles, status, meta) → TcmsCase` (suitePath `[feature, context, bucket]`). Reused; suite-sync prepends `Regression`.
- `src/tcms/sync.ts` is Phase K's per-ticket CLI (`runSync` + `main()` guarded by `process.argv[1]?.endsWith('sync.ts')` + `parseArgs`). **Retired in L1** (CLI `main` removed; `runSync`/`parseArgs` superseded by suite-sync). `case-mapper.ts` stays.
- Unit tests: `npm run test:unit` (Playwright config `playwright.unit.config.ts`, `src/tcms/**/*.test.ts`). Currently 14 pass.
- `.github/workflows/test.yml` runs `npm test` on push to `main`/`e2e-jira-from-issues` with `secrets.SAUCEDEMO_PASSWORD`, producing `test-results/results.json`.
- Qase live: project `SWSAUCE`, `Token:` header confirmed. `automation` field + archive mechanism = **probe in Task 4 before coding**.

---

## Execution & sequencing

1. Tasks 1–5 build the engine bottom-up (types → multi-project reader → map-store → client archive/automation → suite-sync orchestrator+CLI), each gated by `npm run test:unit` / `tsc` / `eslint`, committed.
2. Tasks 6–8 wire CI + the `/from-issue` records-artifact rework + ADR/docs (Prettier-gated).
3. Task 9: Integration A (fast-forward local `e2e` to origin, merge `main` → `e2e`), then on `e2e` author backfill records + live proof; the user adds `QASE_*` GitHub secrets.

---

## File Structure

| File                                                  | Responsibility                                                         | Task |
| ----------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| `src/tcms/types.ts`                                   | `+ archiveCase` on `TcmsSeam`; `+ comment?` on `CaseResult`; map types | 1    |
| `src/tcms/results-reader.ts` (+test)                  | Multi-project aggregation (`failedProjects`)                           | 2    |
| `src/tcms/map-store.ts` (+test)                       | Pure `qase-map.json` load/save + `logicalKey` + orphan diff            | 3    |
| `src/tcms/qase-client.ts` (+test)                     | `archiveCase()` + `automation` flag + result `comment`                 | 4    |
| `src/tcms/suite-sync.ts` (+test)                      | Records-driven whole-suite orchestrator + `tsx` CLI                    | 5    |
| `src/tcms/sync.ts`, `package.json`                    | Retire Phase K CLI; add `tcms:sync` script                             | 5    |
| `.github/workflows/test.yml`                          | Merge-only, gated, fail-safe sync step                                 | 6    |
| `.claude/skills/from-issue/references/*`              | Step 11.5 writes `.tcms/records/<KEY>.json` (no push)                  | 7    |
| `docs/adr/0017-tcms-sync-at-merge.md`, `docs/tcms.md` | Decision record + usage update                                         | 8    |
| `qase-map.json`, `.tcms/records/*.json`               | Auto-written map + backfill records (on `e2e`)                         | 9    |

---

## Task 1: `types.ts` — seam + result + map types

**Files:** Modify `src/tcms/types.ts`.

- [ ] **Step 1: Add `comment?` to `CaseResult`.** FIND:

```ts
export interface CaseResult {
  caseId: number;
  status: TcmsStatus;
}
```

REPLACE WITH:

```ts
export interface CaseResult {
  caseId: number;
  status: TcmsStatus;
  comment?: string; // e.g. which projects failed (multi-project aggregation)
}
```

- [ ] **Step 2: Add `archiveCase` to the seam.** FIND:

```ts
export interface TcmsSeam {
  ensureSuitePath(path: string[]): Promise<number>; // create-as-needed → leaf suite id
  upsertCase(suiteId: number, c: TcmsCase): Promise<number>; // find-or-create by (suite,title)
  recordResults(results: CaseResult[], meta: SyncMeta): Promise<void>; // create run + results
}
```

REPLACE WITH:

```ts
export interface TcmsSeam {
  ensureSuitePath(path: string[]): Promise<number>; // create-as-needed → leaf suite id
  upsertCase(suiteId: number, c: TcmsCase): Promise<number>; // find-or-create by (suite,title)
  recordResults(results: CaseResult[], meta: SyncMeta): Promise<void>; // create run + results
  archiveCase(caseId: number): Promise<void>; // deprecate/archive a case whose test was removed
}

// qase-map.json shape: logical test key → Qase case id. Auto-written by suite-sync;
// read by humans as a test↔case lookup index. Never hand-edited.
export type QaseMap = Record<string, number>;
```

- [ ] **Step 3: Typecheck + commit.**

Run: `npx tsc --noEmit`
Expected: exit 0. (NOTE: `QaseClient` will now fail to compile because it lacks `archiveCase` — that is expected and fixed in Task 4. If `tsc` errors ONLY about `archiveCase` missing on `QaseClient`, that is acceptable for this commit; if it errors elsewhere, stop and fix.)

Because `tsc` must stay green per-commit, **defer the commit**: instead, leave Task 1's edits uncommitted and commit them together at the end of Task 4 (which adds `archiveCase`). Mark Task 1 done once the edits are in place and the only `tsc` error is the missing `archiveCase`.

> Rationale: the seam-interface change and its implementation must land together to keep every commit compiling. Tasks 2 and 3 touch unrelated files and compile fine alongside the interface change.

---

## Task 2: `results-reader.ts` — multi-project aggregation (TDD)

**Files:** Modify `src/tcms/results-reader.ts` + `src/tcms/results-reader.test.ts`.

- [ ] **Step 1: Add the failing tests.** Append to `src/tcms/results-reader.test.ts`:

```ts
test('aggregates across projects: passed only if all projects passed', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'cross-project test',
            tests: [
              {
                projectName: 'standard',
                results: [{ status: 'passed', steps: [{ title: 'Step A' }] }],
              },
              {
                projectName: 'problem',
                results: [{ status: 'failed', steps: [{ title: 'Step A' }] }],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('cross-project test')!;
  expect(hit.status).toBe('failed');
  expect(hit.failedProjects).toEqual(['problem']);
  expect(hit.steps).toEqual(['Step A']);
});

test('all projects passed → passed, no failed projects', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 't',
            tests: [
              { projectName: 'standard', results: [{ status: 'passed', steps: [{ title: 'X' }] }] },
              {
                projectName: 'firefox-standard',
                results: [{ status: 'passed', steps: [{ title: 'X' }] }],
              },
            ],
          },
        ],
      },
    ],
  });
  const hit = idx.get('t')!;
  expect(hit.status).toBe('passed');
  expect(hit.failedProjects).toEqual([]);
});

test('skipped only when every project skipped', () => {
  const idx = indexResults({
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 't',
            tests: [
              { projectName: 'a', results: [{ status: 'skipped', steps: [] }] },
              { projectName: 'b', results: [{ status: 'skipped', steps: [] }] },
            ],
          },
        ],
      },
    ],
  });
  expect(idx.get('t')!.status).toBe('skipped');
});
```

Also UPDATE the two existing single-project tests to expect the new `failedProjects` field: in the test `'indexes by normalized title with ordered step titles + mapped status'`, after the `status` assertion add:

```ts
expect(hit!.failedProjects).toEqual([]);
```

and in `'hook steps and timedOut status are handled defensively'`, after `expect(hit.status).toBe('failed');` add:

```ts
expect(hit.failedProjects).toEqual([undefined].filter(Boolean)); // no projectName in fixture → []
```

> The defensive fixture has no `projectName`, so the failing project is recorded as nothing; `failedProjects` collapses to `[]`. (The `.filter(Boolean)` keeps the assertion explicit that unnamed projects don't pollute the list.)

- [ ] **Step 2: Run — verify the new tests fail.**

Run: `npm run test:unit`
Expected: FAIL on the new multi-project tests (`failedProjects` undefined / only first project read).

- [ ] **Step 3: Implement aggregation.** In `src/tcms/results-reader.ts`:

Change the `IndexedResult` interface:

```ts
export interface IndexedResult {
  steps: string[];
  status: TcmsStatus;
  failedProjects: string[]; // project names where the test did not pass (for the run comment)
}
```

Extend `PwSpec`'s test entry to carry `projectName`:

```ts
interface PwSpec {
  title: string;
  tests?: { projectName?: string; results?: PwResult[] }[];
}
```

Replace the `walk` spec loop body:

```ts
function walk(suite: PwSuite, out: Map<string, IndexedResult>): void {
  for (const child of suite.suites ?? []) walk(child, out);
  for (const spec of suite.specs ?? []) {
    const perProject = (spec.tests ?? [])
      .map((t) => ({
        project: t.projectName,
        status: mapStatus(t.results?.[0]?.status),
        steps: extractSteps(t.results?.[0]?.steps ?? []),
      }))
      .filter((t) => t.steps.length > 0 || t.status !== undefined);
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
    .filter((p) => p.status !== 'passed')
    .map((p) => p.project)
    .filter((p): p is string => Boolean(p));
  const allPassed = perProject.every((p) => p.status === 'passed');
  const allSkipped = perProject.every((p) => p.status === 'skipped');
  const status: TcmsStatus = allPassed ? 'passed' : allSkipped ? 'skipped' : 'failed';
  const steps = perProject.find((p) => p.steps.length > 0)?.steps ?? [];
  return { steps, status, failedProjects };
}
```

> `mapStatus` already returns a `TcmsStatus` for any input (default `failed`), so `t.results?.[0]?.status` undefined → `failed`; that is fine because such an entry only survives the `.filter` if it had steps, and a real PW result always has a status.

- [ ] **Step 4: Run — verify all pass.**

Run: `npm run test:unit`
Expected: PASS (Phase K tests + the 3 new multi-project tests).

- [ ] **Step 5: Typecheck, lint, commit.**

```bash
npx tsc --noEmit            # NOTE: still expect the single 'archiveCase missing on QaseClient' error from Task 1 — acceptable here
npx eslint src/tcms
npx prettier --check src/tcms/results-reader.ts src/tcms/results-reader.test.ts
git add src/tcms/results-reader.ts src/tcms/results-reader.test.ts
git commit -m "feat(tcms): aggregate results across projects (passed iff all pass)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

> If `tsc` shows errors OTHER than the expected `archiveCase`-missing one, stop and fix before committing.

---

## Task 3: `map-store.ts` — qase-map.json read/write (TDD)

**Files:** Create `src/tcms/map-store.ts` + `src/tcms/map-store.test.ts`.

- [ ] **Step 1: Write the failing test.** Create `src/tcms/map-store.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { logicalKey, orphanedIds, mergeMap } from './map-store';
import type { QaseMap } from './types';

test('logicalKey joins suite path + title stably', () => {
  expect(logicalKey(['Regression', 'login', 'no auth', 'Positive'], 'standard_user logs in')).toBe(
    'Regression › login › no auth › Positive › standard_user logs in',
  );
});

test('orphanedIds returns ids in the old map whose key is no longer present', () => {
  const oldMap: QaseMap = { 'a › t1': 10, 'b › t2': 20, 'c › t3': 30 };
  const currentKeys = ['a › t1', 'c › t3'];
  expect(orphanedIds(oldMap, currentKeys)).toEqual([20]); // b › t2 vanished
});

test('mergeMap keeps only current keys with their (new) ids', () => {
  const oldMap: QaseMap = { 'a › t1': 10, 'b › t2': 20 };
  const fresh = { 'a › t1': 10, 'd › t4': 40 }; // t2 gone, t4 new
  expect(mergeMap(oldMap, fresh)).toEqual({ 'a › t1': 10, 'd › t4': 40 });
});
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './map-store'`.

- [ ] **Step 3: Implement `src/tcms/map-store.ts`.**

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { QaseMap } from './types';

const SEP = ' › ';

// Stable logical key for a test: its full suite path + title. Used as the
// qase-map.json key and for orphan detection.
export function logicalKey(suitePath: string[], title: string): string {
  return [...suitePath, title].join(SEP);
}

export function loadMap(path: string): QaseMap {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, 'utf-8')) as QaseMap;
}

export function saveMap(path: string, map: QaseMap): void {
  // Sorted keys for a stable, diff-friendly committed file.
  const sorted: QaseMap = {};
  for (const key of Object.keys(map).sort()) sorted[key] = map[key];
  writeFileSync(path, JSON.stringify(sorted, null, 2) + '\n', 'utf-8');
}

// Case ids present in the old map but whose key is no longer in the current set.
export function orphanedIds(oldMap: QaseMap, currentKeys: string[]): number[] {
  const present = new Set(currentKeys);
  return Object.entries(oldMap)
    .filter(([key]) => !present.has(key))
    .map(([, id]) => id);
}

// The next map = exactly the fresh (current) entries. (Orphans are archived
// separately, then dropped by virtue of not being in `fresh`.)
export function mergeMap(_oldMap: QaseMap, fresh: QaseMap): QaseMap {
  return { ...fresh };
}
```

- [ ] **Step 4: Run — verify pass.**

Run: `npm run test:unit`
Expected: PASS (all prior + 3 new).

- [ ] **Step 5: Lint, prettier, commit.**

```bash
npx eslint src/tcms
npx prettier --check src/tcms/map-store.ts src/tcms/map-store.test.ts
git add src/tcms/map-store.ts src/tcms/map-store.test.ts
git commit -m "feat(tcms): qase-map.json store (logicalKey, orphans, merge)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `qase-client.ts` — archive + automated flag (probe-first, TDD)

**Files:** Modify `src/tcms/qase-client.ts` + `src/tcms/qase-client.test.ts`.

- [ ] **Step 1: Probe the live Qase API for the two unknowns.** Create a throwaway `scratch-qase-probe.ts` at repo root:

```ts
import { qaseConfig } from './src/utils/qase-env';

async function get(path: string) {
  const c = qaseConfig()!;
  const res = await fetch(`${c.apiHost}${path}`, { headers: { Token: c.apiToken } });
  return { status: res.status, body: await res.text() };
}

async function main() {
  const c = qaseConfig()!;
  // (a) full shape of an existing case — does it expose an `automation` field + value?
  console.log(
    'CASE #1:',
    JSON.stringify((await get(`/case/${c.projectCode}/1`)).body).slice(0, 800),
  );
  // (b) the API surface for delete (archive): probe the documented delete endpoint shape (do NOT call it).
  console.log(
    'Run: check developers.qase.io for PATCH automation enum + DELETE /case/{code}/{id} or a status field.',
  );
}
main().catch((e) => console.error(e));
```

Run: `npx tsx scratch-qase-probe.ts`

Record from the output: (a) the exact **`automation`** field key + its enum (Qase uses an integer enum — confirm the value meaning "automated"); (b) the archive approach. **Decision rule for archive:** prefer a non-destructive update if Qase exposes a status/`is_deleted`/deprecate flag on a case; only if the sole option is `DELETE /case/{code}/{id}` use that (least-destructive available). Web-confirm at <https://developers.qase.io/reference/update-case> and <https://developers.qase.io/reference/delete-case> if the probe is inconclusive. **Then delete the probe:** `rm scratch-qase-probe.ts`.

> If the probe shows `automation` is NOT a create/update field, fall back to setting it via the field the API documents (record the finding in the commit body). If no archive-friendly field exists, use `DELETE` and note it in the ADR (Task 8).

- [ ] **Step 2: Write the failing tests.** Append to `src/tcms/qase-client.test.ts` (uses the existing `stubFetch`/`cfg`/`baseCase` helpers in that file):

```ts
test('upsertCase marks the case automated', async () => {
  const calls = stubFetch((c) =>
    c.method === 'GET' ? { result: { entities: [] } } : { result: { id: 7 } },
  );
  await new QaseClient(cfg).upsertCase(3, baseCase);
  const post = calls.find((c) => c.method === 'POST')!;
  expect(post.body!.automation).toBe(2); // 2 = "automated" (confirm enum in Step 1; adjust if different)
});

test('archiveCase issues the archive call for the id', async () => {
  const calls = stubFetch(() => ({ result: { id: 1 } }));
  await new QaseClient(cfg).archiveCase(55);
  // Expect exactly one mutating call targeting case 55 (method/path per Step 1 finding).
  expect(calls.some((c) => c.url.endsWith('/case/SAUCE/55'))).toBe(true);
});

test('recordResults forwards a per-result comment when present', async () => {
  const calls = stubFetch((c) =>
    c.url.includes('/run/') ? { result: { id: 9 } } : { result: { id: 1 } },
  );
  await new QaseClient(cfg).recordResults(
    [{ caseId: 7, status: 'failed', comment: 'failed on: problem' }],
    {
      jiraKey: 'SW-1',
      sourceUrl: 'u',
      runTitle: 'r',
    },
  );
  const result = calls.find((c) => c.url === 'https://api.qase.io/v1/result/SAUCE/9')!;
  expect(result.body).toEqual({ case_id: 7, status: 'failed', comment: 'failed on: problem' });
});
```

- [ ] **Step 3: Run — verify they fail.**

Run: `npm run test:unit`
Expected: FAIL (no `automation` in body; `archiveCase` not a function; `comment` not forwarded).

- [ ] **Step 4: Implement.** In `src/tcms/qase-client.ts`:

(a) Add `automation: 2` to the `upsertCase` body object (use the enum value confirmed in Step 1):

```ts
const body = {
  title: c.title,
  suite_id: suiteId,
  description: c.description,
  preconditions: c.preconditions,
  automation: 2, // "automated" — confirmed via Step 1 probe
  steps_type: 'classic',
  steps: c.steps.map((s, i) => ({
    position: i + 1,
    action: s.action,
    expected_result: s.expected,
  })),
};
```

(b) Forward `comment` in `recordResults` (omit the key when undefined to keep the create-path test stable):

```ts
for (const r of results) {
  await this.rpc('POST', `/result/${code}/${run.result.id}`, {
    case_id: r.caseId,
    status: r.status,
    ...(r.comment === undefined ? {} : { comment: r.comment }),
  });
}
```

(c) Add `archiveCase` (use the method/path confirmed in Step 1 — shown here for the `DELETE` fallback; if Step 1 found a non-destructive flag, use `PATCH /case/${code}/${caseId}` with that field instead):

```ts
  async archiveCase(caseId: number): Promise<void> {
    const code = this.cfg.projectCode;
    // Archive mechanism per Task 4 Step 1 probe. DELETE is the least-destructive
    // option Qase exposes if no deprecate/status flag exists.
    await this.rpc('DELETE', `/case/${code}/${caseId}`);
  }
```

- [ ] **Step 5: Run — verify pass.**

Run: `npm run test:unit`
Expected: PASS. (Adjust the `automation` enum / archive method in both test and impl to match the Step 1 finding — they must agree.)

- [ ] **Step 6: Typecheck (now clean), lint, prettier, commit Task 1 + Task 4 together.**

```bash
npx tsc --noEmit            # now exits 0 — QaseClient implements archiveCase
npx eslint src/tcms
npx prettier --check src/tcms/types.ts src/tcms/qase-client.ts src/tcms/qase-client.test.ts
git add src/tcms/types.ts src/tcms/qase-client.ts src/tcms/qase-client.test.ts
git commit -m "feat(tcms): archiveCase + automated flag + result comment" -m "Includes the TcmsSeam.archiveCase + CaseResult.comment + QaseMap types (Task 1), landed with their implementation so every commit compiles. Archive mechanism + automation enum confirmed live against SWSAUCE." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `suite-sync.ts` — records-driven orchestrator + CLI (TDD)

**Files:** Create `src/tcms/suite-sync.ts` + `src/tcms/suite-sync.test.ts`; modify `src/tcms/sync.ts` (retire CLI) + `package.json`.

- [ ] **Step 1: Write the failing test.** Create `src/tcms/suite-sync.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { runSuiteSync } from './suite-sync';
import type { TcmsSeam, TcmsCase, CaseResult, SyncMeta, TestRecord, QaseMap } from './types';

class FakeSeam implements TcmsSeam {
  public upserted: { suiteId: number; c: TcmsCase }[] = [];
  public results: CaseResult[] = [];
  public archived: number[] = [];
  private nextId = 100;
  async ensureSuitePath(path: string[]): Promise<number> {
    return path.length; // deterministic, non-zero
  }
  async upsertCase(suiteId: number, c: TcmsCase): Promise<number> {
    this.upserted.push({ suiteId, c });
    return this.nextId++;
  }
  async recordResults(results: CaseResult[], _meta: SyncMeta): Promise<void> {
    this.results = results;
  }
  async archiveCase(id: number): Promise<void> {
    this.archived.push(id);
  }
}

const records: TestRecord[] = [
  {
    title: 'standard_user logs in',
    acText: 'Lands on inventory',
    user: 'standard_user',
    tags: ['@no-auth'],
    bucket: 'Positive',
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
          title: 'standard_user logs in',
          tests: [
            {
              projectName: 'standard',
              results: [{ status: 'passed', steps: [{ title: 'Navigate' }, { title: 'Submit' }] }],
            },
          ],
        },
      ],
    },
  ],
};
const meta: SyncMeta = { jiraKey: 'SW-1', sourceUrl: 'u', runTitle: 'Regression — 2026-05-29' };

test('roots cases under Regression, marks them, records the run, writes the map', async () => {
  const seam = new FakeSeam();
  const out = await runSuiteSync({ records, report, oldMap: {}, meta }, seam);
  expect(seam.upserted).toHaveLength(1);
  expect(seam.upserted[0].c.suitePath).toEqual(['Regression', 'login', 'no auth', 'Positive']);
  expect(seam.upserted[0].c.steps.at(-1)).toEqual({
    action: 'Submit',
    expected: 'Lands on inventory',
  });
  expect(seam.results).toEqual([{ caseId: 100, status: 'passed', comment: undefined }]);
  expect(out.newMap).toEqual({
    'Regression › login › no auth › Positive › standard_user logs in': 100,
  });
  expect(out.archived).toEqual([]);
});

test('archives orphans: an old map entry with no current record', async () => {
  const seam = new FakeSeam();
  const oldMap: QaseMap = {
    'Regression › login › no auth › Positive › standard_user logs in': 100,
    'Regression › login › no auth › Negative › gone test': 200, // no record any more
  };
  const out = await runSuiteSync({ records, report, oldMap, meta }, seam);
  expect(seam.archived).toEqual([200]);
  expect(out.archived).toEqual([200]);
  expect(out.newMap['Regression › login › no auth › Negative › gone test']).toBeUndefined();
});

test('a record with no matching result is reported unlinked, not synced', async () => {
  const seam = new FakeSeam();
  const orphanRecord: TestRecord = { ...records[0], title: 'never ran' };
  const out = await runSuiteSync({ records: [orphanRecord], report, oldMap: {}, meta }, seam);
  expect(seam.upserted).toHaveLength(0);
  expect(out.unlinked).toEqual(['never ran']);
});

test('failed multi-project run carries a comment naming the failing projects', async () => {
  const seam = new FakeSeam();
  const twoProj = {
    suites: [
      {
        title: 's',
        specs: [
          {
            title: 'standard_user logs in',
            tests: [
              {
                projectName: 'standard',
                results: [{ status: 'passed', steps: [{ title: 'Navigate' }] }],
              },
              {
                projectName: 'problem',
                results: [{ status: 'failed', steps: [{ title: 'Navigate' }] }],
              },
            ],
          },
        ],
      },
    ],
  };
  await runSuiteSync({ records, report: twoProj, oldMap: {}, meta }, seam);
  expect(seam.results[0].status).toBe('failed');
  expect(seam.results[0].comment).toContain('problem');
});
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './suite-sync'`.

- [ ] **Step 3: Implement `src/tcms/suite-sync.ts`.**

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TcmsSeam, TestRecord, SyncMeta, CaseResult, QaseMap } from './types';
import { indexResults, normalizeTitle } from './results-reader';
import { mapToCase } from './case-mapper';
import { loadMap, saveMap, logicalKey, orphanedIds, mergeMap } from './map-store';
import { QaseClient } from './qase-client';
import { qaseConfig } from '../utils/qase-env';

const REGRESSION_ROOT = 'Regression';

export interface SuiteSyncInput {
  records: TestRecord[];
  report: unknown; // parsed test-results/results.json
  oldMap: QaseMap;
  meta: SyncMeta;
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
  const results: CaseResult[] = [];

  for (const record of input.records) {
    const hit = index.get(normalizeTitle(record.title));
    if (!hit) {
      outcome.unlinked.push(record.title);
      continue;
    }
    const base = mapToCase(record, hit.steps, hit.status, input.meta);
    const c = { ...base, suitePath: [REGRESSION_ROOT, ...base.suitePath] };
    const key = logicalKey(c.suitePath, c.title);
    const suiteId = await seam.ensureSuitePath(c.suitePath);
    const caseId = await seam.upsertCase(suiteId, c);
    outcome.newMap[key] = caseId;
    outcome.synced.push(key);
    results.push({
      caseId,
      status: hit.status,
      comment: hit.failedProjects.length
        ? `failed on: ${hit.failedProjects.join(', ')}`
        : undefined,
    });
  }

  // Archive orphans: ids in the old map whose key is no longer current.
  for (const id of orphanedIds(input.oldMap, Object.keys(outcome.newMap))) {
    await seam.archiveCase(id);
    outcome.archived.push(id);
  }
  outcome.newMap = mergeMap(input.oldMap, outcome.newMap);

  if (results.length > 0) await seam.recordResults(results, input.meta);
  return outcome;
}

// ---- records loader + CLI (run via tsx): src/tcms/suite-sync.ts ----
interface RecordsFile {
  meta: { jiraKey: string; sourceUrl: string };
  records: TestRecord[];
}

export function loadRecords(dir: string): TestRecord[] {
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return []; // no .tcms/records dir → nothing to sync
  }
  const all: TestRecord[] = [];
  for (const f of files) {
    const parsed = JSON.parse(readFileSync(join(dir, f), 'utf-8')) as RecordsFile;
    all.push(...parsed.records);
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
  const report = JSON.parse(readFileSync('test-results/results.json', 'utf-8'));
  const meta: SyncMeta = {
    jiraKey: 'suite',
    sourceUrl: '',
    runTitle: `Regression — ${new Date().toISOString().slice(0, 10)}`,
  };
  const outcome = await runSuiteSync(
    { records, report, oldMap: loadMap(mapPath), meta },
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
```

- [ ] **Step 4: Run — verify pass.**

Run: `npm run test:unit`
Expected: PASS (all prior + 4 new suite-sync tests).

- [ ] **Step 5: Retire the Phase K per-ticket CLI.** In `src/tcms/sync.ts`, remove the CLI tail (the `main`, `parseArgs`, `takeValue`, and the `process.argv[1]?.endsWith('sync.ts')` block) and the now-unused imports (`readFileSync`, `QaseClient`, `qaseConfig`), keeping only the pure `runSync` + its types (still referenced by `sync.test.ts`). Verify `sync.test.ts` still imports only `runSync` (it does) — if it imports `parseArgs`, delete those `parseArgs` tests too.

> Check: `git grep -n "parseArgs" src/tcms/sync.test.ts`. If present, remove those test blocks (the CLI they tested is gone).

In `package.json` scripts: remove any `sync`-CLI script if one exists, and ADD:

```json
    "tcms:sync": "tsx src/tcms/suite-sync.ts",
```

- [ ] **Step 6: Full gate + commit.**

```bash
npm run test:unit          # all green
npx tsc --noEmit           # exit 0
npx eslint src/tcms
npx prettier --check src/tcms/suite-sync.ts src/tcms/suite-sync.test.ts src/tcms/sync.ts src/tcms/sync.test.ts package.json
git add src/tcms/suite-sync.ts src/tcms/suite-sync.test.ts src/tcms/sync.ts src/tcms/sync.test.ts package.json
git commit -m "feat(tcms): records-driven whole-suite sync (Regression root, archive, map)" -m "Retire Phase K per-ticket CLI; add npm run tcms:sync." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Merge-only CI sync step

**Files:** Modify `.github/workflows/test.yml`. Read it first.

- [ ] **Step 1: Add a gated, fail-safe, merge-only step** after the existing "Run tests" step (and before/independent of the failure-artifact upload). Insert:

```yaml
- name: Sync test cases to Qase (merge only)
  if: ${{ always() && github.event_name == 'push' }}
  env:
    QASE_API_TOKEN: ${{ secrets.QASE_API_TOKEN }}
    QASE_PROJECT_CODE: ${{ secrets.QASE_PROJECT_CODE }}
  run: npm run tcms:sync
```

> `always()` so a test failure still records statuses; `github.event_name == 'push'` so it runs on merge, NOT on PRs (PR-time stays read-only, per the spec). The `tcms:sync` script self-skips when `QASE_*` are unset and never exits non-zero on a sync error, so this step cannot fail the build.

- [ ] **Step 2: Commit the qase-map.json write-back consideration as a doc note (no code).** The CI runner's `qase-map.json` write is ephemeral (not committed back by CI). Add a comment line directly above the step:

```yaml
# Note: qase-map.json updates here are ephemeral on CI. The committed map is
# refreshed when a developer runs `npm run tcms:sync` locally (see docs/tcms.md).
```

- [ ] **Step 3: Validate YAML + commit.**

```bash
npx prettier --check .github/workflows/test.yml || npx prettier --write .github/workflows/test.yml
node -e "require('node:fs').readFileSync('.github/workflows/test.yml','utf-8')" && echo "readable"
git add .github/workflows/test.yml
git commit -m "ci(tcms): merge-only, gated, fail-safe Qase suite sync step" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

> Note for Task 9: the committed `qase-map.json` is authoritative; CI's ephemeral write is acceptable for L1 (archive correctness across runs relies on the locally-committed map being refreshed by a developer run, documented in `docs/tcms.md`). A future enhancement could have CI commit the map back — out of scope here.

---

## Task 7: `/from-issue` Step 11.5 → write a committed records artifact

**Files:** Modify `.claude/skills/from-issue/references/workflow.md` + `.claude/skills/from-issue/references/tcms-sync.md`. Read both first.

- [ ] **Step 1: Rewrite Step 11.5 in `workflow.md`.** FIND the current Step 11.5 block (the `### 11.5. Sync test cases to the TCMS (optional, Qase)` heading and its paragraph) and REPLACE the whole block with:

```markdown
### 11.5. Write the TCMS records artifact (Qase, at-merge model)

**Skip** if `dry-run`. Per [`references/tcms-sync.md`](tcms-sync.md): write the Step 6 semantic model to `.tcms/records/<KEY>.json` (a committed file — one object per generated test: `title`, `acText`, `user`, `tags`, `bucket`, `feature`, `contextLabel`; plus `meta` `jiraKey`/`sourceUrl`), and `git add` it with the rest of the change. This does **NOT** touch Qase. The authoritative Qase create/update/archive runs **at merge** in CI (`npm run tcms:sync`), so a rejected PR never mutates Qase. No `QASE_*` needed at PR time.
```

- [ ] **Step 2: Rewrite `tcms-sync.md`** to describe the at-merge, records-artifact model. Replace its body with:

````markdown
# TCMS records artifact + at-merge Qase sync

The framework mirrors tests into Qase **one-way, at merge** (ADR-0017), behind the
`src/tcms/` seam. `/from-issue` does **not** push to Qase; it writes a committed
**records artifact**, and a merge-time CI step (`npm run tcms:sync`) does the
authoritative create/update/archive. A rejected PR therefore never mutates Qase.

## Step 11.5 — write `.tcms/records/<KEY>.json`

One object per generated test, from the Step 6 model:

```json
{
  "meta": { "jiraKey": "SW-1", "sourceUrl": "https://…/browse/SW-1" },
  "records": [
    {
      "title": "<prose test title, with any embedded @tag tokens stripped>",
      "acText": "<the AC text this test covers — the human-readable expected outcome>",
      "user": "standard_user | … | no-auth",
      "tags": ["@no-auth", "@smoke"],
      "bucket": "Positive | Negative | Edge",
      "feature": "<feature slug, e.g. login>",
      "contextLabel": "<context label, e.g. 'no auth' / 'problem_user'>"
    }
  ]
}
```

Write it with the Write tool and `git add` it alongside the spec. Skip under `dry-run`.

## What the merge-time sync does (`src/tcms/suite-sync.ts`, run by CI)

- Reads **all** `.tcms/records/*.json` + the full `test-results/results.json`.
- One Qase case per logical test under **`Regression › feature › context › bucket`**,
  marked **automated**; steps from `test.step` names; **expected = the record's
  `acText`**; deduped across projects (passed only if every project passed).
- Find-or-create (never references an unknown id), one run per sync, writes
  `qase-map.json` (test → case id), and **archives** cases whose records vanished.

Mapping lives in `src/tcms/case-mapper.ts` + `suite-sync.ts` — do not re-derive.
````

- [ ] **Step 3: Prettier + commit.**

```bash
npx prettier --check .claude/skills/from-issue/references/workflow.md .claude/skills/from-issue/references/tcms-sync.md
git add .claude/skills/from-issue/references/workflow.md .claude/skills/from-issue/references/tcms-sync.md
git commit -m "feat(tcms): /from-issue writes records artifact (no PR-time Qase push)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: ADR-0017 + docs/tcms.md

**Files:** Create `docs/adr/0017-tcms-sync-at-merge.md`; modify `docs/tcms.md`. Read `docs/adr/0016-tcms-mirror.md` + `docs/tcms.md` first.

- [ ] **Step 1: Write `docs/adr/0017-tcms-sync-at-merge.md`** (match the `# NNNN — Title` + `**Date:**`/`**Status:**` house format):

```markdown
# 0017 — TCMS sync at merge, whole-suite, hybrid linkage (scopes ADR-0016)

**Date:** 2026-05-29
**Status:** Accepted. Extends [ADR-0016](0016-tcms-mirror.md): the mirror becomes
whole-suite and authoritative **at merge**, not per-ticket at PR creation.

## Context

ADR-0016 pushed one ticket's tests from `/from-issue` at PR-creation time. That
mutates Qase before review — a **rejected PR leaves Qase drifted** (phantom
creates/updates/deprecations). It also never covered the pre-existing suite,
delete/archive, regression grouping, the automated flag, or multi-project results.

## Decision

- **Mutate at merge.** `/from-issue` writes a committed `.tcms/records/<KEY>.json`
  artifact (no Qase calls). A merge-only, gated, fail-safe CI step runs
  `npm run tcms:sync`, which does the authoritative create/update/archive. A
  rejected/closed-unmerged PR never touches Qase.
- **Whole-suite, records-driven.** One Qase case per logical test under
  `Regression › feature › context › bucket`, marked automated, deduped across
  projects (passed iff every project passed), expected = the record's AC text.
- **Hybrid linkage.** Find-or-create by suite-path + title (no hand-pasted IDs, so a
  dangling-ID blank run cannot happen), with an auto-written `qase-map.json`
  (test → case id) as the lookup/audit/delete index. (Rejected: the official Qase
  reporter — pinned mode recreates manual-ID tedium and doesn't write IDs back;
  auto-create is fragile and lacks the lifecycle features.)
- **Archive, not delete.** Orphaned cases are archived/deprecated (preserves
  history/annotations/run refs), not destroyed. [Archive mechanism: as confirmed
  against the live API in implementation — record the chosen call here.]

## Consequences

- Qase always reflects merged code; PR rejection is a no-op for Qase.
- Rich AC-text expected results survive the at-merge model via the records artifact.
- Needs `QASE_API_TOKEN` + `QASE_PROJECT_CODE` as GitHub Actions secrets (self-skips
  until added). The committed `qase-map.json` is the authoritative link index.
- Out of scope (later phases): PR-time read-only audit + preview + run link (L2);
  Jira comment with PR + run links (L3); optional `qase.id` pinning.
```

> When implementing Task 4, replace the bracketed archive-mechanism note with the actual confirmed call.

- [ ] **Step 2: Update `docs/tcms.md`** — replace the "Turn it on" + "What gets synced" sections to reflect the at-merge model. Read the file, then update the relevant sections to state: (a) sync runs **at merge in CI**, needs `QASE_*` as **GitHub Actions secrets**; (b) `/from-issue` writes `.tcms/records/*.json`; (c) the whole suite is mirrored under `Regression`, deduped, automated, with `qase-map.json` as the link index, archived on removal; (d) to refresh the committed map locally: run the full suite then `npm run tcms:sync`. Keep the existing "Swapping the backend (the seam)" section. Point to [ADR-0017](adr/0017-tcms-sync-at-merge.md).

- [ ] **Step 3: Prettier + commit.**

```bash
npx prettier --check docs/adr/0017-tcms-sync-at-merge.md docs/tcms.md
git add docs/adr/0017-tcms-sync-at-merge.md docs/tcms.md
git commit -m "docs(tcms): ADR-0017 at-merge whole-suite sync; update tcms.md" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Integration A + e2e backfill + live proof (user adds secrets)

**Files:** none new (integration + verification + backfill records on `e2e`).

- [ ] **Step 1: Integration A.** Merge to `main`, then fast-forward local `e2e` to origin (it is 1 commit behind after PR #17) and merge `main` into it.

```bash
git checkout main && git merge --no-ff phase-l1-tcms-sync-engine -m "Merge phase-l1-tcms-sync-engine: whole-suite Qase sync engine + merge CI (Phase L1)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin main
git checkout e2e-jira-from-issues && git pull --ff-only origin e2e-jira-from-issues
git merge main -m "Merge main into e2e-jira-from-issues: Phase L1 TCMS sync engine" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin e2e-jira-from-issues
git branch -d phase-l1-tcms-sync-engine
```

- [ ] **Step 2: Author backfill records on `e2e`.** For each existing spec (`tests/login/login.spec.ts`, `tests/inventory/inventory.spec.ts`, `tests/footer/footer.spec.ts`), read it and write `.tcms/records/<feature>.json` with one record per test (real prose title; `acText` from the test's intent/assertion; `user`/`tags`/`bucket`/`feature`/`contextLabel` from the describe + tags). Commit on `e2e` (or a short-lived branch + PR per the project's branch model). These give the existing suite rich cases on first sync.

> This is content authoring, grounded in the actual specs on `e2e` (which include SW-3 + SW-4 inventory from PR #17). One small file per feature.

- [ ] **Step 3: User adds GitHub Actions secrets.** The user adds `QASE_API_TOKEN` + `QASE_PROJECT_CODE` (`SWSAUCE`) under repo Settings → Secrets and variables → Actions. (Agent cannot do this.) Until then, the CI step self-skips.

- [ ] **Step 4: Live proof.** On `e2e`, locally:

```bash
npx playwright test --reporter=dot   # full suite → test-results/results.json (needs SAUCEDEMO_PASSWORD)
QASE_API_TOKEN=… QASE_PROJECT_CODE=SWSAUCE npm run tcms:sync
```

Verify in Qase: a `Regression` suite with `feature › context › bucket` subtrees; one case per logical test, **marked automated**, steps + AC-text expected; one run with aggregated statuses; `qase-map.json` written locally. Then **delete a test**, re-run the suite + `npm run tcms:sync`, and confirm its case is **archived** (not destroyed) and its map entry removed — no duplicates. Commit the refreshed `qase-map.json`.

- [ ] **Step 5: Confirm the off/branch guarantees.** With `QASE_*` unset, `npm run tcms:sync` prints the skip line and exits 0; `npm test` is unchanged; a PR (not a push) does not run the sync step.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (mutate at merge) → Task 6 (push-only CI) + Task 7 (records, no push). Decision 2 (records artifact) → Task 7 + Task 5 `loadRecords`. Decision 3 (whole-suite, dedup, status, Regression root, expected-from-records, find-or-create, one run) → Task 2 (aggregate) + Task 5 (`runSuiteSync`). Decision 4 (qase-map.json) → Task 3 + Task 5. Decision 5 (archive orphans) → Task 4 (`archiveCase`) + Task 5 (orphan loop). Decision 6 (merge-only gated fail-safe CI) → Task 6. Decision 7 (multi-project reader) → Task 2. Regression suite + automated flag → Task 5 + Task 4. ADR-0017 + docs → Task 8. Backfill + live proof + secrets → Task 9. No gaps.

**Placeholder scan:** No TBD/TODO. The two genuinely API-dependent specifics (the `automation` enum value, the archive call) are resolved by a **live probe in Task 4 Step 1** before coding, with an explicit decision rule + a documented fallback — not a placeholder. Task 8's ADR has one bracketed note that Task 4 fills with the confirmed call. Task 9 Step 2 (backfill) is content authoring against real files, intentionally done at the e2e stage.

**Type consistency:** `TcmsSeam` gains `archiveCase(caseId: number): Promise<void>` (Task 1) implemented in Task 4 and used in Task 5. `CaseResult.comment?` (Task 1) is set in Task 5, forwarded in Task 4. `IndexedResult.failedProjects` (Task 2) is produced in Task 2 and consumed in Task 5. `QaseMap` (Task 1) is used by map-store (Task 3) + suite-sync (Task 5). `runSuiteSync(input: SuiteSyncInput, seam)` and `SuiteSyncOutcome` are consistent between the Task 5 impl and its tests. `mapToCase` is reused unchanged; suite-sync prepends `Regression` to its `suitePath`. `logicalKey`/`orphanedIds`/`mergeMap` signatures match between Task 3 and Task 5. The per-commit-compiles concern (the seam-interface change) is handled by deferring Task 1's commit into Task 4.

```

```
