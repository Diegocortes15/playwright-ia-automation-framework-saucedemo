# NNNN — <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNNN
**Confidence:** High | Medium | Low — <one line: what would change your mind>
**Review by:** YYYY-MM-DD | — <a date only when the decision has a shelf life; otherwise a dash>
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

## Before you write one: does this belong here?

The bar is [Azure Well-Architected's](https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record), adopted verbatim because it is tighter than "an architectural decision changed" and tighter is the point:

> Only include choices that **affect the system's structure**, **key quality attributes**, or **are difficult to reverse**.

Three questions, and a `no` to all three means this is not an ADR:

1. Would a different answer change the shape of the system, not just one file?
2. Does it trade off a quality attribute — portability, determinism, reviewability?
3. Would reversing it in six months be expensive?

If it fails the bar, the decision still gets written down — in the reference or doc it governs, where the person affected by it will actually be standing. Not every decision deserves a record; a decision log nobody can read is worth less than a shorter one that they can.

**A worked negative:** ADR-0025 (component signatures reconcile both ways) fixed a real bug and added a real check, and by this bar it should probably have been the fix plus a note in `component-detection.md`. It changed one step of one skill and was cheap to reverse. It is kept, not rewritten — that is the immutability rule — but it is the example to measure against.

## On the `Confidence:` line

Azure Well-Architected asks for it directly:

> Record the confidence level of the decision. Sometimes an architecturally significant decision is made with relatively low confidence. Documenting that low confidence status could prove useful for future reconsideration.

Say what would change your mind. `Low — one consumer so far; revisit if a second needs it` is worth more than the word "Low" alone, and it is the sentence a future reader needs to decide whether to reopen.

## On the `Review by:` line

Most decisions have no shelf life; write `—` for those and move on. Use a date when the decision rests on something that will predictably change: a deferred piece of scope, a vendor, a scale assumption, an external service. The date is a prompt to re-read, **not** an expiry — a review can perfectly well conclude "still right" and leave the record alone.

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
