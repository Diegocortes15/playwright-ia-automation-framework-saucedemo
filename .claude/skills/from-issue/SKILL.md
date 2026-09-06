---
name: from-issue
description: Generate Playwright tests from a Jira ticket (read via the Atlassian MCP), composing /scaffold-page-object when a target Page Object doesn't yet exist, and open a GitHub PR with the generated tests for review.
allowed-tools: Bash(gh:*) Bash(git:*) Bash(npx:*) Bash(rm:*) Bash(mkdir:*) Bash(ls:*) Bash(.claude/skills/from-issue/scripts/typecheck-spec.sh:*) Read Glob Grep Write mcp__atlassian__getAccessibleAtlassianResources mcp__atlassian__getJiraIssue
---

# from-issue

Given a Jira issue key (e.g. `SW-123`), this skill reads the ticket via the Atlassian MCP, normalizes its requirement in whatever form it was written (narrative, Given/When/Then, bullet ACs, prose, or mixed), generates a set of Playwright tests, runs them locally, and opens a GitHub PR with a structured description. The PR is the review gate, and the GitHub-for-Jira app auto-links it onto the ticket. See ADR-0011.

**A run never opens a red PR** (ADR-0020). If the typecheck or a test fails, the skill diagnoses and retries up to 3 times; if it still fails — or if the failure means the **app** contradicts an AC rather than the generated code being wrong — it reports what it found and opens nothing.

## How to use it

Tell Claude what you want:

> Use the from-issue skill on SW-123.

Or for experimentation (skip push/PR):

> Use the from-issue skill on SW-123 with dry-run.

Or read the ticket from a local file instead of Jira — same pipeline, no Atlassian connection needed:

> Use the from-issue skill with --from-file tickets/SW-901-inventory-cart-badge.md

Jira stays the real ticket source (ADR-0011); a file is for exercising the pipeline and for testing changes to this skill without burning a real ticket. A file-sourced run never claims a Jira URL it did not read — see `references/workflow.md` Step 2 and `tickets/README.md`.

If the ticket's feature already has a generated spec, the skill **augments** that file (adds the new tests, and adds/modifies the Page Object as needed) instead of creating a new file — see ADR-0010. Re-running any ticket that already contributed to the file refuses. To force a separate file instead of augmenting:

> Use the from-issue skill on SW-123 with --new-file.

## Workflow

The full procedural workflow is in [`references/workflow.md`](references/workflow.md). Read that file before executing the skill.

> **Setup note:** the Atlassian MCP must be connected (OAuth) for the Step 2 ticket read — defined at project scope in `.mcp.json`. Its read tools (`mcp__atlassian__getAccessibleAtlassianResources`, `mcp__atlassian__getJiraIssue`) are pre-authorized in `allowed-tools` above so reads don't prompt each run. If a future Atlassian MCP build renames those tools, update the `allowed-tools` line to match.

## References

- [`references/workflow.md`](references/workflow.md) — the procedural workflow
- [`references/test-template.md`](references/test-template.md) — canonical test-file template
- [`references/pr-description-template.md`](references/pr-description-template.md) — structured PR body template
- [`references/bucket-classification.md`](references/bucket-classification.md) — Positive/Negative/Edge bucket definitions + worked examples (C.2.b)
- [`references/smoke-policy.md`](references/smoke-policy.md) — `@smoke` selection criteria + worked examples (C.2.c)
- [`references/qa-analysis.md`](references/qa-analysis.md) — Senior QA SDET judgment: when to merge/split/skip ACs (D.1)
- [`references/test-principles.md`](references/test-principles.md) — F.I.R.S.T. principles for generated tests (D.1)
- [`references/playwright-conventions.md`](references/playwright-conventions.md) — Playwright best practices the skill follows (D.1)
- [`references/data-placement.md`](references/data-placement.md) — inline vs. externalized (`data/`) test data decision rule (D.1.4)
- [`references/harness.md`](references/harness.md) — data-driven config + autonomous harness growth (Phase H / ADR-0014)

## Scripts

- [`scripts/typecheck-spec.sh`](scripts/typecheck-spec.sh) — typechecks the files a run generated against the project's own `tsconfig.json` (path aliases included), always cleaning up its throwaway config. Resolves `tsc` from `node_modules/.bin` only. Used by workflow Step 9.

## Composition

This skill invokes `/scaffold-page-object` (C.1) when a Page Object inferred from the AC text has no matching file in `src/pages/`.

## See also

- `docs/from-issue.md` — learning guide with worked examples
- ADR-0008 — why custom skills follow this layout
- [ADR index (origin repo)](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/tree/main/docs/adr) — rationale for every `ADR-NNNN` cited above. Paths like `docs/…` and `src/…` are relative to that repo, not to this skill.
