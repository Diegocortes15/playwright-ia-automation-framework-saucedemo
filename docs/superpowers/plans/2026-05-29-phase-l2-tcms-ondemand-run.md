# Phase L2 — Opt-In Qase Runs (`tcms:run`) + Catalog-Only Merge Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Qase runs opt-in: the at-merge sync becomes catalog-only (no run), and a new record-only `npm run tcms:run` records a Qase run for whatever you last ran (+ prints the link).

**Architecture:** Remove run-recording from `suite-sync.ts` (catalog-only). Add `src/tcms/run-report.ts` — a pure `selectResults`/`runTitle` core (matches the last `results.json` to existing cases via `qase-map.json`) + a record-only CLI that calls `recordResults` (now returns the run id) and prints the run URL. Trim redundant `package.json` scripts.

**Tech Stack:** TypeScript (ESM), Node 22 + `tsx`, Playwright Test (unit runner via `playwright.unit.config.ts`), Node global `fetch`, Prettier/ESLint/tsc gates.

**Spec:** [`docs/superpowers/specs/2026-05-29-phase-l2-tcms-ondemand-run-design.md`](../specs/2026-05-29-phase-l2-tcms-ondemand-run-design.md)

**Branch:** `phase-l2-tcms-ondemand-run` (off `main`; spec already committed).

**Grounded facts (verified against current code):**

- `src/tcms/suite-sync.ts` `runSuiteSync`: builds a `results: CaseResult[]`, pushes `{caseId, status, comment}` per synced case, and ends with `if (results.length > 0) await seam.recordResults(results, input.meta);`. `SuiteSyncInput` has a `meta: SyncMeta`; the CLI `main()` builds it. Imports `{ TcmsSeam, TestRecord, SyncMeta, CaseResult, QaseMap }`.
- `src/tcms/qase-client.ts` `recordResults(results, meta): Promise<void>` creates a run (`POST /run/{code}`) then posts each result; ends after the for-loop (returns nothing). `run.result.id` is the run id.
- `src/tcms/results-reader.ts` → `indexResults(report): Map<normTitle, {steps, status, failedProjects}>` + `normalizeTitle`. `map-store.ts` → `loadMap`, `logicalKey` (joins with `' › '`). `qaseConfig()` in `src/utils/qase-env.ts`. `QaseMap = Record<string, number>` keyed `feature › context › bucket › title`.
- Unit tests: `npm run test:unit` (currently 22 pass). Tests import from `@playwright/test`.
- `package.json` scripts include `test:no-auth`, `test:problem`, `test:firefox`, `test:webkit` (pure `--project=X`).
- Qase web run URL base = `https://app.qase.io` (run link format **confirmed live in Task 4**).

---

## Execution & sequencing

1. **Task 1** — `recordResults` returns the run id + `suite-sync` becomes catalog-only (coupled; every commit compiles).
2. **Task 2** — `run-report.ts` (pure core + record-only CLI, TDD) + `package.json` (add `tcms:run`, remove 4 redundant scripts).
3. **Task 3** — ADR-0018 + docs.
4. **Task 4** — Integration A (merge `main` → `e2e`) + live proof on `e2e` (confirm the run URL; catalog unchanged; merge makes no run).

---

## File Structure

| File                                | Change                                                                | Task |
| ----------------------------------- | --------------------------------------------------------------------- | ---- |
| `src/tcms/types.ts`                 | `TcmsSeam.recordResults` → `Promise<number>`                          | 1    |
| `src/tcms/qase-client.ts` (+test)   | `recordResults` returns `run.result.id`                               | 1    |
| `src/tcms/suite-sync.ts` (+test)    | Drop run-recording → catalog-only (remove results + meta)             | 1    |
| `src/tcms/run-report.ts` (+test)    | **New.** Pure `selectResults`/`runTitle` + record-only `tcms:run` CLI | 2    |
| `package.json`                      | Add `tcms:run`; remove 4 redundant scripts                            | 2    |
| `docs/adr/0018-qase-runs-opt-in.md` | **New.** Decision record (scopes ADR-0017)                            | 3    |
| `docs/tcms.md`                      | Catalog-only merge + opt-in runs usage                                | 3    |

---

## Task 1: `recordResults` returns the run id + `suite-sync` catalog-only

**Files:** Modify `src/tcms/types.ts`, `src/tcms/qase-client.ts` (+ test), `src/tcms/suite-sync.ts` (+ test).

- [ ] **Step 1: Interface + impl — `recordResults` returns the run id.**

In `src/tcms/types.ts`, change the seam method:

```ts
  recordResults(results: CaseResult[], meta: SyncMeta): Promise<void>; // create run + results
```

to:

```ts
  recordResults(results: CaseResult[], meta: SyncMeta): Promise<number>; // create run + results → run id
```

In `src/tcms/qase-client.ts`, change the `recordResults` signature `Promise<void>` → `Promise<number>`, and add a return after the for-loop. The method currently ends:

```ts
    for (const r of results) {
      await this.rpc('POST', `/result/${code}/${run.result.id}`, {
        case_id: r.caseId,
        status: r.status,
        ...(r.comment === undefined ? {} : { comment: r.comment }),
      });
    }
  }
```

Make it:

```ts
  async recordResults(results: CaseResult[], meta: SyncMeta): Promise<number> {
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
        ...(r.comment === undefined ? {} : { comment: r.comment }),
      });
    }
    return run.result.id;
  }
```

- [ ] **Step 2: Assert the returned id in the qase-client test.** In `src/tcms/qase-client.test.ts`, the existing test `'recordResults forwards a per-result comment when present'` calls `recordResults` and stubs the run id as `9`. Add a return assertion: change `await new QaseClient(cfg).recordResults(...)` to capture + assert:

```ts
const runId = await new QaseClient(cfg).recordResults(
  [{ caseId: 7, status: 'failed', comment: 'failed on: problem' }],
  {
    jiraKey: 'SW-1',
    sourceUrl: 'u',
    runTitle: 'r',
  },
);
expect(runId).toBe(9);
```

(Keep the existing body assertions in that test.)

- [ ] **Step 3: `suite-sync.ts` → catalog-only.** Make these edits to `src/tcms/runSuiteSync` and its CLI:

(a) Remove `const results: CaseResult[] = [];` (the line after `const outcome ...`).

(b) Remove the `results.push({...})` block inside the loop:

```ts
results.push({
  caseId,
  status: hit.status,
  comment: hit.failedProjects.length ? `failed on: ${hit.failedProjects.join(', ')}` : undefined,
});
```

(c) Remove the run-recording line near the end:

```ts
if (results.length > 0) await seam.recordResults(results, input.meta);
```

(d) Remove `meta` from `SuiteSyncInput` — change:

```ts
export interface SuiteSyncInput {
  records: EnrichedRecord[];
  report: unknown;
  oldMap: QaseMap;
  meta: SyncMeta;
}
```

to (drop the `meta` line):

```ts
export interface SuiteSyncInput {
  records: EnrichedRecord[];
  report: unknown;
  oldMap: QaseMap;
}
```

(e) In the CLI `main()`, remove the `const meta: SyncMeta = { ... runTitle ... };` declaration and drop `meta` from the `runSuiteSync({ records, report, oldMap: loadMap(mapPath), meta }, ...)` call (→ `{ records, report, oldMap: loadMap(mapPath) }`).

(f) Update the import to drop the now-unused `SyncMeta` and `CaseResult`:

```ts
import type { TcmsSeam, TestRecord, QaseMap } from './types';
```

(`mapToCase` still uses `hit.status` — leave that call unchanged.)

- [ ] **Step 4: Update `suite-sync.test.ts`.**

(a) `FakeSeam.recordResults` must still exist (interface) but is never called now. Replace its body + the `results` field. Change:

```ts
  public results: CaseResult[] = [];
  ...
  async recordResults(results: CaseResult[], _meta: SyncMeta): Promise<void> {
    this.results = results;
  }
```

to:

```ts
  async recordResults(_results: CaseResult[], _meta: SyncMeta): Promise<number> {
    return 0; // not exercised — suite-sync is catalog-only
  }
```

(remove the `public results` field declaration).

(b) Remove `meta` from the test inputs. Delete the `const meta: SyncMeta = { ... };` declaration, and in each `runSuiteSync({ records, report, oldMap, meta }, seam)` call drop `meta` → `{ records, report, oldMap }`.

(c) In the test `'roots cases at feature › context › bucket, records the run, writes the map'`: rename it to `'roots cases at feature › context › bucket and writes the map'`, and **remove** the line `expect(seam.results).toEqual([...]);`. Keep the suitePath/steps/newMap/archived assertions.

(d) **Delete** the test `'failed multi-project run carries a comment naming the failing projects'` entirely (it asserted `seam.results`, which no longer exists — the comment logic moves to `run-report` in Task 2).

(e) Fix imports: if `SyncMeta`/`CaseResult` are now unused in the test, drop them from the `import type { … } from './types';` line. (Keep `TcmsSeam, TcmsCase, QaseMap, EnrichedRecord` as used.)

- [ ] **Step 5: Gate + commit.**

```bash
npm run test:unit        # expect 21 (22 prior − 1 deleted multi-project-comment test)
npx tsc --noEmit         # exit 0
npx eslint src/tcms
npx prettier --check src/tcms/types.ts src/tcms/qase-client.ts src/tcms/qase-client.test.ts src/tcms/suite-sync.ts src/tcms/suite-sync.test.ts
git add src/tcms/types.ts src/tcms/qase-client.ts src/tcms/qase-client.test.ts src/tcms/suite-sync.ts src/tcms/suite-sync.test.ts
git commit -m "refactor(tcms): catalog-only suite-sync; recordResults returns run id" -m "Merge sync no longer creates a Qase run (catalog only). recordResults returns the new run id for the upcoming tcms:run. Per ADR-0018 (Phase L2)." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

> If `tsc`/`eslint` flags an unused import or var (e.g. `SyncMeta`, `CaseResult`, `meta`), remove it — Step 3(f)/4(e) anticipate this; clean up any straggler the same way.

---

## Task 2: `run-report.ts` (record-only `tcms:run`) + package.json

**Files:** Create `src/tcms/run-report.ts` + `src/tcms/run-report.test.ts`; modify `package.json`.

- [ ] **Step 1: Write the failing tests.** Create `src/tcms/run-report.test.ts`:

```ts
import { test, expect } from '@playwright/test';
import { selectResults, runTitle } from './run-report';
import type { QaseMap } from './types';

const map: QaseMap = {
  'footer › standard_user › Positive › footer shows the copyright': 9,
  'login › no auth › Positive › standard_user logs in': 17,
};

const report = {
  suites: [
    {
      title: 's',
      specs: [
        {
          title: 'standard_user logs in',
          tests: [
            {
              projectName: 'no-auth',
              results: [{ status: 'passed', steps: [{ title: 'Submit' }] }],
            },
          ],
        },
        {
          title: 'footer shows the copyright',
          tests: [
            {
              projectName: 'standard',
              results: [{ status: 'failed', steps: [{ title: 'Read' }] }],
            },
          ],
        },
        {
          title: 'a brand-new test not in the map',
          tests: [{ projectName: 'standard', results: [{ status: 'passed', steps: [] }] }],
        },
      ],
    },
  ],
};

test('selectResults matches ran tests to existing case ids; unmapped go to skipped', () => {
  const { results, skipped } = selectResults(report, map);
  // matched: login (17, passed) + footer (9, failed with comment)
  expect(results).toContainEqual({ caseId: 17, status: 'passed', comment: undefined });
  expect(results).toContainEqual({ caseId: 9, status: 'failed', comment: 'failed on: standard' });
  expect(results).toHaveLength(2);
  expect(skipped).toEqual(['a brand-new test not in the map']);
});

test('runTitle names the run by the features present (sorted, deduped)', () => {
  const results = selectResults(report, map).results;
  expect(runTitle(map, results, '2026-05-29')).toBe('On-demand: footer, login — 2026-05-29');
});

test('runTitle falls back to a generic scope when no features resolve', () => {
  expect(runTitle(map, [], '2026-05-29')).toBe('On-demand: tests — 2026-05-29');
});
```

- [ ] **Step 2: Run — verify it fails.**

Run: `npm run test:unit`
Expected: FAIL — `Cannot find module './run-report'`.

- [ ] **Step 3: Implement `src/tcms/run-report.ts`.**

```ts
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
```

- [ ] **Step 4: Run — verify pass.**

Run: `npm run test:unit`
Expected: PASS (Task 1's 21 + 3 new run-report = 24).

- [ ] **Step 5: `package.json` — add `tcms:run`, remove redundant scripts.**

Add to `scripts` (near `tcms:sync`):

```json
    "tcms:run": "tsx src/tcms/run-report.ts",
```

Remove these four lines entirely:

```json
    "test:no-auth": "playwright test --project=no-auth",
    "test:problem": "playwright test --project=problem",
    "test:firefox": "playwright test --project=firefox-standard",
    "test:webkit": "playwright test --project=webkit-standard",
```

Keep all other scripts. Ensure the JSON stays valid (commas correct).

- [ ] **Step 6: Off-path smoke + gate + commit.**

```bash
npm run test:unit          # 24 pass
npx tsc --noEmit           # exit 0
npx eslint src/tcms
npx prettier --check src/tcms/run-report.ts src/tcms/run-report.test.ts package.json
```

Off-path smoke (no QASE env, no results file dependency hit because the off-check returns first):

```bash
env -u QASE_API_TOKEN -u QASE_PROJECT_CODE npx tsx src/tcms/run-report.ts
```

Expected: prints `TCMS off (...) — skipping Qase run.` and exits 0. (On PowerShell instead: `$env:QASE_API_TOKEN=''; $env:QASE_PROJECT_CODE=''; npx tsx src/tcms/run-report.ts` — report the exact output.)

```bash
git add src/tcms/run-report.ts src/tcms/run-report.test.ts package.json
git commit -m "feat(tcms): record-only tcms:run (opt-in Qase run) + trim scripts" -m "tcms:run records a Qase run for the last results.json against existing cases, prints the run URL. Removes 4 redundant per-project scripts. Per ADR-0018." -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: ADR-0018 + docs

**Files:** Create `docs/adr/0018-qase-runs-opt-in.md`; modify `docs/tcms.md`. Read `docs/adr/0017-tcms-sync-at-merge.md` + `docs/tcms.md` first.

- [ ] **Step 1: Write `docs/adr/0018-qase-runs-opt-in.md`** (match the `# NNNN — Title` + `**Date:**`/`**Status:**` house format):

```markdown
# 0018 — Qase runs are opt-in (tcms:run); the merge sync is catalog-only (scopes ADR-0017)

**Date:** 2026-05-29
**Status:** Accepted. Scopes [ADR-0017](0017-tcms-sync-at-merge.md): the at-merge sync no longer creates a Qase **run** — it keeps the **catalog** current only. Runs become opt-in.

## Context

ADR-0017's merge sync created a whole-suite Qase **run** on every merge. That is run-history noise: a run per merge, even when nothing meaningful was validated. The case **catalog** staying current at merge is valuable and quiet; the per-merge **run** is not. The team wants runs to be intentional — recorded when a human decides (a regression pass, a smoke check, a subset to share with a stakeholder).

## Decision

- **Merge sync = catalog-only.** `tcms:sync` keeps creating/updating/archiving cases and writing `qase-map.json`, but **no longer creates a run**. Merges keep Qase accurate with zero run noise.
- **Runs are opt-in via `npm run tcms:run`.** It is **record-only**: it reads the last `test-results/results.json`, matches the tests that ran to existing cases via `qase-map.json`, records **one** Qase run (titled `On-demand: <features> — <date>`), and prints the run URL. It never creates/updates/archives cases (unmapped tests are skipped with a "refresh the map" note). Scope is whatever the developer ran — e.g. `npx playwright test tests/footer ; npm run tcms:run`.
- The PR's own CI (the Playwright matrix) already shows per-PR pass/fail; a per-merge Qase run would duplicate it.

## Consequences

- Qase's catalog tracks merged code automatically; runs appear only when recorded on purpose.
- Stakeholder visibility on demand: run a subset, `tcms:run`, share the link.
- A delta-run-at-merge was considered and rejected (fragile git-diff detection; runs are about results not catalog deltas; duplicates the PR CI; reintroduces per-merge noise).
```

- [ ] **Step 2: Update `docs/tcms.md`.** Read it; then update the run-related wording so it states: (a) the **catalog** syncs automatically at merge (`tcms:sync`, no run); (b) **runs are opt-in** via `npm run tcms:run` (record-only — run the tests, then `tcms:run`; or chain `npx playwright test <scope> ; npm run tcms:run`), with examples (regression/smoke/folder/file); (c) `tcms:run` records against existing cases and skips brand-new ones with a "run `npm run tcms:sync`" note; (d) point to [ADR-0018](adr/0018-qase-runs-opt-in.md). Keep the "Swapping the backend (the seam)" section. Concise; don't bloat.

- [ ] **Step 3: Verify CLAUDE.md.** Run `grep -nE "test:no-auth|test:problem|test:firefox|test:webkit" CLAUDE.md`. If any match, update those references (they are removed scripts); if none (expected), no change.

- [ ] **Step 4: Prettier + commit.**

```bash
npx prettier --check docs/adr/0018-qase-runs-opt-in.md docs/tcms.md
git add docs/adr/0018-qase-runs-opt-in.md docs/tcms.md
git commit -m "docs(tcms): ADR-0018 opt-in runs; update tcms.md" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Integration A + live proof

**Files:** none (integration + verification).

- [ ] **Step 1: Integration A.**

```bash
git checkout main && git merge --no-ff phase-l2-tcms-ondemand-run -m "Merge phase-l2-tcms-ondemand-run: opt-in Qase runs + catalog-only merge (Phase L2)" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin main
git checkout e2e-jira-from-issues && git pull --ff-only origin e2e-jira-from-issues && git merge main -m "Merge main into e2e-jira-from-issues: Phase L2 opt-in Qase runs" -m "Co-Authored-By: Claude <noreply@anthropic.com>" && git push origin e2e-jira-from-issues
git branch -d phase-l2-tcms-ondemand-run
```

- [ ] **Step 2: Live proof on `e2e` (the L1 backfill means the 20 cases + `qase-map.json` already exist).** Capture the SWSAUCE run count before, then:

```bash
npx playwright test tests/footer --project=standard
npm run tcms:run
```

Expected: prints `Qase run created — 4 result(s) recorded.` + a URL line `https://app.qase.io/run/SWSAUCE/dashboard/<id>`. **Open the URL** — confirm it loads the run with the 4 footer results. If the path is wrong (e.g. Qase uses a different run-URL shape), fix the one `QASE_WEB_BASE`/path line in `run-report.ts`, re-run, and commit the fix (`fix(tcms): correct Qase run URL format`), then re-push `e2e` (and cherry-pick/merge to `main`).

- [ ] **Step 3: Confirm catalog is untouched.** Verify in Qase that the **case count is unchanged** (still 20) and **no case was archived** by the `tcms:run` (it is results-only). The only new object is the one On-demand run.

- [ ] **Step 4: Confirm merge made no run.** The Integration A push to `e2e` triggered CI, which runs `npm run tcms:sync` (now catalog-only). Check the run list in Qase: **no new run** from that merge (only your manual `tcms:run` one). Optionally confirm via the CI log that the "Sync test cases to Qase" step reported a catalog sync with no run.

- [ ] **Step 5: Off/gating guarantee.** With `QASE_*` unset, `npm run tcms:run` prints "TCMS off" + exit 0; `npm test` unchanged.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (catalog-only merge) → Task 1 Step 3. Decision 2 (record-only `tcms:run`, examples, skipped/refresh, no-results, gated/fail-safe) → Task 2 (`run-report.ts` + tests). Decision 3 (recordResults returns id) → Task 1 Steps 1–2. Decision 4 (pure `selectResults`/`runTitle`) → Task 2 Steps 1–3. Decision 5 (package.json trim) → Task 2 Step 5. Decision 6 (ADR-0018 + docs) → Task 3. Live proof + the URL confirm → Task 4. No gaps.

**Placeholder scan:** No TBD/TODO. Every code step shows complete code. The one runtime unknown (the Qase web run-URL path) is constructed concretely (`/run/<code>/dashboard/<id>`) and explicitly confirmed-and-fixable in Task 4 Step 2 — not a placeholder.

**Type consistency:** `recordResults` returns `Promise<number>` in `types.ts` (Task 1 S1), `qase-client` (S1), and the FakeSeam (S4) — all agree; `run-report` consumes the returned id. `selectResults(report, map): { results: CaseResult[]; skipped: string[] }` and `runTitle(map, results, date): string` match between the Task 2 tests and impl. `CaseResult`/`QaseMap` reused unchanged. `SuiteSyncInput` loses `meta` consistently across `suite-sync.ts` + its test + the CLI. The map-key separator `' › '` matches `map-store`'s `logicalKey`. Test count tracked: 22 − 1 (deleted) + 3 (new) = 24.

```

```
