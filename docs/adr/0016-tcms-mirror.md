# 0016 — Optional one-way TCMS mirror via /from-issue (Qase default)

**Date:** 2026-05-28
**Status:** Accepted. Scopes the "no TCMS" stance in
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
