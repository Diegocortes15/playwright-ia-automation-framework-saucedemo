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
     "meta": { "jiraKey": "SW-1", "sourceUrl": "https://…/browse/SW-1", "runTitle": "from-issue SW-1 — 2026-05-28" },
     "records": [
       {
         "title": "<the prose test title, with any embedded @tag tokens stripped>",
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
