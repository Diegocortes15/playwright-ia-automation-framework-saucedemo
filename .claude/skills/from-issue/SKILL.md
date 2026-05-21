---
name: from-issue
description: Generate Playwright tests from a `to-be-automated`-labeled GitHub Issue, composing /scaffold-page-object when a target Page Object doesn't yet exist, and open a PR with the generated tests for review.
allowed-tools: Bash(gh:*) Bash(git:*) Bash(npx:*) Bash(rm:*) Bash(mkdir:*) Bash(ls:*) Read Glob Grep Write
---

# from-issue

Given a GitHub Issue number, this skill reads the issue (which must carry the `to-be-automated` label), analyzes its Acceptance Criteria, generates a set of Playwright tests, runs them locally, and opens a PR with a structured description. The PR is the review gate.

## How to use it

Tell Claude what you want:

> Use the from-issue skill on issue #42.

Or for experimentation (skip push/PR/issue-comment):

> Use the from-issue skill on issue #42 with dry-run.

## Workflow

The full 13-step procedural workflow is in [`references/workflow.md`](references/workflow.md). Read that file before executing the skill.

## References

- [`references/workflow.md`](references/workflow.md) — the 13-step procedural workflow
- [`references/test-template.md`](references/test-template.md) — canonical test-file template
- [`references/pr-description-template.md`](references/pr-description-template.md) — structured PR body template
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)

## Composition

This skill invokes [`/scaffold-page-object`](../scaffold-page-object/SKILL.md) (C.1) when the issue's Page Name field has no matching file in `src/pages/`.

## See also

- [`docs/from-issue.md`](../../../docs/from-issue.md) — learning guide with worked examples
- [`docs/adr/0008-custom-skills-pattern.md`](../../../docs/adr/0008-custom-skills-pattern.md) — why custom skills follow this layout
