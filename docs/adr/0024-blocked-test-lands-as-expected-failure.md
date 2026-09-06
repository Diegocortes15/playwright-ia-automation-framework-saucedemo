# 0024 — A test blocked by an application defect lands as `test.fail()`, on human approval (extends ADR-0020)

**Date:** 2026-09-06
**Status:** Accepted. Extends [ADR-0020](0020-no-red-pr.md), which says what a blocked run must not do and stops there.
**Enforced by:** Partly. `test.fail()` enforces its own follow-up — the suite turns red the moment the defect is fixed, so nothing depends on memory. The human-approval half is prose only; see Consequences for why a check would be worse than none.

## Context

ADR-0020 stops a run whose generated test fails because the application contradicts an acceptance criterion: no branch, no commit, no PR. That is right, and it is incomplete. It never says what becomes of the test.

Running `/from-issue --from-file tickets/SW-902-problem-user-sort.md` made the gap concrete. The run correctly refused to open a PR, and then left a correct, valuable test with nowhere to go. Three destinations were available and only one of them survives contact with a real team:

- **Leave the automation ticket open until the fix lands.** The work is redone from scratch months later, and in the meantime the defect has no regression test — so when it is fixed, nobody can tell whether it was fixed properly.
- **Merge it `skip`ped or `fixme`d, linked to the bug.** The industry default, and mediocre. The failure is not technical: **nobody comes back.** A skipped test gives zero signal, accumulates alongside others, and within a year nobody knows which are still relevant.
- **Merge it as `test.fail()`, referencing the filed bug.**

## Decision

- **The run still opens nothing.** ADR-0020 is unchanged. The blocked run reports; `/report-bug` turns that into a filable draft.
- **Once a human has decided the application is at fault and filed the defect, the test lands annotated:**

  ```ts
  // BUG-123 — sorting does not reorder for problem_user.
  // Remove test.fail() when the fix lands; this turning red IS the notification.
  test.fail('problem_user selecting "Name (Z to A)" sorts products by name descending', ...)
  ```

  It runs for real and asserts for real. CI stays green while the defect lives, and reports `Expected to fail, but passed.` the day it is fixed.

- **The annotation always carries the defect's identifier and the instruction to remove it.** An unattributed `test.fail()` is indistinguishable from a test somebody gave up on.
- **The agent never applies `test.fail()` on its own initiative.** It reports the blockage and both readings; a person decides. This is the load-bearing rule: an agent that may annotate anything that fails has an escape hatch shaped exactly like weakening an assertion, which is what ADR-0020 exists to prevent.
- **Not for intermittent defects.** `test.fail()` fails the run whenever the test happens to pass, so a flaky defect produces a flaky suite. Use it only where the failure is deterministic.

## Consequences

- The follow-up stops depending on memory. The suite announces the fix.
- Coverage exists the day the fix lands rather than whenever someone finds time to write it.
- **A `test.fail()` test passes for _any_ failure, not only the original one.** If the application later breaks differently at the same step, the annotation masks it. This is the real cost, and it is why the annotation must name the defect: the identifier is what lets a reader check whether the failure still matches the bug.
- Removing the annotation becomes part of the fix's definition of done, in the same PR as the fix.
- A reviewer must understand the annotation. It is rarer than `skip`, and the mandatory comment carries its own explanation.
- Enforcing "a human approved this" is not attempted. A check could only confirm that a comment exists, which an agent can write as easily as the annotation — it would convert a real constraint into a box to tick, and make the rule look defended when it is not. The honest record is that this half runs on the honour system.

## Alternatives considered

- **`skip` / `fixme` linked to the bug.** Rejected above: zero signal, and the return trip never happens.
- **Merge the test failing.** Rejected: it breaks CI for everyone, and a permanently red suite trains people to ignore red.
- **Open a draft PR with the failing test.** Rejected: it still creates a branch, a commit and a TCMS record for output known to be broken, and draft PRs accumulate unreviewed.
- **Let the agent apply `test.fail()` when it diagnoses an app defect.** Rejected, and it is the tempting one — it would close the loop without a human round-trip. It also hands the agent a one-line way to make any failing test green. The diagnosis it would rest on is exactly the judgment ADR-0020 reserved for a person, and `/report-bug` deliberately refuses to make.
