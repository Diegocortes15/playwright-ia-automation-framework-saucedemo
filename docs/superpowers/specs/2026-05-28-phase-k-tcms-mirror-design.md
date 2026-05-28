# Phase K — Optional TCMS Mirror via `/from-issue` (Qase default) — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-28

## Goal

Give the framework an **optional, switch-on-able capability** to mirror its automated test suite into a Test Case Management System (TCMS) so a **non-technical reviewer can browse and approve test cases — with human-readable steps — without reading code.** The mirror is **one-way (code → TCMS)**: specs stay the single source of truth. The first build targets **Qase** (cloud SaaS, free tier, REST API) behind a thin seam so a future client project can swap in Xray/Zephyr/Kiwi. Off by default; only active when configured.

## Context

`docs/test-case-management.md` deliberately ships **no TCMS** — for a code-first Playwright project, a TCMS usually becomes net-negative (duplicate maintenance, ID drift, a stale second source of truth). That doc also lists the conditions to **revisit**, the first of which is _"non-engineering stakeholders need a UI to browse test cases and results without reading code."_ This phase implements exactly that revisit trigger as an **opt-in** path, without changing the lean default.

This repo is both a **reusable client template** and a **portfolio piece** (shown to recruiters). That dual intent favors a **cloud, recruiter-recognizable** TCMS with a real shared URL and a professional UI — not local-only infrastructure. (An earlier draft targeted self-hosted Kiwi; rejected — see Alternatives.)

Key enabling facts already true in the repo:

- `/from-issue` turns a Jira ticket into a spec where the **test case = a prose `test()` title**, its **steps = the `test.step` action names** defined on Page Object methods (per `playwright-conventions.md`), its **AC coverage** is known to the skill at generation time, and **results** land in the Playwright `json` reporter at `test-results/results.json` (already configured in `playwright.config.ts`).
- The Playwright JSON report records, per test, the executed `test.step` entries (`category: 'test.step'`) — i.e. the human-readable action names — plus pass/fail. These are the raw material for human-friendly TCMS steps.

## Verified Qase API facts (grounded against developers.qase.io)

- **Base URL** `https://api.qase.io/v1`. **Auth** = a `Token: <QASE_API_TOKEN>` request header (high confidence; **confirm against the token's curl example on first implementation** — the API also surfaces a misleading "Bearer" in one doc render).
- **Project** identified by a **project code** (2–10 chars), e.g. `SAUCE`.
- **Create case** `POST /case/{code}` — body: `title` (req, ≤255), `description`, `preconditions`, `postconditions`, `priority` (int), `severity` (int), `suite_id` (int — places the case in the tree), `steps` (array; classic form `{ action, expected_result, data }`), `steps_type: "classic"`.
- **Find cases** `GET /case/{code}` with filters (e.g. `filters[search]`, by `suite_id`) — used for the upsert lookup.
- **Update case** `PATCH /case/{code}/{id}`.
- **Suites** (`/suite/{code}` GET/POST) form a **hierarchical tree** — our `feature › context › bucket` maps onto nested suites.
- **Create run** `POST /run/{code}` — body: `title` (req), `description`, `cases[]`, `is_autotest`, `start_time`/`end_time`.
- **Create result** `POST /result/{code}/{run_id}` — body: `case_id` (int), `status` (one of `passed`/`failed`/`blocked`/`skipped`/`invalid`), `comment`, `time_ms`, optional per-step `steps[]`.
- **Free tier:** cloud-hosted, limited (per Qase: ~2 projects, ~30-day run-history window — **verify current limits when provisioning**). The 30-day run-history cap is acceptable: our mirror's value is the **persistent case catalog + latest status**, not long-run history.

## Decisions

1. **One-way mirror; code is the source of truth.** The TCMS is a downstream projection of the suite. Non-technical reviewers browse and mark approval in the TCMS; they never author cases there. (Rejects TCMS-authored and bidirectional models — they reintroduce the second-source-of-truth / drift problems the no-TCMS doc warns about.)

2. **Key cases by full title path; upsert (find-or-create); never store a TCMS id in code.** The logical key is `feature › context › bucket › prose title`. In Qase this maps to a **suite path** (`feature › context › bucket` as nested suites) + the **case title** (prose). Upsert = resolve/create the suite path, find a case by `suite_id` + title → create (`POST /case`) or update (`PATCH /case/{id}`) in place + append a run result. This is what kills "ids rot in code annotations" drift. **Renames** change the key → treated as a new case; the old one is **not auto-deleted** (a reviewer may have approved it). Orphan cleanup is out of scope (see §Non-goals).

3. **Push from inside `/from-issue`, as a new opt-in Step 11.5 (after Step 10 run, before Step 12 PR).** At that point the skill still holds the **semantic model** (normalized AC text, prose title, tags/bucket, Jira key) — a richer, more human-friendly source than scraping the JSON after the fact. Scope of the push is **this run's tests only**. Skipped under `dry-run` (like Steps 11–12), since the push is an external side effect.

4. **Human-friendly case mapping (`/from-issue` record + run → Qase case).**
   - **suite path** = `feature › context-label › bucket` (nested suites, created on demand).
   - **title** = the prose test title.
   - **steps** (classic) = the executed `test.step` action names read from `test-results/results.json` filtered to this run's tests (filter to `category: 'test.step'`, drop raw `expect`/api entries); each → `{ action: <step name>, expected_result: "" }`, and the **final step carries `expected_result` = the covered AC text** the skill already normalized (the human-readable expected outcome). Tests with no `test.step` (e.g. a single `goto` + a query) get one step whose `expected_result` is the AC text.
   - **description** = provenance (`Covers Jira <KEY> — <source URL>`) + the AC text.
   - **preconditions** = the user/context (e.g. `Session: standard_user` / `No auth`).
   - **metadata** = tags, bucket (Qase tags/fields); `is_autotest` on the run.
   - **status** = pass/fail from the same run (`passed`/`failed`).
   - Worked example (real `standard_user` login test):

     ```
     Suite:  login › no auth › Positive
     Case:   standard_user logs in successfully and lands on inventory
     Steps:
       1. action: Navigate to the login page          expected: —
       2. action: Submit credentials (standard_user)  expected: The browser lands on the Products / Inventory page (/inventory.html)
     Description: Covers Jira SW-1 — https://…/browse/SW-1
     Latest result: passed  (2026-05-28)
     ```

5. **Thin seam.** A new `src/tcms/` module with one-way internal dependencies:
   - `case-mapper.ts` — **pure, tool-agnostic.** Maps a `/from-issue` test record + step list → a `TcmsCase` (`{ suitePath, title, steps[], description, preconditions, tags, bucket, jiraKey, sourceUrl, status }`). Knows nothing about Qase. Houses all human-friendly-steps logic; fully unit-testable with no infrastructure.
   - `qase-client.ts` — **the seam.** The only file that knows Qase's REST API. Hand-rolled with Node's global `fetch` (zero new deps; the official `qaseio` SDK is a noted alternative). Minimal interface: `ensureSuitePath(string[]): suiteId`, `upsertCase(TcmsCase): caseId`, `recordRun(caseIds, results, meta)`. A future `xray-client.ts` / `zephyr-client.ts` / `kiwi-client.ts` implements the same interface — swap one import, pipeline unchanged.
   - `sync.ts` — orchestration consumed by `/from-issue`: takes this run's records + results, calls the mapper, calls the seam, returns a summary for the PR body.

6. **Gating keeps the default lean.** Config via `src/utils/env.ts`: `QASE_API_TOKEN`, `QASE_PROJECT_CODE` (+ optional `QASE_API_HOST` for self-hosted), documented in `.env.example`. **`QASE_API_TOKEN` present = TCMS on; absent = off** (Step 11.5 skipped silently; a normal run is byte-for-byte unchanged). "Prove it" = a **free Qase cloud project + an API token** — no Docker, no local server.

7. **A mirror outage never blocks code review.** Not-configured → no-op. Qase unreachable / auth failure / partial push → **do not fail the run or block the PR**; record `⚠️ Qase sync failed: <error>` (or per-case success/fail) in the PR body and continue to Step 12. Matches the existing `/from-issue` "PR is the review gate; don't abort on non-critical failures" pattern (same handling as typecheck/test failures).

8. **Shared-method (`po_modified`) cross-cutting changes are flagged, not auto-rewritten.** When an `AUGMENT` run modifies a shared Page Object method, other tickets' tests' steps also change but are outside this run's model. The MVP records `⚠️ a shared method changed — N other Qase cases may have stale steps; refresh via the backfill extension` in the PR body. Auto-refresh is the deferred whole-suite backfill's job.

9. **New ADR-0016** records this decision and amends `docs/test-case-management.md` (per CLAUDE.md "supersede, don't edit"): flip its "Why no TCMS" framing to "off by default; here is the opt-in one-way mirror," pointing at ADR-0016. This is an architectural decision (a second store, a seam, a workflow step) with rejected alternatives — it warrants an ADR, unlike Phase J's convention tweaks.

## Affected files

- `src/tcms/case-mapper.ts` — **new.** Pure record → `TcmsCase` mapper (Decisions 4, 5).
- `src/tcms/qase-client.ts` — **new.** The Qase REST seam (Decision 5).
- `src/tcms/sync.ts` — **new.** Orchestration consumed by `/from-issue` (Decisions 3, 5).
- `src/tcms/types.ts` — **new.** `TcmsCase` + the seam interface (the swap contract).
- `src/tcms/case-mapper.test.ts` — **new.** Pure unit tests for the mapper.
- `playwright.unit.config.ts` — **new.** Minimal Playwright config for non-browser unit tests (`testDir: ./src/tcms`, `testMatch: **/*.test.ts`, single project, no grep/storageState). Avoids a new test-runner dependency.
- `package.json` — add `"test:unit": "playwright test -c playwright.unit.config.ts"`.
- `src/utils/env.ts` — add the `QASE_*` reads (optional, not via `required()`).
- `.env.example` — document the `QASE_*` vars (Decision 6).
- `.claude/skills/from-issue/references/workflow.md` — add Step 11.5 (Decisions 3, 7, 8).
- `.claude/skills/from-issue/references/tcms-sync.md` — **new.** Mapping rules + gating + failure handling (Decisions 4–8).
- `.claude/skills/from-issue/references/pr-description-template.md` — add the Qase-sync summary / warning lines (Decisions 7, 8).
- `docs/adr/0016-tcms-mirror.md` — **new.** The decision record (Decision 9).
- `docs/test-case-management.md` — amend "Why no TCMS" → opt-in mirror, point to ADR-0016 (Decision 9).
- `docs/tcms.md` — **new.** Usage guide: free Qase project + token, env, what is synced, the seam interface for swapping tools (Decision 6).
- `CLAUDE.md` — one-line note under custom skills / where-things-live for the optional TCMS capability.

## Branch model / sequencing

- All work on a `phase-k-tcms-mirror` branch off `main` → merge `main` (`--no-ff`) → merge into `e2e-jira-from-issues` (matches the Phase F–J model; spec/doc + tooling, no per-user test changes).
- No `/from-issue` PR is involved — this builds the capability, it does not automate a ticket.

## Alternatives considered

- **Self-hosted Kiwi TCMS (earlier draft).** Rejected: (a) local-only — not reachable by the non-technical reviewers or CI it's meant for, so making it a real shared catalog needs the very hosting we wanted to avoid; (b) its RPC API has `TestCase.create/filter/update` but **no documented method to push test steps/actions/expected results** — the exact thing this feature centers on. Kept as a possible future _self-hosted_ seam impl for a client who mandates on-prem.
- **Testiny / Tuskr (cloud free tiers).** Strong UIs and generous free tiers, but their REST API maturity + test-step model for a programmatic push are unverified; Qase's API is the most documented + has an official Playwright reporter/JS client, lowering implementation risk. The seam keeps them swappable.
- **Xray / Zephyr as the first target.** Rejected: paid Jira Marketplace apps, can't be validated on a free plan. The seam makes them a later drop-in.
- **Custom Playwright reporter (push live during runs).** Rejected for the MVP: sits in the runner hot path and lives in `playwright.config.ts` even when gated off, fighting the "optional capability" goal; harder to unit-test; couples TCMS to every run.
- **Standalone `npm run tcms:sync` over the whole suite as the MVP.** Deferred to a documented extension: the need is "wire cases into Qase at PR time," and the whole-suite path only has the weaker JSON (no AC text) for the **expected-result** field. The seam + mapper are built so the backfill is later a thin wrapper.
- **Store a Qase case id in each spec for exact mapping.** Rejected: precisely the "ids rot in code" drift the no-TCMS doc warns about. Suite-path + title keying (Decision 2) avoids it.
- **Use the official `qaseio` SDK instead of hand-rolled `fetch`.** Viable; deferred — global `fetch` keeps the opt-in capability zero-dependency. Noted in `docs/tcms.md` as a drop-in for teams who prefer the typed client.

## Scope / non-goals (YAGNI)

- **No whole-suite backfill / `npm run tcms:sync`** in this phase (documented extension; the seam + mapper are built so it is later a thin wrapper).
- **No manual (non-automated) test cases** — the mirror is automated-only by design (a one-way projection of the suite).
- **No bidirectional or TCMS-authored** cases.
- **No Xray/Zephyr/Kiwi implementation** — only the seam that enables them.
- **No auto-delete of orphaned cases** on rename, and **no auto-refresh** of other tickets' cases on a shared-method change (Decision 8) — both are backfill-extension concerns.
- **No change** to the default run, the project matrix, tags (Phase I), harness growth (Phase H), or bucket/smoke policy.

## Verification approach

1. **`case-mapper.ts`**: pure unit tests via `npm run test:unit` — feed a sample test record + `test.step` list, assert the produced `TcmsCase` (suitePath/title/steps/description/status). This locks the human-friendly-steps contract with no infrastructure.
2. **`qase-client.ts`**: thin; verified against a **free Qase cloud project** during the "prove it" step (and/or mocked at the seam interface). Confirm the `Token:` auth header against the project's curl example.
3. **End-to-end proof**: run `/from-issue` against a throwaway ticket with `QASE_*` configured → cases appear in Qase under the right suite path with readable steps + a recorded run; re-run an updating ticket → the same case updates in place (Decision 2).
4. **Gating**: with `QASE_API_TOKEN` unset, `/from-issue` produces byte-identical output to today (Step 11.5 is a no-op).
5. **Doc/code gates**: `npx prettier --check` (bare) on the new/edited Markdown; `npx tsc --noEmit` + `npx eslint` on `src/tcms/`.
