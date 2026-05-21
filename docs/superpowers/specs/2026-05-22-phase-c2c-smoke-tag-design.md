# Phase C.2.c — `@smoke` Tag Selection (Design Spec)

**Date:** 2026-05-22
**Status:** Draft — awaiting review
**Phase:** C.2.c (smoke tag selection). Builds on C.2.a (orchestrator skeleton) and C.2.b (bucketing). Closes the C.2 arc.

## 1. Goal & Scope

### Goal

Extend `/from-issue` to apply the `@smoke` tag to a curated subset of generated tests. Selection is driven by LLM judgment against a new `references/smoke-policy.md` reference doc that defines what "smoke-worthy" means. Add project infrastructure (`npm run test:smoke` + CLAUDE.md tag row) so the smoke set is first-class and runnable in one command.

### Selection rule

- LLM evaluates each generated test against the criteria in `references/smoke-policy.md` (critical user journey, must-not-break behavior, fast & stable).
- **Default = NOT smoke.** The policy doc actively constrains over-tagging via its "when in doubt, NOT smoke" guidance.
- **Not bucket-coupled.** A Negative test can be smoke if it represents critical regression risk (e.g., "unauthenticated cart access redirects to login"). A Positive test can be NOT-smoke if it's peripheral (e.g., "sort by price descending").
- **No hard numeric cap.** The policy's default-NOT-smoke guidance is the constraint mechanism; if smoke sets grow inconsistent in practice, sharpen the policy doc's negative examples or introduce a cap in a later phase.

### Title format

`'<auth-tag> [@smoke] [<user-tag>] <behavior>'` — `@smoke` slots in after the auth-tag, before the optional user-tag. Square brackets indicate optionality (matches the C.2.b convention for `<user-tag>`).

### What this IS

- A new reference doc (`smoke-policy.md`) defining smoke-worthiness criteria + worked examples.
- An extension of workflow Step 6 (test records gain `smoke: boolean`) and Step 7 (prepend `@smoke ` when true).
- Project infrastructure: `npm run test:smoke` script + new `@smoke` row in CLAUDE.md's tag conventions table.
- A `⚡ ` prefix in the PR description's AC coverage table (Test column) to flag smoke tests visually.
- A learning-guide update noting smoke selection and how to override it post-PR.

### What this IS NOT

- **Not bucket-coupled.** Smoke selection runs orthogonally to Positive/Negative/Edge classification (decoupled per pivot from initial brainstorm).
- **Not a new Playwright project.** Existing project taxonomy (user × browser) stays unchanged. `@smoke` is filtered via `--grep '@smoke'`, not a project slice.
- **Not retroactive.** Existing legacy tests (`login.spec.ts`, `cart/add-remove.spec.ts`, etc.) stay un-tagged. Only newly-generated tests from `/from-issue` get evaluated for `@smoke`.
- **Not the final word on selection.** Future phases (C.3+) may revisit if smoke sets prove inconsistent across PRs or grow too large.
- **Not a CI gate.** Whether `npm run test:smoke` becomes a merge-blocking check is a separate project decision, out of skill scope.

## 2. Decision Log

1. **Selection = LLM judgment per test.** Each generated test gets evaluated against `smoke-policy.md` criteria. Default = NOT smoke. No mechanical bucket coupling.

2. **Default-NOT-smoke is the constraint.** Without a hard numeric cap, the policy doc's "when in doubt, NOT smoke" guidance is what keeps the smoke set curated.

3. **No hard cap on smoke tests per issue.** LLM judgment + policy default-NOT-smoke replaces a numeric cap. If drift becomes systemic, revisit in C.3+.

4. **Title placement: after auth-tag.** Format `'<auth-tag> [@smoke] [<user-tag>] <behavior>'`. Auth-tag stays first per existing convention; @smoke groups with other classifier tags before user-tag and behavior.

5. **Decision happens in Step 6, render in Step 7.** Mirrors C.2.b's bucket flow exactly. Test record gains `smoke: boolean` field in Step 6; Step 7 reads the boolean and prepends `@smoke ` when true. Predictable structure, easy to audit.

6. **`smoke-policy.md` is the single source of truth.** No inline fallback rules. If the doc is missing or unreadable, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ Silent fallbacks hide drift. (Same pattern as `bucket-classification.md` in C.2.b.)

7. **Full first-class infrastructure.** Adds `npm run test:smoke` script + new `@smoke` row in CLAUDE.md tag conventions table + learning-guide update. Does NOT add a new Playwright project (`--grep` is sufficient).

8. **PR description gains a `⚡ ` marker, not a new column.** AC coverage table stays 4 columns (`AC | Test | Bucket | Status`); smoke tests are flagged by prepending `⚡ ` to the backtick-wrapped test title in the Test column. Cheaper than a 5th column; sufficient signal.

9. **Smoke applies to individual tests, regardless of bucket.** A test in any of `{Positive, Negative, Edge}` can have `smoke: true`. The decoupling is intentional — some Negative tests (e.g., critical auth-rejection regressions) are legitimately smoke-worthy.

10. **Zero smoke is acceptable; all smoke is acceptable.** No flag, no warning, no abort. Some features have no critical path; some are entirely critical. The reviewer can push back via PR comment if they disagree.

11. **Reviewer override = edit the file in the PR.** If a reviewer disagrees with the LLM's smoke pick, they edit the generated file in the same PR (add/remove `@smoke` from the test title manually). The orchestrator does not re-run.

## 3. Architecture

### File touchpoints

| File | Change | Why |
|---|---|---|
| `.claude/skills/from-issue/references/smoke-policy.md` | **NEW** | Defines smoke-worthiness criteria + 3-5 worked examples per category (smoke vs. NOT-smoke). LLM reads this when classifying. ~60-80 lines. Mirrors the structural pattern of `bucket-classification.md`. |
| `.claude/skills/from-issue/references/workflow.md` | Modify Steps 6 + 7 | Step 6 records gain `smoke` field. Step 7 prepends `@smoke ` when true. |
| `.claude/skills/from-issue/references/test-template.md` | Modify "Per-test title" rule + Example | Title format gains optional `[@smoke]` slot. Example shows mixed smoke + non-smoke tests. |
| `.claude/skills/from-issue/references/pr-description-template.md` | Modify "Test" column rule + Template + Example | Prepend `⚡ ` to smoke test titles in AC coverage table. |
| `.claude/skills/from-issue/SKILL.md` | Add 1 line to References section | Pointer to new `smoke-policy.md`. |
| `package.json` | Add `test:smoke` npm script | `"test:smoke": "playwright test --grep '@smoke'"` |
| `CLAUDE.md` | Add `@smoke` row to Tag conventions table | Registers the cross-cutting tag project-wide. |
| `docs/from-issue.md` | Add smoke paragraph + update Worked example snippet + note reviewer override pattern | Learning guide explains the LLM-judgment rule, the `⚡` marker, and how reviewers override smoke picks. |

**1 new + 7 modified = 8 files touched.** Zero changes to `src/`, `tests/`, `playwright.config.ts`, ADR-0008, or the GitHub Issue Template.

### Extended test record (Step 6)

The per-test record from C.2.b gains one field:

```
{
  title: "<behavior description>",
  covers: [1, 3],
  user: "<saucedemo user>",
  tags: ["<auth-tag>", "<user-tag-if-not-no-auth>"],
  bucket: "Positive" | "Negative" | "Edge",
  smoke: true | false   ← NEW
}
```

LLM populates `smoke` per `smoke-policy.md`. Default = `false`.

### Generated test file structure (after C.2.c)

```typescript
// [provenance block unchanged]

import { test, expect } from '@fixtures/test';
import { env } from '@utils/env';

test.describe('login (@no-auth)', () => {
  test.describe('Positive', () => {
    test('@no-auth @smoke standard_user logs in successfully and lands on inventory', ...);
    //                ^^^^^ smoke applied (core auth flow)
  });

  test.describe('Negative', () => {
    test('@no-auth @smoke locked_out_user sees the lockout error', ...);
    //                ^^^^^ smoke applied (critical auth-rejection regression)
    test('@no-auth invalid password shows generic error', ...);
    // ^ NOT smoke (secondary error path)
  });

  test.describe('Edge', () => {
    test('@no-auth username with whitespace is rejected', ...);
    // ^ NOT smoke (boundary nicety)
  });
});
```

### PR AC coverage table (after C.2.c)

```markdown
| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: ... | `⚡ @no-auth @smoke standard_user logs in...` | Positive | ✅ generated |
| AC 2: ... | `⚡ @no-auth @smoke locked_out_user sees the lockout error` | Negative | ✅ generated |
| AC 3: ... | `@no-auth invalid password shows generic error` | Negative | ✅ generated |
| AC 4: ... | `@no-auth username with whitespace is rejected` | Edge | ✅ generated |
```

The `⚡ ` prefix in the Test column visually flags smoke tests without changing the column count.

### CLAUDE.md tag conventions row (new)

```markdown
| `@smoke` | Cross-cutting (filtered via --grep) | Tests generated by /from-issue that are smoke-suite candidates. Selected by LLM judgment per `.claude/skills/from-issue/references/smoke-policy.md`. Run with `npm run test:smoke`. |
```

### `smoke-policy.md` structure

Single purpose: tell the LLM how to classify each test as smoke vs not-smoke. Contains:

- **Definition section** — what `@smoke` means in this project (build-verification, critical-path coverage, fast & stable).
- **Criteria for smoke=true** — short list with concrete signals (e.g., "core authentication flow", "checkout completion happy path", "data integrity assertion").
- **Criteria for smoke=false** — short list with concrete anti-signals (e.g., "UI nicety", "sort/filter variation", "performance assertion", "visual regression", "secondary error path").
- **Worked examples** — 3-5 examples per category showing AC text → test → smoke=true/false with rationale.
- **Default rule** — "when in doubt, NOT smoke" stated explicitly.
- **Reviewer override note** — points at the learning guide for how reviewers manually adjust smoke picks post-PR.

Estimated ~60-80 lines.

## 4. Workflow Changes (Steps 6 + 7)

### Step 6 — AC analysis (extended again)

C.2.b added `bucket` to each test record. C.2.c adds `smoke`.

**Smoke classification rule:** for each test record produced in Step 6, the LLM evaluates the test against `references/smoke-policy.md` and sets `smoke: true | false`. Default = `false` (policy's "when in doubt, NOT smoke" guidance).

**Validation before Step 7:** each test's `smoke` field must be exactly `true` or `false`. If the LLM emits any other value (e.g., a string, `null`, or an arbitrary truthy/falsy value), default that test to `false` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid smoke value "<value>" for test "<title>" — defaulted to false. Reviewer: verify classification.`

**If `references/smoke-policy.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ No inline fallback. (Same pattern as `bucket-classification.md` in C.2.b.)

### Step 7 — render test file (extended)

For each test record where `smoke: true`, prepend `@smoke ` to the title immediately after the auth-tag. Resulting title format: `'<auth-tag> @smoke [<user-tag>] <behavior>'`. Tests where `smoke: false` are unchanged from C.2.b's render output.

The nested-describe structure (Positive/Negative/Edge from C.2.b) is unchanged. Smoke tests appear alongside non-smoke tests within whatever bucket they belong to.

### No changes to Steps 1-5, 8-13

The `smoke` field flows through Step 7 into the rendered file, and through Step 12 into the PR body's AC coverage table (via the `⚡ ` marker). No other workflow step changes.

## 5. Failure Modes & Edge Cases

### Inherited from C.2.a + C.2.b, unchanged

All failure modes from C.2.a §4 and C.2.b §5 carry over identically. C.2.c does not change any abort condition.

### New for C.2.c

| Failure | Behavior |
|---|---|
| `smoke-policy.md` missing/unreadable | Abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ No inline fallback. |
| LLM emits invalid `smoke` value (not `true`/`false`) | Validation at boundary between Step 6 and Step 7: default the test to `smoke: false` and record a soft warning in the PR body's Verification section: `⚠️ LLM emitted invalid smoke value "<value>" for test "<title>" — defaulted to false. Reviewer: verify classification.` |
| Zero smoke tests selected | No failure. PR description shows zero `⚡` markers. `npm run test:smoke` (after merge) matches zero tests from this PR's file. Acceptable — some features have no critical path. |
| All tests selected as smoke | No failure. Reviewer can push back via PR comment. Acceptable but rare (policy default-NOT-smoke should prevent this in practice). |

### Edge case worth naming explicitly

**Reviewer disagreement with LLM smoke pick.** If a reviewer disagrees with which tests got `@smoke`, they edit the generated file in the same PR (add or remove `@smoke` from the test title manually). The orchestrator does not re-run on the same issue. This is the same "PR is the review gate" principle as C.2.a/b: the LLM produces a draft, humans curate.

### Two principles

1. **Validate at the boundary** (between Step 6 and Step 7) — `smoke` must be strictly `true` or `false` before rendering. Caught at the source.
2. **Default-NOT-smoke is the cap.** Without a numeric cap, the policy doc's guidance is what keeps the smoke set curated. If drift becomes systemic across PRs in practice, sharpen the policy doc or introduce a cap in C.3+.

## 6. Verifying the Skill Works

### Primary smoke test (one-time, run when C.2.c ships)

Craft a `to-be-automated` test issue with ACs spanning all three buckets AND mixing smoke-eligible vs not-smoke-eligible:

> **Feature:** login
> **Page Name:** LoginPage
> **AC 1:** Standard user logs in with valid credentials and lands on inventory page. _(Positive, **smoke** — core auth flow)_
> **AC 2:** Locked-out user sees the lockout error message. _(Negative, **smoke** — critical auth-rejection regression risk)_
> **AC 3:** Invalid password shows a generic error message. _(Negative, NOT smoke — secondary error path)_
> **AC 4:** Username with leading whitespace is rejected. _(Edge, NOT smoke — boundary nicety)_

Run `/from-issue <num>`. Expected:

1. Skill executes the 13-step workflow (step count unchanged from C.2.b).
2. LoginPage reused (collision warning surfaces, same as prior phases).
3. LLM classifies into buckets (1 Positive + 2 Negative + 1 Edge) AND tags 2 tests with `@smoke` (AC1 = standard_user login; AC2 = locked_out error).
4. Generated file:
   - `Positive` describe: `test('@no-auth @smoke standard_user logs in...')` — has `@smoke`.
   - `Negative` describe: `test('@no-auth @smoke locked_out_user sees the lockout error')` AND `test('@no-auth invalid password shows generic error')` — one with `@smoke`, one without.
   - `Edge` describe: `test('@no-auth username with whitespace is rejected')` — no `@smoke`.
5. PR body's AC coverage table shows `⚡ ` prefix on AC1's and AC2's test titles only.
6. Typecheck ✅, test run ✅ all 4 pass.
7. After merge: `npm run test:smoke` filters to exactly the 2 `@smoke` tests in this file (plus any prior smoke tests).

After verifying: close PR, delete branches, close issue (same cleanup as C.2.a/b smoke tests).

### What we deliberately do NOT test

- LLM classification accuracy at scale (single smoke pass verifies the mechanism).
- `smoke-policy.md` missing (synthetic; would require deleting the file).
- Invalid smoke value fallback (synthetic; would require mocking the LLM output).
- Retroactive application to legacy tests (we don't do this — verified by absence in the diff).
- Cap enforcement (no cap exists; nothing to test).

## 7. Deferred + Open Questions

### Explicitly deferred

| Concern | Phase |
|---|---|
| Hard numeric smoke cap (if default-NOT-smoke proves insufficient) | **C.3+** — revisit after observing real PR drift |
| Per-feature smoke budget across many issues (e.g., "don't add more smoke if feature already has N") | **C.3+** — requires cross-issue state tracking; out of scope for stateless orchestrator |
| Smoke as a CI merge-blocking gate | **Future** — project decision, not skill scope |
| Retroactive smoke tagging on legacy tests | **Out of scope permanently** — consistent with the C.2.a/b "not retroactive" principle |
| Label catalog (other labels route to other sub-skills) | **C.3** |
| Conditional sub-agent dispatch by label | **C.4** |

### Open questions (not blocking C.2.c)

1. **Smoke set drift over time.** Across many `/from-issue` runs, classification could become inconsistent — what counts as "critical" depends on the LLM's interpretation of `smoke-policy.md`. Mitigation: tighten the policy doc's negative examples whenever PR review surfaces a "this shouldn't be smoke" call. If drift becomes systemic, introduce a numeric cap in C.3.
2. **Smoke set growth.** Even with curation, the smoke set grows linearly with `/from-issue` invocations. After 50 issues, expect 20-50 smoke tests. If `npm run test:smoke` exceeds ~5min, project may need cross-issue budget logic (deferred above).
3. **`@smoke` interaction with project tags.** A test like `'@no-auth @smoke standard_user logs in...'` runs in the `no-auth` Playwright project per CLAUDE.md AND matches `--grep '@smoke'` filtering. The smoke matrix is therefore "(union of project tags) intersected with `@smoke`" by default. The smoke test in §6 will exercise this composition implicitly.
4. **Reviewer override pattern.** Documented in the learning guide: reviewer edits the file in the same PR (add/remove `@smoke` manually). Orchestrator never re-runs. If this proves common, consider a `/from-issue refine` flow in C.4.

---

## Summary

C.2.c closes the C.2 arc by adding `@smoke` tagging to `/from-issue`'s generated tests. Selection is LLM judgment per test (orthogonal to Positive/Negative/Edge bucketing from C.2.b), constrained by a new `smoke-policy.md` reference doc with default-NOT-smoke guidance. Project infrastructure (`npm run test:smoke` script + CLAUDE.md tag row) makes smoke first-class and runnable in one command. Eight files touched (1 new + 7 modified), zero changes to `src/`, `tests/`, `playwright.config.ts`, or the GitHub Issue Template.

The C.2 arc is complete after C.2.c. Next phases (C.3+) shift to label-driven sub-skill dispatch.
