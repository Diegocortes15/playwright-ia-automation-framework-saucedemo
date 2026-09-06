# NNNN — <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNNN
**Enforced by:** <the lint rule, test, or config that makes this true> | Nothing — prose only

## Context

What's the situation that requires a decision? What forces are at play? Stay short — 2-4 sentences.

## Decision

What's the decision? State it clearly in 1-3 sentences.

## Consequences

What happens because of this decision? Both positive and negative. Bullet list.

## Alternatives considered

What other options were evaluated? Why were they rejected? Bullet list with brief rationale per alternative.

---

## On the `Enforced by:` line

Answer it honestly; the wrong answer is worse than no line.

- **If the decision states something a machine can check, write the check and name it here.**
  A lint rule, a test, or a config the code derives from. The repo already does this: no
  `waitForTimeout` and no XPath are lint rules, cross-browser stays out because
  `playwright.config.ts` derives its projects from `AUTH_USERS`, and observations never fail
  a test because the fixture swallows its own errors. None of those can drift silently.
- **If it records a choice rather than an invariant** — why `gh` instead of a GitHub MCP,
  why the PR is the review gate — write `Nothing — prose only`. That is not a failure. It
  makes visible that the only thing keeping it true is people reading it.

This does not prevent drift on its own. It forces the question at the moment the decision is
written, when the cost of adding a gate is lowest, and it tells a later reader which records
are self-defending and which are on the honour system.

**ADR-0005 is the cautionary case.** It stated a mechanical invariant — "use import
attributes for JSON" — with no check. The code was reverted three months later for a real
reason, the record stayed `Accepted`, and nobody noticed. Four files cited it, but all four
merely discussed it; the file it governed never named it. Being referenced is not the same
as being true. See ADR-0023.

---

**Template usage:**

- Copy this file to `NNNN-<kebab-case-title>.md` where NNNN is the next sequential number
- Replace title, date, status, and content sections
- Keep status `Proposed` until merged, then update to `Accepted`
- If a future ADR overturns this one, change status to `Superseded by ADR-XXXX` (don't delete)
- Keep ADRs short — under 80 lines is the goal
