# Phase C.2.a — `/from-issue` Orchestrator Skeleton (Design Spec)

**Date:** 2026-05-18
**Status:** Draft — awaiting review
**Phase:** C.2.a (skeleton). C.2.b and C.2.c follow in later phases.

## 1. Goal & Scope

### Goal

Ship `/from-issue <issue-number>` — a Claude Code custom skill that reads a `to-be-automated`-labeled GitHub Issue, generates a _set_ of Playwright tests against the framework's Page Objects, and opens a PR with the generated tests for human review.

The skill is **fully autonomous** by default. The PR is the review gate, not an interactive checkpoint during execution.

### What this IS

- An orchestrator: it dispatches to `/scaffold-page-object` when a target Page doesn't exist, then renders test code that uses the resulting Page Object.
- LLM-driven AC analysis: it reads the issue's Acceptance Criteria, decides which are worth automating, groups them intelligently into a set of tests (one test may cover multiple ACs), and skips ACs the LLM judges low-value with a recorded rationale.
- A PR-opener: writes a structured PR description with an AC-coverage table, verification status (typecheck + test run), and any collision warnings.

### What this IS NOT

- **Not C.2.b.** No Positive / Negative / Edge bucket headers in the generated test file. Tests land in a flat structure with appropriate tag conventions. Bucketing comes in C.2.b.
- **Not C.2.c.** No `@smoke` tag is applied to any subset of generated tests. Smoke-tag selection comes in C.2.c.
- **Not a label catalog.** Only the `to-be-automated` label routes here. Label-based routing to other sub-skills is C.4.
- **Not a regenerator.** If a test file already exists at the target path, the skill refuses. Same safety as `/scaffold-page-object`.
- **Not a fix-it bot.** If typecheck or tests fail on the generated file, the PR still opens with failures loudly surfaced. The reviewer fixes; the orchestrator does not retry.

## 2. Decision Log

### Issue contract

1. **Label = `to-be-automated`.** Lowercase, kebab-case. Semantic name (signals intent) rather than mechanical (e.g., `add-test`). Future labels (e.g., `to-be-investigated`, `to-be-documented`) can follow the same pattern.

2. **GitHub Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml`.** YAML form with structured fields:
   - **Feature** (required, single-line) — used to derive the test folder (`tests/<feature>/`)
   - **Page Name** (required, single-line) — used to resolve or scaffold the target Page Object (e.g., `CartPage`)
   - **User Story** (optional, free-form multi-line)
   - **Acceptance Criteria** (required, multi-line, one AC per line)
   - **Notes** (optional, free-form multi-line)

3. **Parsing hierarchy: template fields → LLM extraction.** Structured template fields are the canonical source. The LLM normalizes free-form sections (User Story, Notes, Acceptance Criteria text) into a clean internal representation. The PR description includes a "What I understood from the issue" section so reviewers can verify the LLM read it correctly.

### Orchestrator behavior

4. **Fully autonomous.** No interactive checkpoints during execution. User invokes `/from-issue <num>` and waits for the report (URL of opened PR + summary). The PR review is where humans intervene.

5. **Adaptive multi-test generation.** The LLM reads ALL Acceptance Criteria from the issue, decides which are worth automating (skipping low-value ones based on AC text — e.g., "manual visual inspection only" → skip), and groups them into a _set_ of tests. One test may cover multiple ACs. Test count is unbounded — could be 2, could be 10, driven by what the ACs need. No 1:1 AC-to-test mapping.

6. **Conditional `/scaffold-page-object` dispatch.** The skill globs `src/pages/` for a file matching the issue's **Page Name** field. If found → reuse the existing Page Object, surface a collision warning in the PR description. If not found → call `/scaffold-page-object` to generate it, then continue with test generation.

### Output contract

7. **PR is the only review gate.** No interactive prompts. PR description carries everything reviewers need to verify the generated work.

8. **Branch naming: `from-issue/<num>-<slug>`.** Includes the issue number to prevent slug collisions across issues with similar titles. Slug is derived from the issue title.

9. **Comment back on source issue.** After PR opens, post a comment on the source issue with the PR link so the BA/reporter sees the connection.

### Tag conventions

10. **Generated tests use existing tag conventions.** The framework's existing tag taxonomy (`@no-auth`, `@all-users`, `@standard`, etc., per CLAUDE.md) applies. The LLM picks tags based on the user inferred from AC text. No new tags introduced in C.2.a. `@smoke` is reserved for C.2.c.

### AC analysis details

11. **Skip-signal = LLM judgment from AC text.** No special BA syntax (e.g., `[skip-automation]`). The LLM reads each AC and decides based on content alone. PR description records per-AC rationale for skipped ACs.

12. **Test title format = behavior-only.** The `test('...')` title is an LLM-generated description of the behavior under test (e.g., `test('login with valid credentials and lands on inventory')`). AC traceability lives in the PR description's AC-coverage table, not in the test title.

13. **Auth resolution.** The issue declares which user to test as (in AC text — e.g., "standard user can…"). If unspecified, default to `standard_user` (the most general saucedemo user). The LLM picks the appropriate storageState file (e.g., `auth/standard.json`) based on this resolution.

## 3. Architecture

### Skill file layout (per ADR-0008)

```
.claude/skills/from-issue/
├── SKILL.md                              compact frontmatter + intro + pointer
└── references/
    ├── workflow.md                       N-step procedural workflow Claude follows
    ├── test-template.md                  canonical test-file template (provenance block + imports + test structure)
    └── pr-description-template.md        PR body template (AC coverage table + verification status + collision warnings)
```

### GitHub Issue Template

```
.github/ISSUE_TEMPLATE/to-be-automated.yml
```

YAML form with the fields enumerated in Decision #2.

### Generated test location

Tests land in **`tests/<feature>/<slug>.spec.ts`** — same convention as existing tests. The `<feature>` folder is derived from the issue template's **Feature** field (snake_case). `<slug>` is derived from the issue title.

This means generated tests participate in the normal tag conventions and the `npm test` matrix from day one. No separate `tests/from-issue/` directory.

### Slug derivation rule

The same `<slug>` is used for both the test filename and the branch name (`from-issue/<num>-<slug>`), so it must be deterministic and stable:

1. Take the issue title (e.g., `"Add Cart validation for empty checkout"`).
2. Lowercase.
3. Replace any non-alphanumeric character with `-`.
4. Collapse repeated `-` and strip leading/trailing `-`.
5. Truncate to **40 characters max**, breaking on a `-` boundary if possible.

Example: `"Add Cart validation for empty checkout"` → `add-cart-validation-for-empty-checkout`. No stop-word stripping (keep meaning intact).

### Provenance comment block

Every generated test file starts with this 5-line block (rendered by `references/test-template.md`):

```ts
// Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
// Source: <issue-url>
// Title: <issue-title>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against the same issue will refuse to overwrite.
```

Mirrors the pattern established by `/scaffold-page-object` (per [`references/page-object-template.md`](../../.claude/skills/scaffold-page-object/references/page-object-template.md)) so AI-generated files are visually consistent and reviewers know what they're looking at.

### Orchestrator workflow (13 steps, high-level)

Full step bodies get written during the writing-plans phase. The structure:

1. **Validate inputs** — issue number provided; `gh` available.
2. **Fetch issue** — `gh issue view <num> --json title,body,labels,number` → structured fields.
3. **Verify `to-be-automated` label present** — refuse otherwise with a clear error.
4. **LLM normalization** — parse template fields, normalize AC text into a canonical internal representation (one AC per record, each tagged with inferred user + automation-worth decision + rationale).
5. **Resolve target Page Object** — glob `src/pages/` for a file matching the Page Name field. Existing → reuse + flag collision. Missing → dispatch `/scaffold-page-object`.
6. **Analyze ACs** — LLM groups automation-worthy ACs into a set of tests. Each test records: behavior description, covered AC IDs, inferred user/storageState, tags.
7. **Render test file** — apply `references/test-template.md`. Top-of-file provenance block per the "Provenance comment block" section above. Imports from `@fixtures/test`. Behavior-only `test('...')` titles. Per-test tags inline.
8. **Write test file** — refuse to overwrite (same safety as `/scaffold-page-object` step 3).
9. **Isolated typecheck** of the new file — same `.tsconfig.scratch.json` pattern as C.1.
10. **Run the generated tests** once — capture per-test PASS/FAIL output for the PR body.
11. **Branch + commit + push** — branch `from-issue/<num>-<slug>`.
12. **Open PR** with structured description per `references/pr-description-template.md`:
    - **What I understood** — LLM's normalized read of the issue
    - **AC coverage table** — each AC → test name OR `skipped: <rationale>`
    - **Verification** — typecheck status, per-test run status
    - **Collision warnings** — if a Page Name collision happened, name it loudly
    - **Source** — link back to the source issue
13. **Comment on source issue** with the PR link, then report to the user (PR URL, test count, skipped-AC count, collision warnings, run result).

### Dry-run flag

The skill accepts an optional `dry-run` input. When set:

- Steps 1–10 run normally (files written, tests run locally).
- Steps 11–13 are skipped (no push, no PR, no issue comment).
- The user gets the local branch + generated files to inspect manually.

Useful for trying the skill against test issues without polluting the PR queue.

## 4. Failure Modes & Error Handling

Theme: **abort early, fail loud — but if code was generated, open the PR anyway so reviewers see what broke.**

| Failure                                          | Behavior                                                                                                                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Issue number not provided                        | Refuse before fetching. Ask user.                                                                                                                                                                              |
| Issue doesn't exist / no access                  | Abort with `gh` error verbatim.                                                                                                                                                                                |
| `to-be-automated` label missing                  | Abort with: _"Issue #N is missing the `to-be-automated` label. Add the label and re-run."_ No autonomous label-adding.                                                                                         |
| Issue template not used (free-form body)         | LLM normalization step attempts best-effort parse. If it can't find any structured ACs, abort with: _"Couldn't extract ACs from issue body. Ask the reporter to refile using the `to-be-automated` template."_ |
| LLM decides 0 ACs worth automating               | Abort BEFORE writing files. Comment on issue: _"Reviewed issue but found no ACs worth automating. Reasons: [LLM per-AC rationale]. Close issue if this is correct, or refile with more concrete ACs."_ No PR.  |
| Page Name collision (file exists with same name) | Reuse existing Page Object. Surface in PR body with a warning section. Continue.                                                                                                                               |
| `/scaffold-page-object` fails                    | Abort with the subprocess error verbatim. No PR.                                                                                                                                                               |
| Test file already exists at target path          | Refuse to overwrite. Suggest `rm` and re-run. No PR.                                                                                                                                                           |
| Isolated typecheck fails                         | **Open PR anyway.** PR body marks Typecheck = ❌ with errors verbatim.                                                                                                                                         |
| Test run fails                                   | **Open PR anyway.** PR body marks per-test ❌ with failure output.                                                                                                                                             |
| `gh pr create` fails (no remote, no auth)        | Abort with `gh` error verbatim. Files already written stay on disk; branch already committed locally.                                                                                                          |
| Branch `from-issue/<num>-<slug>` already exists  | Refuse. _"Branch exists — delete it and re-run, or pick a new slug."_ No silent reuse.                                                                                                                         |

**Two principles derived from this table:**

1. **No autonomous repair of human intent.** Missing labels, free-form issues, no-automatable-ACs — these mean a human needs to fix something upstream. Don't paper over them.
2. **If code was generated, PR opens.** Failing typecheck and failing tests are review gates, not blockers. The PR-as-review model breaks if we silently delete the work on failure.

## 5. Verifying the Skill Works

### One-time smoke test (run when C.2.a ships)

Create a real GitHub Issue against this repo using the `to-be-automated` template:

> **Feature:** login
> **Page Name:** LoginPage
> **AC 1:** User can log in with `standard_user` / `secret_sauce` and lands on inventory page.
> **AC 2:** Locked-out user sees an error message.

Run `/from-issue <num>`. Expected:

1. Skill executes the 13-step workflow.
2. `LoginPage` already exists → reuse + collision warning surfaces in PR body.
3. LLM analyzes 2 ACs → generates 2 tests (happy login + locked-out error).
4. Test file lands at `tests/login/<slug>.spec.ts`.
5. Typecheck passes; test run passes.
6. PR opens with: AC coverage table (both ACs → distinct tests), verification status (both ✅), collision warning for `LoginPage`, link back to source issue.
7. Source issue receives a comment with the PR link.

After verifying: close PR, delete branch, close issue.

### Explicitly NOT tested as part of C.2.a delivery

- Each individual failure mode (too many; the workflow specifies behavior, real failures verify it).
- Multi-page scenarios (one issue = one Page Name = one file in C.2.a; multi-page coverage is implicit in the architecture and will be exercised naturally).
- Bucket structure (Positive/Negative/Edge headers) — that's C.2.b.
- `@smoke` tag application — that's C.2.c.
- Long-running or timing-sensitive scenarios.

## 6. Deferred to Later Phases + Open Questions

### Explicitly deferred

| Concern                                                                    | Phase     |
| -------------------------------------------------------------------------- | --------- |
| Positive / Negative / Edge category headers in generated test files        | **C.2.b** |
| `@smoke` tag applied to subset of generated tests                          | **C.2.c** |
| Label catalog (different labels route to different orchestrator behaviors) | **C.3**   |
| Conditional sub-agent dispatch by label                                    | **C.4**   |

### Open questions (not blocking C.2.a; capture for paper trail)

1. **Multi-page navigation tests.** Some ACs naturally span pages (login → inventory → cart). Per ADR-0001 rule #3, Pages can't return other Pages — the test itself owns navigation by injecting multiple page fixtures. The orchestrator must generate test code that does this correctly. This is a _prompt engineering_ concern for the LLM rendering step (Step 7). May surface as a quality issue in early PR reviews.

2. **Duplicate test prevention.** If the same issue gets `/from-issue` run twice (e.g., spec updated, want to regenerate), Step 8 refuses to overwrite. Reviewer must `rm` the old file first. Alternative would be diff-and-merge — explicitly out of scope for C.2.a.

3. **`gh` auth in CI vs local.** Skill assumes `gh` is authenticated locally. CI usage would need `GH_TOKEN`. Not a C.2.a blocker since this skill is primarily for local agent use; revisit if/when we want CI to invoke it.

4. **Test quality regression over time.** As the LLM's behavior shifts across model versions, generated test quality may drift. No automated guard against this in C.2.a. Mitigated by the PR review gate; future phases may add reference outputs to compare against.

5. **AC-grouping heuristic transparency.** The "how the LLM grouped ACs into tests" decision is opaque. PR description shows the _result_ (AC coverage table) but not the _reasoning_ for why AC#1 + AC#3 became one test rather than two. Acceptable for C.2.a; revisit if reviewers find the groupings consistently surprising.

---

## Summary

C.2.a delivers a fully autonomous orchestrator that turns a `to-be-automated`-labeled GitHub Issue into a PR full of generated Playwright tests, with the PR description acting as the review gate. It composes the existing `/scaffold-page-object` skill (C.1) when target Pages don't exist, generates an adaptive number of tests via LLM AC analysis, and runs typecheck + test execution locally before opening the PR. Failures during code generation abort; failures during verification still open the PR so reviewers can fix.

C.2.b (test bucketing) and C.2.c (`@smoke` tag) build on this skeleton in subsequent phases.
