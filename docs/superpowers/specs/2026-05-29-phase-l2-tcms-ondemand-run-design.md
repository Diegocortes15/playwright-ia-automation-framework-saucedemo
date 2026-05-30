# Phase L2 — Opt-In Qase Runs (`tcms:run`) + Catalog-Only Merge Sync — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-29

## Goal

Make **every Qase test run opt-in and uniform**: no run is created automatically; _you_ decide — for regression, smoke, a folder, a file, anything — by invoking `npm run tcms:run [-- <playwright args>]`, which runs that scope, records **one** Qase run for those results, and **prints the shareable run URL**. The automatic at-merge sync becomes **catalog-only** (cases create/update/archive, no run). Builds on the Phase L1 seam; scopes ADR-0017.

## Context

Phase L1's merge sync did two things: kept the **case catalog** current _and_ created a **regression run** on every merge. The catalog part is the low-noise mirror worth keeping automatic; the run-per-merge is noise. The user wants the run decision to be **uniform and intentional** — decide whether to record a Qase run for _any_ execution (regression, smoke, a subset for a stakeholder), rather than having merges auto-create runs. So: split the two — catalog stays automatic, **runs become a deliberate, scoped command**.

Grounded facts (from L1 code, verified):

- `src/tcms/suite-sync.ts` `runSuiteSync` currently: upserts cases, archives orphans, writes the map, **and** calls `recordResults` (creates a run). L2 **drops the run** from it → catalog-only.
- `src/tcms/qase-client.ts` `recordResults(results, meta)` creates a run + posts results; returns `void` today.
- `src/tcms/results-reader.ts` → `indexResults` (`{steps, status, failedProjects}`) + `normalizeTitle`. `map-store.ts` → `loadMap`, `logicalKey`. `case-mapper.ts` → `mapToCase` (`suitePath = [feature, context, bucket]`).
- `qase-map.json` (committed) maps `feature › context › bucket › title` → case id. It is the link index `tcms:run` reads to attach results to existing cases.
- Qase run-create returns a run id; the shareable URL is built from project code + run id (**exact format confirmed live at build**).
- `package.json` has redundant per-project scripts (`test:no-auth`, `test:problem`, `test:firefox`, `test:webkit`) = trivially `npx playwright test --project=X`.

## Decisions

1. **`tcms:sync` becomes catalog-only (scopes ADR-0017).** Remove the run/results creation from `runSuiteSync`: it keeps upserting cases (steps still sourced from `results.json`), marking them automated, archiving orphans, and writing `qase-map.json` — but it **no longer creates a Qase run**. The merge CI step is unchanged (`npm run tcms:sync`); only its behavior narrows. Result: merges keep Qase's catalog accurate with **zero run noise**.

2. **New `tcms:run` is the ONLY creator of Qase runs.** `npm run tcms:run [-- <playwright args>]`:
   - **With args** (`-- tests/inventory`, `-- --grep @smoke`, `-- --project=problem`, …): spawn `npx playwright test <args>` (stdio inherited), wait, then record. Records even if some tests failed (sharing a failing result is valid).
   - **Without args**: skip running; record whatever `test-results/results.json` already holds (your last run — e.g. after a full `npm test` regression).
   - Matches each test that ran to an **existing** case via `qase-map.json` (`normalizeTitle`), records **one** run titled `On-demand: <scope> — <date>`, and **prints the run URL**.
   - **Results-only:** never creates/updates/**archives** cases. A test that ran but isn't in `qase-map.json` is reported `not in Qase yet — run \`npm run tcms:sync\` to refresh the map`and skipped. (Create/update/archive authority stays exclusively in`tcms:sync`/at-merge — L1's invariant.)
   - Gated (`qaseConfig()` null → "TCMS off", exit 0) and fail-safe (Qase error logged, exit 0 — never blocks the dev).

3. **`recordResults` returns the run id.** Additive change to `TcmsSeam.recordResults`: `Promise<void>` → `Promise<number>`. `qase-client` returns `run.result.id`; `tcms:run` uses it to print the URL. (`suite-sync` no longer calls it, per Decision 1; any remaining caller/fakes return a number.)

4. **Pure core for `tcms:run`.** A pure `selectResults(report, map)` → `{ results: CaseResult[]; skipped: string[] }` (matched tests → results with failing-project comment; unmapped → skipped). Unit-tested with no I/O. The CLI shell does spawn + read + record + print.

5. **Trim `package.json`.** Remove `test:no-auth`, `test:problem`, `test:firefox`, `test:webkit`. Keep `test`, `test:standard`, `test:smoke`, `test:ui`, `test:debug`, `test:headed`, `test:unit`, `report`, `codegen`, `typecheck`, `lint(:fix)`, `format(:check)`, `tcms:sync`. Add `tcms:run`. (CLAUDE.md "Quick run" lists only kept scripts — verify, no change expected.)

6. **ADR-0018 + docs.** New ADR-0018 records "Qase runs are opt-in via `tcms:run`; the merge sync is catalog-only" (scopes ADR-0017). Update `docs/tcms.md`: catalog auto at merge (no run); runs via `tcms:run` for any scope; examples (regression/smoke/folder/file); the refresh-the-map note for brand-new tests.

## Affected files

- `src/tcms/suite-sync.ts` (+ test) — drop run/results creation → catalog-only; tests lose the run assertions, keep upsert/archive/map.
- `src/tcms/run-report.ts` (+ test) — **new.** Pure `selectResults` + the `tcms:run` CLI (spawn/read/record/print URL).
- `src/tcms/qase-client.ts` (+ test) — `recordResults` returns the run id.
- `src/tcms/types.ts` — `TcmsSeam.recordResults` → `Promise<number>`.
- `package.json` — add `tcms:run`; remove the 4 redundant scripts.
- `docs/adr/0018-qase-runs-opt-in.md` — **new.** Decision record (scopes ADR-0017).
- `docs/tcms.md` — catalog-only merge + opt-in runs usage.
- `CLAUDE.md` — only if a removed script is referenced (verify).

## Branch model / sequencing

- All work on `phase-l2-tcms-ondemand-run` off `main` → merge `main` (`--no-ff`) → fast-forward `e2e` to origin → merge `main` into `e2e`.
- Live proof on `e2e` against `SWSAUCE` (the L1 backfill means the 20 cases + committed `qase-map.json` already exist, so matches resolve).

## Alternatives considered

- **Keep the auto regression run at merge (L1 as-is) + add opt-in runs.** Rejected by the user: runs should be uniformly intentional (no auto run noise).
- **A `--qase` flag on Playwright's CLI.** Rejected: not cleanly extensible; a wrapper command is idiomatic.
- **Overload `tcms:sync` with a no-archive scope mode.** Rejected: conflating the authoritative catalog sync with ad-hoc runs invites the archive footgun; separate commands keep `tcms:sync`'s invariant clean.
- **Create cases for unmapped tests during `tcms:run`.** Rejected: would let a local run pre-create cases for unmerged tests; skip + report (refresh via `tcms:sync`) instead.

## Scope / non-goals (YAGNI)

- `tcms:run` is **results-only** — no catalog create/update/archive.
- No change to the `/from-issue` records flow or the catalog's at-merge automation (only the run-creation moves out of it).
- No Jira comment / PR linkage (still deferred — was "L3").
- Not a general test-runner replacement — Qase-free local runs stay `npx playwright test …` (or the kept npm scripts).

## Verification approach

1. **Unit (pure):** `selectResults(report, map)` — matched → `CaseResult[]` (failing-project comment); unmapped → `skipped[]`; nothing archived. `suite-sync` catalog-only: upserts + archives + map, **records no run**. Via `npm run test:unit`.
2. **Seam:** `recordResults` returns the run id (stubbed `fetch`).
3. **Live proof (on `e2e`, real `SWSAUCE`):**
   - `npm run tcms:sync` (or a merge) → catalog synced, **no new run** appears.
   - `npm run tcms:run -- tests/footer` → runs footer, creates **one** `On-demand: …` run, prints a working URL, and the **case count is unchanged** (no create/archive).
   - `npm run tcms:run -- --grep @smoke` → a run for smoke only. Confirms uniform scoping.
4. **Gating/fail-safe:** `QASE_*` unset → "TCMS off", exit 0; an unmapped test → reported skipped, not created.
5. **Gates:** `tsc --noEmit`, `eslint src/tcms`, `prettier --check`.
