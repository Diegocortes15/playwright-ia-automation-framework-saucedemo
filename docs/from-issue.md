# from-issue — Learning Guide

The `/from-issue` skill turns a labeled GitHub Issue into a PR full of generated Playwright tests. This is the learning guide; for the procedural workflow Claude follows, see [`.claude/skills/from-issue/references/workflow.md`](../.claude/skills/from-issue/references/workflow.md).

## What is `/from-issue`

It's a Claude Code custom skill that takes:

- A GitHub Issue number (e.g., `42`) that carries the `to-be-automated` label
- Optional: a `dry-run` flag to skip push/PR/issue-comment for experimentation

…and produces:

- A new test file at `tests/<feature>/<slug>.spec.ts`
- A new branch `from-issue/<num>-<slug>`
- A PR with a structured description (What I understood / AC coverage table / Verification / Collision warnings / Source link)
- A comment on the source issue with the PR link

The skill is **fully autonomous** by default. The PR is the review gate — no interactive checkpoints during execution.

**Test bucketing (since C.2.b):** Generated tests are grouped into up to three nested describe blocks — `Positive`, `Negative`, `Edge` — based on the LLM's classification of each test (rules in [`.claude/skills/from-issue/references/bucket-classification.md`](../.claude/skills/from-issue/references/bucket-classification.md)). Empty buckets are omitted. The PR description's AC coverage table includes a `Bucket` column so reviewers see the classification at a glance.

Distinction from `/scaffold-page-object`: **`/from-issue` is the orchestrator** that generates tests. When the issue's Page Name field references a Page that doesn't yet exist in `src/pages/`, `/from-issue` invokes `/scaffold-page-object` to create it first, then generates tests against the resulting Page Object.

## How it's wired in this project

- Skill files at `.claude/skills/from-issue/`
  - `SKILL.md` — frontmatter + intro + pointer (always loaded for skill discovery)
  - `references/workflow.md` — the 13-step procedural workflow (loaded when skill runs)
  - `references/test-template.md` — canonical test file template
  - `references/pr-description-template.md` — structured PR body template
- GitHub Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml` — the form BAs/reporters fill out
- Generated tests land at `tests/<feature>/<slug>.spec.ts` (feature folder snake_case from the form; slug derived from the issue title — see workflow Step 8 for the rule)
- Branch naming `from-issue/<num>-<slug>` includes the issue number to prevent slug collisions across issues

## Verifying the setup

After the skill is installed, run this 3-step smoke test in a fresh Claude Code session.

### Step 1 — Skill discoverable

Open Claude Code in this repo. Type `/skills`. Expected: `from-issue` is listed alongside `playwright-cli` and `scaffold-page-object`.

### Step 2 — Issue template usable

Open the repo on github.com → click "New issue". Expected: "To Be Automated" appears as a template option. Click it; the form renders with five fields (Feature, Page Name, User Story, Acceptance Criteria, Notes) and `to-be-automated` pre-applied as a label.

### Step 3 — End-to-end run against a real issue

Create a real test issue using the template:

> **Feature:** login
> **Page Name:** LoginPage
> **AC 1:** User can log in with `standard_user` / `secret_sauce` and lands on inventory page.
> **AC 2:** Locked-out user sees an error message.

Note the issue number (e.g., `#42`). In Claude Code:

> Use the from-issue skill on issue #42.

Expected:

- Skill executes the 13-step workflow
- `LoginPage` already exists → reuse + collision warning surfaces in the PR body
- LLM analyzes 2 ACs → generates 2 tests
- Test file lands at `tests/login/<slug>.spec.ts`
- Isolated typecheck PASS
- Test run PASS (both tests)
- PR opens with the structured description (AC coverage table both ✅, collision warning for LoginPage)
- Source issue receives a comment with the PR link

After verifying: close the PR, delete the branch, close the issue.

## Worked examples

### Generate tests for an existing page

Use this when the Page Object already exists in `src/pages/`.

> Use the from-issue skill on issue #57.

Result: skill detects the existing Page Object, reuses it, surfaces a collision warning in the PR body so reviewers can confirm the existing Page Object exposes the methods the new tests rely on.

### Generate tests AND scaffold a new page

Use this when the issue's Page Name field references a Page that doesn't yet exist.

> Use the from-issue skill on issue #58.

Result: skill invokes `/scaffold-page-object` to create the new Page Object first, then generates tests against it. The PR includes BOTH the new `src/pages/<Name>.ts` file AND the new test file.

### Experiment before committing (dry-run)

Use this to see what the skill produces without pushing or opening a PR.

> Use the from-issue skill on issue #42 with dry-run.

Result: local branch + test file + (if applicable) new Page Object are written. Steps 11–13 (push, PR, issue comment) are skipped. Inspect the files locally; `git checkout main && git branch -D from-issue/42-<slug>` to discard.

### Inspect a generated file's comment block

Open any file the skill produced. The first ~5 lines must be:

```ts
// Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
// Source: <issue-url>
// Title: <issue-title>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against the same issue will refuse to overwrite.
```

This block is mandatory per the skill's output template ([`.claude/skills/from-issue/references/test-template.md`](../.claude/skills/from-issue/references/test-template.md)). Future PR reviewers reading the file will know it was AI-generated, where the source issue is, and that edits are expected.

### Inspect the bucket structure (C.2.b)

A generated file with mixed Positive + Negative tests looks like:

```ts
test.describe('login (@no-auth)', () => {
  test.describe('Positive', () => {
    test('@no-auth standard_user logs in successfully and lands on inventory', async ({
      loginPage,
      page,
    }) => {
      /* ... */
    });
  });

  test.describe('Negative', () => {
    test('@no-auth locked_out_user sees the lockout error', async ({ loginPage }) => {
      /* ... */
    });
  });
  // Edge describe omitted — no edge tests for this issue.
});
```

Bucket order is fixed (`Positive → Negative → Edge`). Empty buckets are omitted entirely (no empty describes left in the file). Reviewers can also see the per-test bucket in the PR body's AC coverage table (4-column: `AC | Test | Bucket | Status`).

## When NOT to use it

- **Issues without the `to-be-automated` label.** The skill refuses by design. Add the label first.
- **Free-form issues that don't follow the template.** The LLM attempts best-effort parsing but aborts if it can't find structured ACs. Ask the reporter to refile using the template.
- **Regenerating tests over an existing test file.** The skill refuses to overwrite — `rm` the existing file and re-run.
- **Production credential pages.** The skill picks up storageState files that include real sessions; treat them with the same care as a real browser session.
- **Multi-page test bucketing (Positive / Negative / Edge headers).** That's Phase C.2.b.
- **`@smoke` tag application.** That's Phase C.2.c.

## Pointers

- [ADR-0008](adr/0008-custom-skills-pattern.md) — custom skills pattern, why files are laid out this way
- [`from-issue` SKILL.md](../.claude/skills/from-issue/SKILL.md) — the skill itself
- [`references/workflow.md`](../.claude/skills/from-issue/references/workflow.md) — the 13-step procedural workflow
- [`docs/scaffold-page-object.md`](scaffold-page-object.md) — the C.1 skill this orchestrator composes
