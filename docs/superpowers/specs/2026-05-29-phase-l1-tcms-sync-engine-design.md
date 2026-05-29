# Phase L1 — Whole-Suite Qase Sync Engine + Merge-Time CI — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-29

## Goal

Mirror the **entire** automated suite into Qase (not just one ticket's tests), keeping Qase a faithful projection of **merged** code. The authoritative create/update/archive happens **at merge** (CI), so a rejected/closed PR never mutates Qase. Cases are grouped under a **Regression** suite, marked **automated**, deduped to one case per logical test across projects, and linked via an **auto-written `qase-map.json`** (no hand-pasted IDs). Builds on the Phase K seam (`src/tcms/`, ADR-0016).

## Context

Phase K shipped an opt-in one-way mirror that pushed **one ticket's** tests from `/from-issue` **Step 11.5 at PR-creation time**. Two limits surfaced when the user asked to "sync all the test cases from now on":

1. **Timing flaw:** mutating Qase before merge means a **rejected PR leaves Qase drifted** — phantom creates, phantom updates, and wrongly-deprecated cases that never landed. Locked decision: **mutate at merge.**
2. **Scope:** the per-ticket push never reflected the pre-existing suite, and didn't handle delete/archive, regression grouping, the automated flag, or multi-project results.

Research into Qase's official Playwright reporter (auto-create vs. pinned `qase.id`) found it would either recreate the user's TestRail "paste IDs by hand" tedium (it does **not** write IDs back to code) or be fragile (a single un-ID'd test can blank a run — qase-tms/qase-python#217), and it doesn't provide the lifecycle features (archive, audit, run-link, Jira comment) anyway. So we **extend our own seam** (the "hybrid" model) rather than adopt the reporter.

Grounded facts (verified live in Phase K + here):

- Qase REST, `Token:` header, project `SWSAUCE`. `POST/GET/PATCH /case`, `GET/POST /suite`, `POST /run`, `POST /result`. Case `automation` field to be confirmed at build (set "automated"; via create-case body or a follow-up update).
- CI workflow `.github/workflows/test.yml` ("Playwright Tests") already runs `npm test` (full matrix) on **push to `main`/`e2e-jira-from-issues`** with `secrets.SAUCEDEMO_PASSWORD`, producing `test-results/results.json`.
- Playwright JSON: a spec that runs on N projects yields N `spec.tests[]` entries (one per project), each with its own `results`. Phase K's `results-reader` reads only `tests[0]` — **L1 must aggregate across all `tests[]`** for multi-project status.

## Decisions

1. **Mutate Qase only at merge.** A merge-triggered CI step runs the whole-suite sync after the matrix. PR-creation does **no** Qase writes in L1 (the read-only PR audit/preview is L2). A rejected/closed-unmerged PR therefore touches Qase **not at all**.

2. **`/from-issue` Step 11.5 changes from "push to Qase" to "write a committed records artifact."** Per generated ticket, write `.tcms/records/<KEY>.json` — the semantic model the skill already holds (per test: `title`, `acText`, `user`, `tags`, `bucket`, `feature`, `contextLabel`; plus `meta` `jiraKey`/`sourceUrl`). This is a plain committed file, **no Qase mutation**. It preserves the **rich AC-text expected results** for the merge-time sync (which otherwise only has `results.json`). This replaces the Phase K live push.

3. **Whole-suite sync engine (`npm run tcms:sync`).** Reads **all** `.tcms/records/*.json` + the full `test-results/results.json`, and for each **logical test**:
   - **Dedup across projects:** one Qase case per logical test (keyed suite-path + title); a test that ran on 5 projects = 1 case.
   - **Status aggregation:** the run result is **`passed` only if it passed on every project** it ran on; otherwise `failed` (the failing project(s) named in the result comment). `skipped` only if skipped everywhere.
   - **Suite path:** `Regression › <feature> › <contextLabel> › <bucket>` (nested suites, created on demand) — satisfies "all automated cases live in the Regression suite."
   - **Case content:** title = prose test title; steps = `test.step` names; **expected = the record's `acText`** when a matching `.tcms/records` entry exists, else a thinner fallback (last-step proxy / blank); **mark the case automated**; description = provenance.
   - **Find-or-create**, then **update in place** (upsert) — never reference an unknown id, so the #217 blank-run failure mode cannot occur.
   - **One Qase run** per sync with the aggregated per-case results.

4. **`qase-map.json` (committed, auto-written).** Maps `suitePath › title` → Qase `caseId`. The sync writes/updates it each run. Humans read it as a test↔case lookup index (and git history shows link/rename/remove over time); **nobody hand-edits it** (the sync owns it). It makes **archive** and the future audit (L2) exact.

5. **Archive (not delete) orphans.** Any entry in `qase-map.json` whose logical test is no longer present in the current suite → **archive/deprecate** the Qase case (best-practice over hard delete: preserves history + manual annotations + run references) and drop it from the map. Confirm the exact Qase "deprecate/archive" mechanism at build (status field vs. delete endpoint); default to the least-destructive option.

6. **Merge-only, gated, fail-safe CI.** Add a step/job to `.github/workflows/test.yml` that runs **only on `push`** (merge), after the matrix, `if: always()` (so failures still record their status). It runs `npm run tcms:sync` only when `QASE_*` secrets are present; any sync failure is logged but **never fails the build** (Qase is a downstream mirror). Requires adding `QASE_API_TOKEN` + `QASE_PROJECT_CODE` to GitHub Actions secrets.

7. **`results-reader` extended for multi-project.** Aggregate all `spec.tests[]` (every project) per logical test instead of `tests[0]`: collect the union of `test.step` names (identical across projects) and aggregate status per Decision 3. Keep it pure + unit-tested.

## Affected files

- `src/tcms/results-reader.ts` (+ test) — multi-project aggregation (Decision 7).
- `src/tcms/qase-client.ts` (+ test) — add `archiveCase()` + the case `automation` flag on create/update (Decisions 4–5); confirm archive mechanism.
- `src/tcms/suite-sync.ts` (+ test) — **new.** Whole-suite orchestrator: glob records, read results, dedup/aggregate, find-or-create under `Regression`, write `qase-map.json`, archive orphans, record one run. (Distinct from Phase K's per-run `sync.ts`.)
- `src/tcms/sync.ts` — Phase K's per-ticket push CLI is **retired** (Step 11.5 no longer pushes; Decision 2). Its pure `runSync` mapping logic is reused/absorbed by `suite-sync.ts` where useful; the `tsx` CLI `main()` and its `package.json` script are removed. (`case-mapper.ts` stays — still the case-shape mapper.)
- `src/tcms/map-store.ts` (+ test) — **new.** Pure read/write of `qase-map.json` (load, lookup, upsert entry, list-orphans).
- `src/tcms/types.ts` — add `SuiteSyncInput`/map types as needed.
- `package.json` — `"tcms:sync": "tsx src/tcms/suite-sync.ts"`.
- `.github/workflows/test.yml` — merge-only, gated, fail-safe sync step (Decision 6).
- `.claude/skills/from-issue/references/workflow.md` + `tcms-sync.md` — Step 11.5 becomes "write `.tcms/records/<KEY>.json`," no Qase push (Decision 2).
- `qase-map.json` — committed, auto-written (Decision 4).
- `docs/adr/0017-tcms-sync-at-merge.md` — **new.** Records the at-merge timing + hybrid-over-reporter + archive-not-delete decisions (scopes ADR-0016).
- `docs/tcms.md` — update for the merge-time model + the map + CI secrets.

## Branch model / sequencing

- All work on `phase-l1-tcms-sync-engine` off `main` → merge `main` (`--no-ff`) → merge into `e2e-jira-from-issues` (Phase F–K pattern).
- The merge-time CI sync only does real work once `QASE_*` secrets are added to the GitHub repo (until then it self-skips — safe to merge first).

## Alternatives considered

- **Official Qase Playwright reporter (auto-create or pinned).** Rejected: pinned = manual ID paste (no writeback) = the TestRail tedium being escaped; auto-create = a less-controllable title match with a fragile blank-run failure mode (#217) and no archive/audit/run-link/Jira features. The hybrid gives all 9 requirements with control.
- **Keep mutating at PR-creation + reconcile on reject.** Rejected: reverting an _update_ needs pre-PR state snapshots — fragile machinery for a worse invariant. At-merge is simpler and correct.
- **Merge sync from `results.json` only (no records artifact).** Rejected for L1: would downgrade expected-results to thin/blank, losing Phase K's core value. The committed records artifact preserves rich AC text under the at-merge model.
- **Hard-delete orphans.** Rejected: destroys history/annotations/run refs; archive is the best practice.

## Scope / non-goals (YAGNI)

- **L2 (separate spec):** PR-time **read-only linkage audit + "what will change" preview** in the PR body, and surfacing the **Qase run link** on the PR. L1 does no PR-time Qase work.
- **L3 (separate spec):** **Jira comment** with PR + Qase run links (needs a superseding ADR for ADR-0011's no-write-back).
- **Optional `qase.id` pin** for rename-survival — deferred; the map handles identity for now.
- No change to the default `npm test` matrix, tags, harness, or bucket/smoke policy.
- No manual (non-automated) cases; no bidirectional sync.

## Verification approach

1. **Unit (pure):** `results-reader` multi-project aggregation (pass-iff-all-pass, skipped-everywhere, mixed→failed); `map-store` load/upsert/orphans; `suite-sync` orchestration via a fake seam (dedup, archive-orphan, regression suite path, expected-from-records-vs-fallback). All via `npm run test:unit`.
2. **Seam:** `qase-client.archiveCase()` + automated flag against a stubbed `fetch`; confirm the live archive mechanism + `automation` field against `SWSAUCE` during build.
3. **Live proof (on `e2e`, real `SWSAUCE`):** run the full suite → `npm run tcms:sync` → Qase shows one `Regression`-rooted case per logical test, automated, steps + expected, one run with aggregated status, `qase-map.json` written. Delete a test + re-sync → its case **archived** (not destroyed), map entry removed, no duplicates.
4. **Gating/fail-safe:** with `QASE_*` unset, `npm run tcms:sync` self-skips (exit 0) and the CI step no-ops; default `npm test` unchanged.
5. **Doc/code gates:** `prettier --check` (bare), `tsc --noEmit`, `eslint src/tcms`.
