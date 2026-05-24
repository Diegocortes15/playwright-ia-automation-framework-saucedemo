# Phase D.2 — Augment Mode for `/from-issue` — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-24

## Goal

When a `to-be-automated` issue's ACs extend a feature that **already has a generated spec**, `/from-issue` should add the new test(s) to the existing spec file (and add/modify the Page Object as needed) instead of creating a separate `tests/<feature>/<feature>-<num>.spec.ts`. This avoids coverage fragmenting across one-file-per-issue, matching how a human extends a feature: edit the existing spec.

## Context / problem

Today the skill is **generate-only** (Step 8 collision handling, post-phase-d1.2):

- Target `tests/<feature>/<feature>.spec.ts`.
- Exists + same issue in provenance → refuse.
- Exists + different issue → write `tests/<feature>/<feature>-<num>.spec.ts`.

So an AC extending an existing feature lands in a **second file** (`login-25.spec.ts`), fragmenting coverage over time (`login.spec.ts`, `login-25.spec.ts`, `login-31.spec.ts`…). The generate-only / refuse-to-overwrite stance was never a standalone ADR — it lives in the C2a from-issue skeleton design and the workflow. This phase reverses it and records the reversal in a new **ADR-0010**.

The skill's safety has never come from "never mutate"; it comes from the **PR being the review gate**, plus isolated typecheck and a local test run. Augment mode keeps exactly that safety model.

## Decisions

1. **Auto-augment is the default.** If `tests/<feature>/<feature>.spec.ts` exists (from a prior issue) and the current issue is not already a contributor, augment it. No new issue signal required. A `--new-file` flag forces today's create-new behavior when the operator wants a separate file for a distinct sub-area.

2. **Provenance = header contributor list; idempotency = whole-issue refuse.** The file header records the origin issue plus an "Augmented by" list. The contributor set is `origin ∪ augmented`. Re-running `/from-issue` against any issue already in that set refuses — the same same-issue-refusal rule we have today, extended to "has this issue touched this file before."

3. **Page Object: add + modify.** Augment may append new locators/methods to an existing Page Object, and may modify existing methods when a new AC requires changed behavior. Modifying a shared method can break other specs, so it triggers a broader verification (Decision 4).

4. **Verification scales with risk.** CREATE-NEW, or AUGMENT that only _added_ code → run the target spec only (fast, as today). AUGMENT where an existing Page Object member was _modified_ (`po_modified` flag) → run the **full suite** (`npx playwright test`) so dependent specs are exercised before the PR opens. The full matrix is ~1 min, so the cost is only paid on the riskier path.

5. **Edit mechanism: Read + targeted Edit (LLM-driven), gated by typecheck/run/PR.** No AST/codemod tooling, no regenerate-merge. This is consistent with the skill's nature (a doc-driven workflow that reads and writes files) and preserves the file's "manual edits are welcome" promise (regenerate-merge would destroy manual edits).

## Workflow changes

All changes are localized; the rest of the 13-step workflow is unchanged.

### Revised Step 5 — Resolve target Page Object (add/modify)

- PO doesn't exist → scaffold via `/scaffold-page-object` (today's behavior).
- PO exists → reuse. During render (Step 7), if a new test needs a method/locator the PO lacks, **append** it following the composed-vs-primitive + `test.step` conventions (`page-object-template.md`). If a new test requires an **existing** method to behave differently, **modify** it and set `po_modified = true`.
- If a modification cannot be made without irreconcilably breaking the method's existing contract → **abort** with the conflict described.

### Revised Step 8 — Mode resolution

After Step 7 renders the test record(s) in memory, resolve the target path and mode:

| Condition                                              | Mode                                                                                           |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `--new-file` flag passed                               | CREATE-NEW (incl. `-<num>` suffix on collision, per d1.2)                                      |
| File does not exist                                    | CREATE-NEW (fresh file)                                                                        |
| File exists, `<num>` already in header contributor set | REFUSE — _"issue #N already contributed to `<file>`; rm the relevant tests or edit manually."_ |
| File exists, `<num>` not a contributor                 | AUGMENT                                                                                        |

### New Step 8.5 — Insertion (AUGMENT only)

For each new test record (already bucket-classified in Step 6):

1. Locate the matching `test.describe('Positive' | 'Negative' | 'Edge', …)` block in the existing file.
2. Block exists → insert the new `test()` at its end. Block absent → create it in the fixed **Positive → Negative → Edge** order, placed correctly relative to existing buckets.
3. **Duplicate guard:** normalized-title match (lowercase, strip tags, collapse whitespace) against existing tests. Clear match → skip the record and record a _"skipped — already covered by `<existing test>`"_ note for the PR. When unsure, include it and let the reviewer decide (matches `qa-analysis.md`'s conservative "default NOT skip").
4. Append the augmenting issue to the header "Augmented by" line (create the line if absent).

### Revised Step 10 — Verification

- CREATE-NEW or AUGMENT add-only → `npx playwright test <testfile> --reporter=list` (target spec).
- AUGMENT with `po_modified` → `npx playwright test` (full suite); capture per-spec PASS/FAIL for the PR.

## Header / provenance format

```ts
// Generated by /from-issue on 2026-05-24 from GitHub Issue #7.
// Source: https://.../issues/7
// Title: [SDA][Login] Login in Saucedemo App
// Augmented by: #25 (2026-05-26), #31 (2026-06-02)
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against a contributing issue will refuse to overwrite.
```

- The "Augmented by:" line is created on the first augment and appended (comma-separated `#<num> (YYYY-MM-DD)`) on each subsequent augment.
- The idempotency check (Step 8) parses the origin `#N` from line 1 plus every `#<num>` on the "Augmented by:" line.

## Abort conditions (AUGMENT mode)

Abort cleanly with a clear message — never guess or silently fragment:

- **Unrecognizable structure** — no locatable outer/bucket describes (file hand-restructured beyond recognition): _"couldn't locate insertion point in `<file>`; add the tests manually or re-run with `--new-file`."_
- **Irreconcilable modify** — a required method change would break the method's existing contract: abort with the conflict.
- **Auth-tag mismatch** — the new tests' dominant auth-tag differs from the existing file's outer-describe auth-tag (e.g. file is `@no-auth`, new ACs are `@standard`); they cannot share one describe. **Abort with guidance to use `--new-file`.**

## PR description changes (`pr-description-template.md`)

Augment runs add:

- "What I understood" notes this **augments `<file>`** and lists existing contributors.
- AC-coverage rows marked `added` / `skipped (already covered)`.
- "Notes for reviewer" flags: appended PO members; **⚠️ modified existing method `Y` → full suite run, N specs exercised**; any skipped duplicates.
- Verification section shows full-suite results when `po_modified`.

## ADR-0010

New ADR recording the reversal of the implicit generate-only / refuse-to-overwrite stance (additive — the stance was not a standalone ADR file). Captures: the auto-augment rationale (avoid fragmentation; tests-are-code), the safety model (PR gate + isolated typecheck + conditional full-suite), and the add+modify PO policy with its full-suite mitigation. Cross-links [ADR-0009](../../adr/0009-skill-contracts-in-references-not-comments.md).

## Scope / non-goals (YAGNI)

- No AST/codemod tooling (Decision 5).
- No regenerate-merge.
- No "remove tests when an issue is reverted/closed" — whole-issue refuse is the only idempotency guarantee.
- An issue still maps to one feature file; multi-page issues are handled as today.
- `--new-file` is the only override.

## Affected files (implementation surface)

- `.claude/skills/from-issue/references/workflow.md` — Steps 5, 8, 8.5 (new), 10.
- `.claude/skills/from-issue/references/test-template.md` — header format (Augmented-by line) + provenance rules.
- `.claude/skills/from-issue/references/pr-description-template.md` — augment notes, modified-method flag, skipped-duplicate rows.
- `.claude/skills/from-issue/SKILL.md` — note augment mode + `--new-file` in the intro/usage.
- `docs/adr/0010-from-issue-augment-mode.md` — new ADR.
- `docs/from-issue.md` — learning-guide section on augment mode.

## Verification approach

Because the skill is documentation (not code), "tests" = blank-slate experiment runs:

1. Generate `login.spec.ts` from issue #7 (origin).
2. File a second login issue with an AC that **adds** a behavior needing a new PO method → confirm augment inserts the test into the right bucket, appends the PO method, header gains "Augmented by", target-spec-only verification.
3. File a third login issue whose AC **modifies** an existing method → confirm full-suite verification triggers and the PR flags the modification.
4. Re-run a contributing issue → confirm REFUSE.
5. Run with `--new-file` → confirm create-new path still works.
