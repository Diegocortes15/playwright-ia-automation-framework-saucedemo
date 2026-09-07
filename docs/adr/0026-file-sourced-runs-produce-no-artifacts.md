# 0026 — A file-sourced run produces no artifacts, and a missing acceptance criterion says why

**Date:** 2026-09-07
**Status:** Accepted. Scopes [ADR-0016](0016-tcms-mirror.md) / [ADR-0017](0017-tcms-sync-at-merge.md) (the records artifact is written only for a run that traces to a ticket) and completes [ADR-0020](0020-no-red-pr.md) (what a blocked run leaves behind for `/report-bug` to read).
**Enforced by:** `src/tcms/suite-sync.ts:86-87` throws on any record with an empty `jira` array — the check already existed and now agrees with the instruction instead of contradicting it, so a file-sourced run cannot produce a record that reaches `main`. For the second decision, `collect-failure.mjs` always emits either `acceptanceCriterion` or `acceptanceCriterionMissing` with a reason code, so a draft cannot silently omit the field.

## Context

Two problems, found by running the pipeline rather than reading it, and they turn out to be the same question: **what does a skill produce that leaves the repository, and when?**

**`--from-file` produced an artifact it could never merge.** `tcms-sync.md` said two incompatible things — line 36, "the sync rejects any record missing a non-empty `jira` array", and lines 46–51, "when the run used `--from-file`, write `"jira": []` on every record". `suite-sync.ts:86-87` throws on exactly that, `main()` reaches the check because `qaseConfig()` resolves (both `QASE_*` secrets are set), and the merge-time sync step runs on `push` with no `continue-on-error`. PR #46 followed both instructions faithfully and produced a branch whose merge would have failed **on `main`, after the merge** — not on the PR. The feature shipped in #42, after ADR-0016/0017, and nobody noticed because no file-sourced run had ever been merged.

**`/report-bug` cannot resolve an acceptance criterion in the case it exists for.** `collect-failure.mjs` reads the AC from `.tcms/records/<feature>.json` and matches on test title. ADR-0020 specifies that a blocked run writes **no** records artifact. `/report-bug` is what you reach for **after** a blocked run. So the lookup is structurally guaranteed to miss, and it returns a bare `undefined` in three different situations — no records file, no matching record, unparseable file — that a reader would want to tell apart. Confirmed on 2026-09-07: the SW-13 draft fell back to the assertion, and the acceptance criterion had to be supplied by hand from the Jira read.

The template already degrades gracefully ("when the script found no AC, say the report is falling back to the assertion"), so this is not a crash. It is worse in a quiet way: the report's **Expected** section, the one a triager reads to learn what the system was supposed to do, falls back to restating the assertion that just failed. That is circular, and nothing tells the reader that the absence is structural rather than an oversight.

## Decision

**A file-sourced run stops before the artifacts.** `--from-file` runs everything through Step 10 — generate, typecheck, execute, report — and then skips Steps 11, 11.5 and 12 exactly as `dry-run` does. No branch, no commit, no push, no PR, no records artifact.

- The `"jira": []` instruction is **deleted**, not fixed. It was the source of the contradiction, and an empty `jira` array now never exists.
- This makes explicit what was already true in practice. `--from-file`'s own purpose, stated in its `SKILL.md`, is "exercising the pipeline" and "testing changes to this skill without burning a real ticket" — neither of which needs a PR. Shipping coverage needs a ticket, because coverage without a requirement behind it is what the TCMS mirror exists to prevent.

**A missing acceptance criterion states its reason.** `collect-failure.mjs` emits either `acceptanceCriterion` (resolved) or `acceptanceCriterionMissing` carrying one of `no-records-file` / `no-matching-record` / `unreadable-records-file`, and the draft renders that reason in **Expected** before falling back to the assertion. For a blocked run the reason names ADR-0020, so a reader learns the absence is by design.

## Consequences

- The contradiction is gone rather than worked around, and the existing sync check becomes a real guarantee instead of a trap.
- `--from-file` becomes honestly scoped: a rehearsal, not a delivery path. Anyone wanting the tests shipped runs the ticket.
- A `/report-bug` draft now distinguishes "nobody wrote an acceptance criterion" from "the run that would have written one was correctly blocked". Only the first is a process problem.
- **`--from-file` keeps `/from-issue` usable in a repository with no Atlassian connection**, which is the scenario [ADR-0019](0019-skill-portability.md) made skills portable for. Deleting the flag outright — the obvious reaction once Jira came back — would have removed the only way to run the skill in a fresh repo, and left ADR-0024's Context citing a workflow that no longer exists.
- The **Expected** section can still fall back to the assertion. This decision does not obtain the criterion, it explains its absence; obtaining it would need a ticket key the failure does not carry.

## Alternatives considered

- **Make the sync skip records with an empty `jira` array.** Rejected: it keeps producing catalogue entries that trace to no requirement, which is precisely what the Qase mirror is for. The sync's strictness was right; the instruction feeding it was wrong.
- **Delete `--from-file` now that Jira is back.** Rejected for the reasons in Consequences: its stated purpose outlives the outage, four real tickets were burned in one session testing pipeline behaviour, ADR-0019 depends on it, ADR-0024 cites it, and the Jira instance had already died once from inactivity two days earlier.
- **Let a file-sourced run open a PR but write no records.** Rejected: the spec would merge without a catalogue entry, so coverage would exist that the mirror does not know about — a quieter version of the same defect.
- **Give `/report-bug` a Jira read tool so it can fetch the criterion.** Rejected as speculative: a failure carries a feature and a test title, not a ticket key. A multi-ticket spec carries several keys in its header with no mapping from test to key — which is exactly what the missing records artifact would have provided.
- **Let `/report-bug` file the defect on explicit approval, mirroring ADR-0013.** Rejected **for now**, and it is the tempting one — ADR-0024 requires a filed identifier before a blocked test can land as `test.fail()`, and today that step is manual and named by no document. Three reasons to wait. "Files nothing" is the sharpest statement of the human-in-the-loop principle in this repository, and "files nothing unless approved" turns a bright line into a gradient. ADR-0013 is not the precedent it appears to be: writing refined acceptance criteria into an existing ticket is a smaller act than filing a new defect, which asserts to a team that their application is broken. And exactly **one** defect has been filed (SW-14, by hand); one consumer does not justify the capability under the project's own YAGNI rule. Revisit when filing friction has been felt more than once.
