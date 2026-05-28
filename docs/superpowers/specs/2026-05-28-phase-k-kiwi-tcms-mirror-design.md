# Phase K — Optional Kiwi TCMS Mirror via `/from-issue` — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-28

## Goal

Give the framework an **optional, switch-on-able capability** to mirror its automated test suite into a Test Case Management System (TCMS) so a **non-technical reviewer can browse and approve test cases — with human-readable steps — without reading code.** The mirror is **one-way (code → TCMS)**: specs stay the single source of truth. The first build targets **Kiwi TCMS** (free, self-hosted) behind a thin seam so a future client project can swap in Xray/Zephyr. Off by default; only active when configured.

## Context

`docs/test-case-management.md` deliberately ships **no TCMS** — for a code-first Playwright project, a TCMS usually becomes net-negative (duplicate maintenance, ID drift, a stale second source of truth). That doc also lists the conditions to **revisit**, the first of which is _"non-engineering stakeholders need a UI to browse test cases and results without reading code."_ This phase implements exactly that revisit trigger as an **opt-in** path, without changing the lean default.

Key enabling facts already true in the repo:

- `/from-issue` turns a Jira ticket into a spec where the **test case = a prose `test()` title**, its **steps = the `test.step` action names** defined on Page Object methods (per `playwright-conventions.md`), its **AC coverage** is known to the skill at generation time, and **results** land in the Playwright `json` reporter at `test-results/results.json` (already configured in `playwright.config.ts`).
- The Playwright JSON report records, per test, the executed `test.step` entries (`category: 'test.step'`) — i.e. the human-readable action names — plus pass/fail. These are the raw material for human-friendly TCMS steps.
- This is a **reusable learning template**, so the integration is built as a capability future client work can switch on, proven locally against a dockerized Kiwi — not as permanent live infrastructure.

## Decisions

1. **One-way mirror; code is the source of truth.** The TCMS is a downstream projection of the suite. Non-technical reviewers browse and mark approval in the TCMS; they never author cases there. (Rejects TCMS-authored and bidirectional models — they reintroduce the second-source-of-truth / drift problems the no-TCMS doc warns about.)

2. **Key cases by full title path; upsert (find-or-create); never store a TCMS id in code.** The case key is `feature › context › bucket › prose title`. New title path → create; existing → update steps/expected in place + append a run result. This is what kills "ids rot in code annotations" drift. **Renames** change the key → treated as a new case; the old one is **not auto-deleted** (a reviewer may have approved it). Orphan cleanup is out of scope (see §Non-goals).

3. **Push from inside `/from-issue`, as a new opt-in Step 11.5 (after Step 10 run, before Step 12 PR).** At that point the skill still holds the **semantic model** (normalized AC text, prose title, tags/bucket, Jira key) — a richer, more human-friendly source than scraping the JSON after the fact. Scope of the push is **this run's tests only**. Skipped under `dry-run` (like Steps 11–12), since the push is an external side effect.

4. **Human-friendly case mapping.** For each test: **summary** = prose test title; **steps** = the executed `test.step` action names read from `test-results/results.json` filtered to this run's tests (filter to `category: 'test.step'`, drop raw `expect`/api entries); **expected result** = the covered **AC text** the skill already normalized; **metadata** = tags, bucket, Jira key, source URL; **status** = pass/fail from the same run. Worked example (real `standard_user` login test):

   ```
   Test Case:  standard_user logs in successfully and lands on inventory
   Source:     Jira SW-1   ·   Tags: @no-auth @smoke   ·   Bucket: Positive
   Steps:
     1. Navigate to the login page
     2. Submit credentials (standard_user)
   Expected result:
     The browser lands on the Products / Inventory page (/inventory.html)
   Latest run: PASS  (chromium · 2026-05-28)
   ```

5. **Thin seam.** A new `src/tcms/` module with one-way internal dependencies:
   - `case-mapper.ts` — **pure, tool-agnostic.** Maps a `/from-issue` test record + step list → a `TcmsCase` (`{ titlePath, summary, steps[], expectedResult, tags, bucket, jiraKey, sourceUrl, status }`). Knows nothing about Kiwi. Houses all human-friendly-steps logic; fully unit-testable with no infrastructure.
   - `kiwi-client.ts` — **the seam.** The only file that knows Kiwi's API. Minimal interface: `upsertCase(TcmsCase): caseId` and `recordRun(caseId, status, meta)`. A future `xray-client.ts` / `zephyr-client.ts` implements the same interface — swap one import, pipeline unchanged.
   - `sync.ts` — orchestration consumed by `/from-issue`: takes this run's records + results, calls the mapper, calls the seam, returns a summary for the PR body.

6. **Gating keeps the default lean.** Config via `src/utils/env.ts`: `KIWI_URL`, `KIWI_API_KEY`, `KIWI_PRODUCT` (+ optional `KIWI_PLAN`), documented in `.env.example`. **`KIWI_URL` present = TCMS on; absent = off** (Step 11.5 skipped silently; a normal run is byte-for-byte unchanged). Local proof via a `docker-compose.kiwi.yml` + a `docs/tcms.md` walkthrough.

7. **A mirror outage never blocks code review.** Not-configured → no-op. Kiwi unreachable / auth failure / partial push → **do not fail the run or block the PR**; record `⚠️ Kiwi sync failed: <error>` (or per-case success/fail) in the PR body and continue to Step 12. Matches the existing `/from-issue` "PR is the review gate; don't abort on non-critical failures" pattern (same handling as typecheck/test failures).

8. **Shared-method (`po_modified`) cross-cutting changes are flagged, not auto-rewritten.** When an `AUGMENT` run modifies a shared Page Object method, other tickets' tests' steps also change but are outside this run's model. The MVP records `⚠️ a shared method changed — N other Kiwi cases may have stale steps; refresh via the backfill extension` in the PR body. Auto-refresh is the deferred whole-suite backfill's job.

9. **New ADR-0016** records this decision and amends `docs/test-case-management.md` (per CLAUDE.md "supersede, don't edit"): flip its "Why no TCMS" framing to "off by default; here is the opt-in one-way mirror," pointing at ADR-0016. This is an architectural decision (a second store, a seam, a workflow step) with rejected alternatives — it warrants an ADR, unlike Phase J's convention tweaks.

## Affected files

- `src/tcms/case-mapper.ts` — **new.** Pure record → `TcmsCase` mapper (Decisions 4, 5).
- `src/tcms/kiwi-client.ts` — **new.** The Kiwi seam (Decision 5).
- `src/tcms/sync.ts` — **new.** Orchestration consumed by `/from-issue` (Decisions 3, 5).
- `src/tcms/types.ts` — **new.** `TcmsCase` + the seam interface (the swap contract).
- `src/utils/env.ts` — add the `KIWI_*` reads (Decision 6).
- `.env.example` — document the `KIWI_*` vars (Decision 6).
- `docker-compose.kiwi.yml` — **new.** Local Kiwi for the "prove it locally" step (Decision 6).
- `.claude/skills/from-issue/references/workflow.md` — add Step 11.5 (Decisions 3, 7, 8).
- `.claude/skills/from-issue/references/tcms-sync.md` — **new.** Mapping rules + gating + failure handling (Decisions 4–8).
- `.claude/skills/from-issue/references/pr-description-template.md` — add the Kiwi-sync summary / warning lines (Decisions 7, 8).
- `docs/adr/0016-kiwi-tcms-mirror.md` — **new.** The decision record (Decision 9).
- `docs/test-case-management.md` — amend "Why no TCMS" → opt-in mirror, point to ADR-0016 (Decision 9).
- `docs/tcms.md` — **new.** Usage guide: local Kiwi, env, what is synced, the seam interface (Decision 6).
- `CLAUDE.md` — one-line note under custom skills / where-things-live for the optional TCMS capability.
- Unit tests for `case-mapper.ts` (Decision 5 / §Verification).

## Branch model / sequencing

- All work on a `phase-k-kiwi-tcms-mirror` branch off `main` → merge `main` (`--no-ff`) → merge into `e2e-jira-from-issues` (matches the Phase F–J model; spec/doc + tooling, no per-user test changes).
- No `/from-issue` PR is involved — this builds the capability, it does not automate a ticket.

## Alternatives considered

- **Custom Playwright reporter (push live during runs).** Rejected for the MVP: it sits in the runner hot path and lives in `playwright.config.ts` even when gated off, fighting the "optional capability" goal; harder to unit-test; couples TCMS to every run.
- **Standalone `npm run tcms:sync` over the whole suite as the MVP.** Rejected as the _first_ build: the user's need is "wire cases into Kiwi at PR time," and the whole-suite path only has the weaker JSON (no AC text) for the **expected-result** field. Kept as a **documented extension** (Decision 8 / Non-goals) for backfilling pre-TCMS specs and refreshing shared-method changes.
- **Xray / Zephyr as the first target.** Rejected: both are paid Marketplace apps that cannot be validated on a free Jira plan, breaking "prove it locally." The seam (Decision 5) makes them a later drop-in.
- **Store a Kiwi case id in each spec for exact mapping.** Rejected: this is precisely the "ids rot in code" drift the no-TCMS doc warns about. Title-path keying (Decision 2) avoids it.

## Scope / non-goals (YAGNI)

- **No whole-suite backfill / `npm run tcms:sync`** in this phase (documented extension; the seam + mapper are built so it is later a thin wrapper).
- **No manual (non-automated) test cases** — the mirror is automated-only by design (a one-way projection of the suite).
- **No bidirectional or TCMS-authored** cases.
- **No Xray/Zephyr implementation** — only the seam that enables it.
- **No auto-delete of orphaned cases** on rename, and **no auto-refresh** of other tickets' cases on a shared-method change (Decision 8) — both are backfill-extension concerns.
- **No change** to the default run, the project matrix, tags (Phase I), harness growth (Phase H), or bucket/smoke policy.

## Verification approach

1. **`case-mapper.ts`**: pure unit tests — feed a sample test record + `test.step` list, assert the produced `TcmsCase` (summary/steps/expected/metadata). This locks the human-friendly-steps contract with no infrastructure.
2. **`kiwi-client.ts`**: thin; verified against the local dockerized Kiwi during the "prove it locally" step (and/or mocked at the seam interface).
3. **End-to-end proof**: run `/from-issue` against a throwaway ticket with `KIWI_*` configured → cases appear in local Kiwi with readable steps + a recorded run; re-run an updating ticket → the same case updates in place (Decision 2).
4. **Gating**: with `KIWI_URL` unset, `/from-issue` produces byte-identical output to today (Step 11.5 is a no-op).
5. **Doc gates**: `npx prettier --check` (bare) on the new/edited Markdown; `npx tsc --noEmit` + `npx eslint` on `src/tcms/`.
