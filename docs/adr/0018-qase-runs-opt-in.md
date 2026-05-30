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
