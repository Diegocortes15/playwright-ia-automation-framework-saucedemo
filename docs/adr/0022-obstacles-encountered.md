# 0022 — Every first-party skill reports the obstacles it hit

**Date:** 2026-09-04
**Status:** Accepted

## Context

An agent left to choose what to mention reports the happy path: "PR opened ✅". The friction — a retried command, a selector it had to downgrade, a case its own instructions didn't cover — disappears, because nothing in the output format asks for it.

`/from-issue` already surfaces two kinds honestly: inferences about a thin ticket (`⚠️ Assumptions & open questions`, ADR-0012) and failed runs it had to fix (the fix log, ADR-0020). Three kinds have no home at all:

- **Selector downgrades.** CLAUDE.md defines a preference order — `[data-test]` → `getByRole` → text → CSS. Nothing reports when the agent went down that list. A fragile selector is deuda paid months later in flakiness, by someone who has no idea it was a fallback.
- **Tooling friction.** A command that failed and was retried, an MCP call that timed out, a step worked around.
- **Reference gaps.** Where the skill's own `references/` didn't cover the case and the agent improvised. This is the only signal that says _what is stopping the skill from working as it should_ — and without it, skills only improve when a human happens to notice.

## Decision

- **A mandatory `Obstacles encountered` section in every first-party skill's report**, declared in the skill's own workflow. `/from-issue` renders it in the PR body and the terminal report; `/scaffold-page-object` and `/refine-ticket` render it in their terminal report.
- **Always rendered, never omitted.** When there were none, it reads `Obstacles encountered: none.` — one line. This is a deliberate exception to the template's usual "omit empty sections" rule: a section that can be dropped is a section the agent learns to drop, and the empty state is only meaningful because it can't be.
- **Scoped by exclusion.** It carries selector downgrades, tooling friction, and reference gaps — nothing that already has a channel. Assumptions stay in the assumptions block; fix attempts stay in the fix log; collisions, harness growth and skipped ACs stay in their own notes. A catch-all that repeats them trains readers to skip it.
- **Each entry says what blocked it and what was done instead.** A reference gap also names the file that should have covered the case, so the entry is directly actionable against the skill.
- **Never written to Jira.** `/refine-ticket` is the only skill that writes back (ADR-0013), and it writes the refined AC block alone. Obstacles are the agent's own process, not the ticket's content.
- **`/playwright-cli` is out of scope** — it is vendored and regenerated (ADR-0019), so the section would be overwritten on the next upgrade.

## Consequences

- A fragile selector arrives labeled as a fallback, at review time, instead of being discovered later through flakiness.
- Reference gaps accumulate as written evidence, which is the input for improving the skills. Today that improvement depends on a human noticing.
- Every PR carries one more section, usually a single "none" line. That is the cost of the guarantee.
- The section is prose an agent writes, so it is not verifiable the way a typecheck is: it can still be incomplete. It narrows the gap between what the run did and what the run said; it does not close it.
- Each skill defines the section itself rather than sharing a file, keeping the skill directory self-contained per ADR-0019.

## Alternatives considered

- **A generic "obstacles" bucket with no exclusions.** Simplest to specify, and it would duplicate the assumptions block and the fix log in most runs. Readers skip sections that repeat what they already read. Rejected.
- **Omit the section when empty**, like collision warnings. Cheaper output, but it removes the guarantee: an absent section is indistinguishable from an agent that chose not to mention anything. Rejected — the guarantee is the entire point.
- **One shared reference file across the skills.** Avoids restating the rule three times, but reintroduces the cross-skill dependency ADR-0019 removed, for roughly ten lines of text. Rejected.
- **Enforce it with a lint over the PR body.** Deterministic, and it can only check that the heading exists, not that the content is honest. Not worth the machinery yet; revisit if sections start coming back empty when they shouldn't.
