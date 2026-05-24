# Phase D.2 — Augment Mode for `/from-issue` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Teach `/from-issue` to augment an existing feature spec (and its Page Object) when a new issue extends that feature, instead of creating a separate `<feature>-<num>.spec.ts`.

**Architecture:** Pure skill-documentation edits — no runtime code. The skill is an LLM-driven workflow defined by `.claude/skills/from-issue/` references; changing its behavior means editing those Markdown contracts plus a new ADR and the learning guide. Augmentation is performed by the skill at runtime via Read + targeted Edit, gated by isolated typecheck → conditional test run → PR review.

**Tech Stack:** Markdown skill references; Prettier (formatting gate); Playwright (the blank-slate experiment that verifies behavior).

**Spec:** [`docs/superpowers/specs/2026-05-24-phase-d2-augment-mode-design.md`](../specs/2026-05-24-phase-d2-augment-mode-design.md)

**Branch:** `phase-d2-augment-mode` (already created, spec already committed).

**TDD note:** These tasks edit documentation, so "write a failing test first" does not apply per-task. Each task's gate is `npx prettier --check <file>` plus a consistency read against the spec. **Task 8 is the behavioral test** — a blank-slate experiment run that exercises augment add-only, augment modify, refuse, and `--new-file`.

---

## File Structure

| File                                                                  | Responsibility                                                               | Task |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---- |
| `docs/adr/0010-from-issue-augment-mode.md`                            | Record the reversal of the generate-only stance                              | 1    |
| `.claude/skills/from-issue/references/workflow.md` (Step 8 + new 8.5) | Mode resolution (augment/create-new/refuse) + insertion logic                | 2    |
| `.claude/skills/from-issue/references/workflow.md` (Step 5 + Step 10) | Page Object add/modify (`po_modified`) + conditional full-suite verification | 3    |
| `.claude/skills/from-issue/references/test-template.md`               | `Augmented by:` header line + provenance/idempotency rules                   | 4    |
| `.claude/skills/from-issue/references/pr-description-template.md`     | Augment notes, AC-row states, modified-method flag                           | 5    |
| `.claude/skills/from-issue/SKILL.md`                                  | Mention augment mode + `--new-file` in usage                                 | 6    |
| `docs/from-issue.md`                                                  | Learning-guide section on augment mode                                       | 7    |
| (experiment branch)                                                   | Behavioral verification                                                      | 8    |

Tasks 2 and 3 both edit `workflow.md` but touch disjoint sections (Steps 8/8.5 vs Steps 5/10); execute them sequentially (subagent-driven runs one task at a time, so no conflict).

---

## Task 1: ADR-0010 — record the augment-mode decision

**Files:**

- Create: `docs/adr/0010-from-issue-augment-mode.md`

- [ ] **Step 1: Create the ADR** (Nygard format per `docs/adr/0000-template.md`, target < 80 lines)

```markdown
# 0010 — /from-issue augment mode (extend existing specs, not one file per issue)

**Date:** 2026-05-24
**Status:** Accepted

## Context

`/from-issue` was generate-only: a new issue targeting an existing feature wrote a separate `tests/<feature>/<feature>-<num>.spec.ts` (phase-d1.2 collision handling). Over multiple issues per feature this fragments coverage across `login.spec.ts`, `login-25.spec.ts`, `login-31.spec.ts`… — not how a human extends a feature. The generate-only / refuse-to-overwrite stance was never a standalone ADR; it lived in the C2a skeleton design and the workflow. The skill's safety has always come from the PR review gate plus isolated typecheck and a local test run — not from refusing to mutate files.

## Decision

When an issue's ACs target a feature that already has a generated spec, `/from-issue` **augments** that spec (and its Page Object) by default: it inserts the new tests into the correct bucket describe and appends or modifies Page Object members as needed. A `--new-file` flag forces the old create-new behavior. Re-running any issue already recorded as a contributor (header `Augmented by:` list ∪ origin) refuses. Page Object modifications trigger a full-suite local run; add-only augments run just the target spec.

## Consequences

- Coverage for a feature stays in one readable spec file, matching hand-written practice.
- Safety is unchanged in kind: isolated typecheck + (conditional) test run + the PR diff a human reviews.
- Modifying a shared Page Object method can regress other specs; mitigated by running the full suite locally whenever a member is modified.
- The skill now mutates existing generated files — the "manual edits are welcome" promise is preserved by editing in place (Read + targeted Edit), never regenerating.
- A mis-targeted issue could augment the wrong feature; the `--new-file` override and the PR diff are the escape hatches.

## Alternatives considered

- **Keep generate-only (one file per issue).** Rejected: fragments coverage; not how engineers extend features.
- **AST/codemod insertion (ts-morph).** Rejected: heavy runtime dependency and machinery for a prompt-driven skill that only needs to insert a `test()` block.
- **Regenerate-and-merge the whole file each run.** Rejected: re-fetches every prior issue and destroys manual edits, contradicting the file's own "manual edits are welcome" contract.
- **Require an explicit `extends:` signal in the issue.** Rejected: needs an issue-template change + reporter discipline; a mis-filed issue silently fragments anyway.

## Supersedes

The implicit generate-only / refuse-to-overwrite behavior described in the C2a from-issue skeleton design and prior `workflow.md` Step 8. Cross-references [ADR-0009](0009-skill-contracts-in-references-not-comments.md) (skill contracts live in references).
```

- [ ] **Step 2: Verify formatting**

Run: `npx prettier --check docs/adr/0010-from-issue-augment-mode.md`
Expected: "All matched files use Prettier code style!"

- [ ] **Step 3: Commit**

```bash
git add docs/adr/0010-from-issue-augment-mode.md
git commit -m "docs(d2): ADR-0010 — /from-issue augment mode" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: workflow.md — Step 8 mode resolution + new Step 8.5 insertion

**Files:**

- Modify: `.claude/skills/from-issue/references/workflow.md` (the `### 8. Write test file` section and immediately after it)

- [ ] **Step 1: Replace the Step 8 "Collision handling" subsection with mode resolution**

Find this block (currently under `#### Collision handling`):

```markdown
Resolve the target path deterministically:

1. If `tests/<feature>/<feature>.spec.ts` does **not** exist → use it.
2. If it exists, read its top provenance line (`// Generated by /from-issue ... from GitHub Issue #M.`):
   - **Same issue (`M == num`)** → refuse: _"`tests/<feature>/<feature>.spec.ts` was already generated from issue #<num>. `rm` it to regenerate, or edit it directly."_ No PR.
   - **Different issue (`M != num`)** → a second issue targets the same feature. Use `tests/<feature>/<feature>-<num>.spec.ts` instead (e.g., `login-15.spec.ts`). Apply the same same-issue refusal to that path if it too exists.

Once the path is resolved, ensure the `tests/<feature>/` directory exists (`mkdir -p` if needed), then Write the file. Call the resolved path **`<testfile>`** — later steps (typecheck, run, commit) reference it.
```

Replace it with:

```markdown
Resolve the target path **and the write mode**. Read the contributor set of `tests/<feature>/<feature>.spec.ts` if it exists — that is the origin issue on line 1 (`// Generated by /from-issue ... from GitHub Issue #M.`) **plus** every `#<num>` on the `// Augmented by:` line (if present). Then:

| Condition                                          | Mode                                                                                                                                                                                |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--new-file` flag passed                           | **CREATE-NEW** — use `tests/<feature>/<feature>.spec.ts`, or `tests/<feature>/<feature>-<num>.spec.ts` if that exists (refuse if the suffixed path also exists for this same issue) |
| File does **not** exist                            | **CREATE-NEW** — write a fresh `tests/<feature>/<feature>.spec.ts`                                                                                                                  |
| File exists, `<num>` **is** in the contributor set | **REFUSE** — _"issue #<num> already contributed to `tests/<feature>/<feature>.spec.ts`. `rm` the relevant tests or edit it directly."_ No PR.                                       |
| File exists, `<num>` is **not** a contributor      | **AUGMENT** — go to Step 8.5                                                                                                                                                        |

For **CREATE-NEW**, ensure `tests/<feature>/` exists (`mkdir -p` if needed), then Write the file. For **AUGMENT**, Step 8.5 edits the existing file in place. In both cases, call the resolved path **`<testfile>`** — later steps reference it.

The new test title format, bucket structure, and the header block are unchanged from Step 7 / [`test-template.md`](test-template.md); AUGMENT reuses the same rendering, then inserts rather than writing a fresh file.
```

- [ ] **Step 2: Add a new `### 8.5` section** immediately after Step 8 (before `### 9. Isolated typecheck`)

Insert:

````markdown
### 8.5. Insert into the existing file (AUGMENT mode only)

Skip this step entirely in CREATE-NEW mode. In AUGMENT mode, edit `<testfile>` in place with targeted `Edit` calls — never regenerate the whole file (that would destroy manual edits, per [ADR-0010](../../../docs/adr/0010-from-issue-augment-mode.md)).

**Pre-check — auth-tag match.** The outer describe of the existing file carries one auth-tag (`test.describe('<feature> <auth-tag>', ...)`). If the new tests' dominant auth-tag differs (e.g. the file is `@no-auth` but the new ACs are `@standard`), they cannot share one describe — **abort**: _"new tests are `<tag>` but `<testfile>` is `<existing-tag>`; re-run with `--new-file`."_

**Pre-check — structure recognizable.** If the file has no locatable outer `test.describe` or its bucket describes can't be found (hand-restructured beyond recognition), **abort**: _"couldn't locate insertion point in `<testfile>`; add the tests manually or re-run with `--new-file`."_

For each new test record (already bucket-classified in Step 6):

1. **Duplicate guard.** Normalize the record's title (lowercase, strip leading tags like `@smoke`/`@<user>`, collapse whitespace) and compare against the normalized titles already in the file. On a clear match, **skip** the record and record a note: `⏭️ skipped "<title>" — already covered by "<existing test>"`. When unsure, include it and let the reviewer decide (matches [`qa-analysis.md`](qa-analysis.md)'s conservative "default NOT skip").
2. **Locate the bucket.** Find the `test.describe('Positive' | 'Negative' | 'Edge', () => { ... })` block matching the record's `bucket`.
   - Block exists → `Edit` to insert the new `test(...)` at the end of that block (before its closing `});`).
   - Block absent → insert a new bucket describe in the fixed **Positive → Negative → Edge** order, positioned correctly relative to existing buckets.
3. **Render the test body** exactly as Step 7 would (no spec-level `test.step`; steps live in Page Object methods per [`playwright-conventions.md`](playwright-conventions.md)).

**Update the header.** Append this issue to the `// Augmented by:` line as `#<num> (YYYY-MM-DD)` (comma-separated). If the line doesn't exist yet, add it directly below the `// Title:` line:

```ts
// Augmented by: #<num> (YYYY-MM-DD)
```

Record which records were `added` vs `skipped` for the PR body (Step 12).
````

- [ ] **Step 3: Verify formatting**

Run: `npx prettier --check .claude/skills/from-issue/references/workflow.md`
Expected: passes.

- [ ] **Step 4: Consistency check**

Read the edited Steps 8 + 8.5. Confirm: the mode table has all four rows; AUGMENT routes to 8.5; 8.5 covers auth-tag abort, structure abort, duplicate guard, bucket insertion, header append; `<testfile>` is still defined for later steps in both modes.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(d2): workflow Step 8 mode resolution + Step 8.5 insertion" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: workflow.md — Step 5 Page Object add/modify + Step 10 conditional verification

**Files:**

- Modify: `.claude/skills/from-issue/references/workflow.md` (the `### 5. Resolve target Page Object` section and the `### 10. Run the generated tests` section)

- [ ] **Step 1: Extend Step 5 with the add/modify rule**

In `### 5. Resolve target Page Object`, find the bullet that begins:

```markdown
- **Either path exists** → reuse the existing Page Object. Record a collision warning for the PR body. Continue.
```

Replace that single bullet with:

```markdown
- **Either path exists** → reuse the existing Page Object. Record a collision warning for the PR body. During render (Step 7 / Step 8.5), the Page Object may need changes to support the new tests:
  - **Add** — a new test needs a locator/method the Page Object lacks → **append** it, following the composed-vs-primitive + `test.step` conventions in [`../../scaffold-page-object/references/page-object-template.md`](../../scaffold-page-object/references/page-object-template.md). Existing members are untouched.
  - **Modify** — a new test needs an **existing** method to behave differently → modify it in place and set the run-internal flag **`po_modified = true`** (consumed by Step 10). Per [ADR-0010](../../../docs/adr/0010-from-issue-augment-mode.md), modifying a shared method can regress other specs, so it widens verification.
  - **Irreconcilable** — if a required change would break the existing method's contract in a way you cannot reconcile, **abort**: _"augmenting #<num> needs `<Method>` to change incompatibly; edit `<PageObject>` manually, then re-run."_ No PR.
```

- [ ] **Step 2: Make Step 10 verification conditional on `po_modified`**

In `### 10. Run the generated tests`, find:

````markdown
```bash
npx playwright test <testfile> --reporter=list
```

Capture per-test PASS/FAIL output. Record one line per test for the PR body's Verification section:
````

Replace with:

````markdown
**Scope depends on whether an existing Page Object member was modified:**

- CREATE-NEW, or AUGMENT that only **added** Page Object members (`po_modified` is false) → run the target spec:

  ```bash
  npx playwright test <testfile> --reporter=list
  ```

- AUGMENT where `po_modified` is **true** → a shared method changed, so run the **full suite** to catch dependent-spec regressions (the matrix is ~1 min):

  ```bash
  npx playwright test --reporter=list
  ```

  Record in the PR's Verification section that the full suite ran because an existing method was modified, plus per-spec PASS/FAIL.

Capture per-test PASS/FAIL output. Record one line per test for the PR body's Verification section:
````

- [ ] **Step 3: Verify formatting**

Run: `npx prettier --check .claude/skills/from-issue/references/workflow.md`
Expected: passes.

- [ ] **Step 4: Consistency check**

Confirm `po_modified` is **set** in Step 5 and **consumed** in Step 10 with the same name, and that the add-only path still runs only `<testfile>`.

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(d2): workflow Step 5 PO add/modify + Step 10 conditional full-suite" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: test-template.md — `Augmented by:` header + provenance rules

**Files:**

- Modify: `.claude/skills/from-issue/references/test-template.md` (the top-of-file comment block in the Template + the "Comment block at top" rule + the example)

- [ ] **Step 1: Update the header rule** to document the `Augmented by:` line

Find the `## Rules` bullet:

```markdown
- **Comment block at top** — mandatory; 5 lines verbatim with `YYYY-MM-DD`, `N`, `<issue-url>`, and `<issue-title>` substituted by the orchestrator.
```

Replace with:

````markdown
- **Comment block at top** — mandatory. On first generation it is 5 lines with `YYYY-MM-DD`, `N`, `<issue-url>`, and `<issue-title>` substituted:

  ```ts
  // Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
  // Source: <issue-url>
  // Title: <issue-title>
  // Manual edits are welcome — this file is not regenerated automatically.
  // Re-running /from-issue against a contributing issue will refuse to overwrite.
  ```

  When the file is **augmented** by a later issue (per [ADR-0010](../../../docs/adr/0010-from-issue-augment-mode.md)), a `// Augmented by:` line is inserted directly below `// Title:`, listing each augmenting issue as `#<num> (YYYY-MM-DD)`, comma-separated:

  ```ts
  // Title: <issue-title>
  // Augmented by: #25 (2026-05-26), #31 (2026-06-02)
  ```

  The **contributor set** the skill uses for idempotency (Step 8) = the origin `#N` on line 1 ∪ every `#<num>` on the `Augmented by:` line. The last header line reads `against a contributing issue` (not `against the same issue`) to reflect that any contributor re-run refuses.
````

- [ ] **Step 2: Update the last line of the Template's header block** (in the `## Template` fenced example) from:

```ts
// Re-running /from-issue against the same issue will refuse to overwrite.
```

to:

```ts
// Re-running /from-issue against a contributing issue will refuse to overwrite.
```

Apply the same change to the example header in the `## Example` section (the worked login example near the bottom of the file).

- [ ] **Step 3: Verify formatting**

Run: `npx prettier --check .claude/skills/from-issue/references/test-template.md`
Expected: passes.

- [ ] **Step 4: Consistency check**

Grep the file for `against the same issue` — expect **zero** matches (all replaced with `against a contributing issue`). Run: `grep -n "against the same issue\|against a contributing issue" .claude/skills/from-issue/references/test-template.md`

- [ ] **Step 5: Commit**

```bash
git add .claude/skills/from-issue/references/test-template.md
git commit -m "feat(d2): test-template Augmented-by header + contributor-set provenance" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: pr-description-template.md — augment notes, AC-row states, modified-method flag

**Files:**

- Modify: `.claude/skills/from-issue/references/pr-description-template.md` (the `## Notes for reviewer` section)

- [ ] **Step 1: Add augment-specific reviewer notes**

In `## Notes for reviewer`, find:

```markdown
- ⚠️ **Side effect (externalized data):** per [`data-placement.md`](data-placement.md), N `<feature>` scenario(s) were externalized to `data/scenarios/<feature>/` + a loader in `data/fixtures.ts` (reused/large/named-scenario data). Reviewer: verify the loader + payloads. _(Omit when data stayed inline — the default for small, test-local parameterization.)_
```

Insert immediately after it:

```markdown
- 🔁 **Augment:** this PR **augmented** an existing spec `tests/<feature>/<feature>.spec.ts` (prior contributors: `#<list>`) rather than creating a new file. AC-coverage rows below are marked `added` or `skipped (already covered)`.
- ➕ **Page Object additions:** appended `<members>` to `<PageObject>` for the new tests (existing members untouched).
- ⚠️ **Page Object modification:** modified existing method `<Method>` on `<PageObject>`. Because other specs may call it, the **full suite** ran locally (see Verification). Reviewer: confirm no dependent spec regressed.
- ⏭️ **Skipped (duplicate):** AC <id> maps to a test already present (`<existing test>`); not re-added. Reviewer: push back if the existing test doesn't actually cover it.

_(Include only the augment notes that apply; omit this whole group for plain CREATE-NEW runs.)_
```

- [ ] **Step 2: Verify formatting**

Run: `npx prettier --check .claude/skills/from-issue/references/pr-description-template.md`
Expected: passes.

- [ ] **Step 3: Consistency check**

Confirm the four augment notes correspond to behaviors in the spec/workflow: augment (Step 8), PO add + PO modify (Step 5), skipped duplicate (Step 8.5). The modified-method note must reference the full-suite Verification (Step 10).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(d2): PR template augment notes + modified-method flag" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: SKILL.md — mention augment mode + `--new-file`

**Files:**

- Modify: `.claude/skills/from-issue/SKILL.md` (the `## How to use it` section)

- [ ] **Step 1: Add the augment + `--new-file` usage note**

After the `dry-run` usage block:

```markdown
Or for experimentation (skip push/PR/issue-comment):

> Use the from-issue skill on issue #42 with dry-run.
```

Insert:

```markdown
If the issue's feature already has a generated spec, the skill **augments** that file (adds the new tests, and adds/modifies the Page Object as needed) instead of creating a new file — see [ADR-0010](../../../docs/adr/0010-from-issue-augment-mode.md). Re-running any issue that already contributed to the file refuses. To force a separate file instead of augmenting:

> Use the from-issue skill on issue #42 with --new-file.
```

- [ ] **Step 2: Verify formatting**

Run: `npx prettier --check .claude/skills/from-issue/SKILL.md`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/from-issue/SKILL.md
git commit -m "docs(d2): SKILL.md — augment mode + --new-file usage" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: docs/from-issue.md — learning-guide section on augment mode

**Files:**

- Modify: `docs/from-issue.md` (add a new `### Augment an existing feature` subsection under `## Worked examples`)

- [ ] **Step 1: Add the worked example**

Under `## Worked examples`, after the existing `### Generate tests AND scaffold a new page` subsection, insert:

```markdown
### Augment an existing feature

Use this when a new issue extends a feature that already has a generated spec.

> Use the from-issue skill on issue #25.

Result (per [ADR-0010](adr/0010-from-issue-augment-mode.md)): the skill detects `tests/login/login.spec.ts` already exists (from issue #7), and **augments** it — inserts the new test(s) into the correct `Positive`/`Negative`/`Edge` bucket, appends any new `LoginPage` method/locator the tests need (or modifies an existing method, which then triggers a full-suite run), and adds a `// Augmented by: #25 (<date>)` line to the header. The PR diff shows exactly what was inserted.

Re-running a contributing issue (here, #7 or #25) refuses — the header contributor set is the guard. To force a separate file instead, pass `--new-file`:

> Use the from-issue skill on issue #25 with --new-file.

This writes `tests/login/login-25.spec.ts` (the pre-D.2 behavior), for when the new ACs are a genuinely distinct sub-area.
```

- [ ] **Step 2: Verify formatting**

Run: `npx prettier --check docs/from-issue.md`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add docs/from-issue.md
git commit -m "docs(d2): from-issue learning guide — augment-an-existing-feature example" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Behavioral verification — blank-slate experiment (the real test)

This is the integration test for the whole phase. It runs on a fresh blank-slate branch off `main` **after** Tasks 1–7 are merged to `main`, so the skill being exercised is the updated one. The operator (user) drives each `/from-issue` invocation, as with prior experiment runs.

**Files:** none committed by this task to the skill; it produces experiment artifacts (a generated spec + PRs) used only to validate behavior.

- [ ] **Step 1: Prep the blank slate**

```bash
git checkout main
git checkout -b experiment-d2-augment-v1
git rm -r --quiet data src/components src/pages tests
```

Then stub `src/fixtures/test.ts` to an empty registry and `playwright.config.ts` to a single `no-auth` chromium project (same as prior `experiment-rebuild-from-scratch-v*` setups), commit, and confirm `npx playwright test --list` → 0 tests.

- [ ] **Step 2: Origin run (CREATE-NEW)**

Run `/from-issue 7`. Expected: creates `tests/login/login.spec.ts` (5-line header, no `Augmented by:` line), branch `from-issue/7-login`, target-spec verification, clean single-line commit subject.

- [ ] **Step 3: Augment add-only run**

File a new login issue (e.g. #N1) with an AC that needs a NEW behavior + a NEW `LoginPage` member (example: "the Login button is disabled until both fields are non-empty" → needs `isLoginButtonEnabled()`). Run `/from-issue <N1>`.
Expected: AUGMENT mode — inserts the test into the right bucket of `login.spec.ts`; appends `isLoginButtonEnabled()` to `LoginPage` (existing methods untouched); header gains `// Augmented by: #<N1> (<date>)`; **target-spec-only** verification (no `po_modified`); PR "Notes for reviewer" shows the augment + PO-addition notes.

- [ ] **Step 4: Augment modify run (full-suite path)**

File a login issue (e.g. #N2) whose AC requires changing an EXISTING method's behavior. Run `/from-issue <N2>`.
Expected: AUGMENT mode with `po_modified` → **full suite** runs in Step 10; PR flags `⚠️ Page Object modification` + full-suite Verification; header gains the new contributor.

- [ ] **Step 5: Idempotency refuse**

Re-run `/from-issue 7` (an existing contributor).
Expected: REFUSE with the contributor-set message; no PR.

- [ ] **Step 6: `--new-file` override**

Run `/from-issue <N1> --new-file` (after rm-ing the augment from Step 3, or on a fresh slate).
Expected: writes `tests/login/login-<N1>.spec.ts` (create-new path), no augment.

- [ ] **Step 7: Record findings**

Capture any defects as `D2-OBS-NNN` notes (same convention as D1-OBS-001) for a follow-up hardening pass, and report pass/fail of each expectation above to the user.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (auto-augment + `--new-file`) → Tasks 2, 6, 8. Decision 2 (contributor list + refuse) → Tasks 2, 4, 8. Decision 3 (PO add+modify) → Task 3. Decision 4 (conditional full-suite) → Task 3. Decision 5 (Read+Edit mechanism) → Task 2 (Step 8.5 "edit in place, never regenerate") + ADR. Header format → Task 4. Abort conditions (auth-tag, structure, irreconcilable modify) → Tasks 2 & 3. Duplicate guard → Task 2. PR changes → Task 5. ADR-0010 → Task 1. Learning guide → Task 7. Verification approach → Task 8. No gaps.

**Placeholder scan:** No "TBD/TODO/handle edge cases". Every doc edit includes the exact text to insert and an exact `prettier --check` command with expected output.

**Consistency:** `po_modified` is set in Task 3 Step 1 and consumed in Task 3 Step 2 (same name). `<testfile>` defined in Task 2 Step 1, used in Tasks 2–3. Contributor-set definition matches between Task 2 (Step 8) and Task 4 (header rule). `--new-file` flag wording consistent across Tasks 2, 6, 7.
