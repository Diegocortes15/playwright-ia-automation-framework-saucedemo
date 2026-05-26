# 0012 — /from-issue branch / commit / PR conventions + format-agnostic ticket normalization

**Date:** 2026-05-25
**Status:** Accepted

## Context

The first real Jira run (SW-1 → PR #14) used minimal formats — branch `from-issue/SW-1-login`, commit `feat: add generated tests from SW-1` — and the PR's "What I understood" asserted SW-1-specific structure ("captures the requirement as GWT scenarios, not a narrative"), an assumption that won't generalize across BA writing styles. We want senior-grade outputs and ticket comprehension that adapts to any requirement form/quality.

## Decision

`/from-issue` adopts these conventions:

- **Branch:** `<KEY>-<feature>` — exact uppercase Jira key first, hyphen, feature slug (e.g. `SW-1-login`). No `from-issue/` prefix.
- **Commit:** Conventional Commits — `feat(<feature>): automate <KEY> <feature> scenarios`, a body explaining what+why, a `Refs: <KEY>` trailer, and the `Co-Authored-By` trailer. Built via repeated `-m` flags (never shell here-strings, per phase-d1.5).
- **PR title:** `feat(<feature>): automate <KEY> <feature> scenarios` (mirrors the commit).
- **PR base:** the branch HEAD was on when the skill was invoked (not hardcoded `main`) — the integration branch during a build-up, `main` in normal use.
- **Ticket normalization:** format- AND quality-agnostic — narrative / GWT / bullet ACs / prose / mixed all normalize into AC records; a user-story narrative is extracted when present; vague tickets get a best-effort normalization with every inference surfaced as PR **Assumptions & open questions** (abort only when nothing testable can be extracted). The PR's "What I understood" represents the requirement in whatever form it arrived.

## Consequences

- Branches/commits/PRs read like a senior engineer's; the Jira key threads through branch + commit trailer + PR title/body.
- Reviewers see exactly what the skill inferred from a thin ticket and can correct it in the PR.
- The PR base rule makes the skill correct both for normal use (PR → main) and the e2e build-up (PR → integration branch).
- `feat` is used as the type for test-coverage delivery (consistent with the approved PR-title examples); switch to `test` later if preferred.

## Alternatives considered

- **`feature/<KEY>-<desc>` (type-prefixed branch).** Rejected: doesn't "start with the key" per the requirement; key-first `SW-1-login` chosen.
- **Lowercased key (`sw-1-login`).** Rejected: the uppercase key matches the ticket verbatim; the app links case-insensitively either way.
- **Abort / interactively clarify vague tickets.** Rejected: breaks the autonomous PR-as-review-gate model; best-effort + surfaced assumptions keeps it unattended while transparent.

## Related

- [ADR-0011](0011-jira-ticket-source.md) — Jira ticket source; [ADR-0010](0010-from-issue-augment-mode.md) — augment mode; phase-d1.5 — repeated-`-m` commit rule.
