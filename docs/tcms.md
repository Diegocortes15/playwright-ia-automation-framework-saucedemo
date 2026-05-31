# Optional TCMS Mirror (Qase)

An **opt-in, one-way** mirror of the automated suite into a TCMS so non-technical
reviewers can browse and approve human-readable test cases. Off unless configured.
Decision: [ADR-0016](adr/0016-tcms-mirror.md) (per-ticket model) →
superseded by [ADR-0017](adr/0017-tcms-sync-at-merge.md) (at-merge, whole-suite, catalog-only) →
scoped by [ADR-0018](adr/0018-qase-runs-opt-in.md) (runs are opt-in via `tcms:run`).

## How the sync works

The mirror has two separate commands with distinct responsibilities:

### `tcms:sync` — catalog-only, runs at merge

1. `/from-issue` writes a committed `.tcms/records/<KEY>.json` artifact — no Qase
   calls happen during PR creation or review.
2. When a PR merges to `main`, the CI `test` workflow runs `npm run tcms:sync`
   (gated on a `push` event + `QASE_*` GitHub Actions secrets). A rejected or
   unmerged PR never touches Qase.
3. The sync keeps the **catalog** current: creates new cases, updates changed cases,
   archives orphaned cases, and writes `qase-map.json`. **It does not create a Qase run.**
   Merges keep Qase accurate with zero run-history noise.
4. CI then **commits the refreshed `qase-map.json` back** to the branch (a
   `[skip ci]` bot commit), so the committed map always reflects the live Qase case
   ids — no manual refresh needed after a `/from-issue` PR merges.
5. `qase-map.json` (committed to the repo) is the authoritative link index mapping
   each logical test to its Qase case id.

### `qase:smoke` / `qase:regression` — one-command run + auto-labeled Qase record

For named runs, a single command runs the suite **and** records a Qase run with a fixed
label — no two-step chain required:

```bash
# Run @smoke tests → Qase run titled "SMOKE — <date time ET>":
npm run qase:smoke

# Run full suite → Qase run titled "REGRESSION — <date time ET>":
npm run qase:regression
```

These use `run-and-report.ts` which spawns `playwright test` (with the appropriate args),
then calls `recordRun(label)` regardless of pass/fail — failures are recorded in Qase too.

### `tcms:run` — opt-in, record-only (ad-hoc)

Runs are intentional — recorded when a human decides a regression pass, a smoke check,
or a subset needs to be shared with a stakeholder. Use this for ad-hoc folder/file runs
where you want to control the Playwright invocation separately:

```bash
# A specific feature folder + Qase (→ title ON-DEMAND: FOOTER — <date time ET>):
npx playwright test footer --project=chromium-standard ; npm run tcms:run

# Full suite (on-demand, no label):
npm test
npm run tcms:run
```

**Summary of run commands:**

- `npm run test:smoke` / `npm run test:regression` — **run only**, no Qase recording.
- `npm run qase:smoke` / `npm run qase:regression` — **run + auto-labeled Qase record**.
- `npx playwright test <folder> ; npm run tcms:run` — **ad-hoc record-only** (→ `ON-DEMAND: <features>`).

`tcms:run` reads the **last** `test-results/results.json`, matches ran tests to existing
cases via `qase-map.json`, records **one** Qase run, and prints the run URL. It is
**record-only**: it never creates, updates, or archives cases. Tests not yet in
`qase-map.json` are skipped with a note to run `npm run tcms:sync` first.

Run titles are upper-cased with the current date + time in ET (e.g. `ON-DEMAND: FOOTER, LOGIN — 2026-05-30 14:15 ET`). Pass an optional label (`-- SMOKE` or `-- REGRESSION`) for named runs via `tcms:run`. The printed run link is purple and any "skipped" warning is amber (TTY only).

## Turn it on

### CI (the normal path)

1. Create a free Qase account + project; note its **project code** (e.g. `SAUCE`).
2. Create an API token (Qase → Apps/API tokens).
3. Add two **GitHub Actions secrets** (Settings → Secrets and variables → Actions):
   - `QASE_API_TOKEN` — your token
   - `QASE_PROJECT_CODE` — e.g. `SAUCE`

The next merged PR triggers the catalog sync automatically. No run is created unless
you invoke `npm run tcms:run` locally.

### Local catalog refresh (optional)

To regenerate `qase-map.json` from your machine:

```bash
# 1. Set env (e.g. in .env):
QASE_API_TOKEN=...
QASE_PROJECT_CODE=SAUCE
# QASE_API_HOST=https://api.qase.io/v1   # override only for self-hosted

# 2. Run the catalog sync:
npm run tcms:sync
```

Commit the updated `qase-map.json`.

## What gets synced (one-way, code → Qase)

- A **suite tree** `feature › context › bucket`, one **case** per logical
  test (prose title), marked **automated** (conveying regression status).
- **Expected result** = the AC text from `.tcms/records/<KEY>.json`.
- Cases are **found-or-created by suite-path + title** — no Qase id is ever
  hand-pasted in code (avoids the drift the no-TCMS doc warns about).
- Results are **deduped across Playwright projects**: a test passes only if every
  project that ran it passed.
- `qase-map.json` tracks the test → case id mapping for audit, update, and deletion.

## Swapping the backend (the seam)

`src/tcms/qase-client.ts` is the only Qase-aware file; it implements `TcmsSeam`
(`src/tcms/types.ts`). To target Xray/Zephyr/self-hosted Kiwi, add a sibling client
implementing the same interface and construct it in `src/tcms/suite-sync.ts`. Teams who
prefer a typed SDK can swap the hand-rolled `fetch` for the official `qaseio` client.

Manual (non-automated) cases and bidirectional sync remain unsupported — see [ADR-0017](adr/0017-tcms-sync-at-merge.md) consequences.
