# 0020 — /from-issue never opens a red PR (scopes ADR-0012)

**Date:** 2026-09-04
**Status:** Accepted. Extended by [ADR-0024](0024-blocked-test-lands-as-expected-failure.md), which
says what becomes of the test this ADR refuses to ship. Scopes the PR-as-review-gate model of [ADR-0012](0012-from-issue-conventions.md): the gate still absorbs _judgment_, but no longer absorbs _broken artifacts_.

## Context

Workflow Steps 9 and 10 said, verbatim, "DO NOT abort on test failures — continue to Step 11. The PR-as-review-gate model means reviewers see and fix failures in the PR." So a run whose generated spec did not compile, or did not pass, still branched, committed, pushed and opened a PR. The behavior was deliberate but never reached an ADR; it lived only in the workflow prose.

The model conflates two different things. A thin ticket produces **judgment** the reviewer must weigh — that belongs in the PR, surfaced as assumptions, exactly as ADR-0012 intends. A spec with a hallucinated selector produces a **mechanically broken artifact**. That is not a judgment call: there is nothing for a reviewer to decide, only work to redo. Handing it over as a PR spends a review cycle to deliver information the skill already had.

## Decision

- **A run that cannot go green opens nothing.** On a typecheck or test failure the skill enters a fix loop; if it cannot resolve it, Steps 11, 11.5 and 12 are skipped — no branch, no commit, no push, no PR, no TCMS artifact. Generated files stay on disk and the skill reports what it found.
- **Bounded fix loop: 3 attempts.** Each attempt states its diagnosis, applies the narrowest fix to artifacts _this run generated_, re-runs, and is logged. The loop stops early when the same failure signature repeats twice — a non-converging diagnosis produces no new information.
- **Diagnose ownership before fixing.** If the generated code is wrong (selector, import, Page Object method, routing tag, type error), fix it. If the _app_ contradicts an AC the ticket asserts, **stop and report** — the test found a bug, and "fixing" it would delete the finding. If it cannot be told apart, treat it as the app being wrong and stop.
- **A hard list of forbidden fixes**: no deleting or skipping a failing test, no weakening an assertion, no changing an expected value to whatever the app emitted, no `waitForTimeout`, no reinterpreting an AC to match observed behavior, no editing artifacts the run did not generate. Each reaches green by making the run worthless.
- **The fix log ships in the PR.** A run that went red before going green says so in the Verification section, with what changed per attempt.

## Consequences

- A green PR now means the spec compiles and passes. Previously it meant nothing about either.
- The retry happens **during authoring, before any PR exists**, so the human remains the gate on every merge. This is the line the framework draws against auto-healing: the skill may finish its own draft, never repair merged work or reopen a rejected PR.
- App/AC contradictions surface as findings instead of being silently absorbed into a weakened test. For a QA framework this is the more valuable outcome, and the old behavior had no way to express it.
- A blocked run costs the user manual work with no PR to build on. Accepted: that work existed either way, and a red PR added a review cycle on top of it.
- Runs get more expensive when the first attempt fails — up to three extra test runs. Bounded, logged, and cheap against the matrix (~1 min).
- `❌ FAIL` disappears as a final state from the PR template; the fix log replaces it.

## Alternatives considered

- **Keep the current behavior.** Rejected: a "successful" run that produces a red PR misreports itself, and the reviewer becomes the skill's debugger.
- **Report on the first failure, no retries.** Maximally strict on human-in-the-loop, but wastes the common case — a selector guessed from AC text, correctable in one pass by checking the live page. Rejected as needlessly wasteful.
- **Unbounded retry until green.** Rejected outright: unbounded token spend, and the pressure to reach green is exactly what produces weakened assertions and skipped tests.
- **Open the PR as a draft when red.** Keeps the work visible and costs no review cycle, but a draft PR still creates a branch, a commit and a TCMS record for output known to be broken, and drafts accumulate unreviewed. Rejected.
- **Let the skill run `npm install` when TypeScript is missing.** Rejected: an environment problem is not the skill's to fix, and it would widen `allowed-tools` for a case the user resolves once.
