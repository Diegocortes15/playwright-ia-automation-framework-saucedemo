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
