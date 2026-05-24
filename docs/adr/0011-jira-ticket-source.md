# 0011 — Jira as the ticket source for /from-issue (read via the Atlassian MCP)

**Date:** 2026-05-24
**Status:** Accepted

## Context

`/from-issue` originally read GitHub Issues (the project's ticketing premise: "GitHub Issues, no Jira access"). The user created a Jira project (`SW`), and real QA orgs drive automation from Jira — so the template should too. The skill's analysis pipeline (workflow Steps 4–10) is already source-agnostic; only the fetch + write-back ends are GitHub-specific.

## Decision

Jira fully replaces GitHub Issues as the ticket source for `/from-issue` (invoked `/from-issue SW-123`). The skill READS the ticket through the **Atlassian MCP** (OAuth, no token/env vars), parses Feature + Acceptance Criteria from the ticket summary + description, and opens a PR on GitHub via `gh`. There is **no Jira write-back**: the **GitHub-for-Jira app** auto-links the PR to the ticket from the issue key in the branch name + PR title. The readiness gate (the old `to-be-automated` label check) is dropped — explicit invocation is the intent signal.

## Consequences

- The template now mirrors a real Jira-driven QA workflow.
- Zero Jira secrets in the repo or local env (MCP OAuth + app-based linking).
- A new external dependency: the Atlassian MCP must be connected, and the GitHub-for-Jira app must link this repo's org to the Jira site.
- If the app isn't connected, the PR won't appear on the ticket; fallback is a comment-back via the MCP (added only if needed).
- GitHub Issues are no longer a supported source; the GitHub issue-form template (`.github/ISSUE_TEMPLATE/to-be-automated.yml`) is retired.

## Alternatives considered

- **REST API + API token in `.env`.** Rejected: requires local secret management; the user prefers no env-var setup, and MCP OAuth is token-free.
- **Keep both GitHub Issues + Jira.** Rejected: a real org runs one system; dual support adds a source-abstraction layer and two doc sets for no real benefit.
- **Jira write-back (comment / status transition) via API.** Rejected: needs write scope + workflow config; the GitHub-for-Jira app already provides the PR↔ticket link for free.

## Relationship to ADR-0007

This **scopes**, not reverses, [ADR-0007](0007-gh-cli-not-github-mcp.md): `gh` CLI remains the choice for GitHub; the Atlassian MCP is adopted _only_ for Jira, justified by token-free OAuth and the absence of a first-class Jira CLI as ubiquitous as `gh`. ADR-0007's status is marked "scoped by ADR-0011".

## Supersedes

The implicit GitHub-Issues-as-source assumption (from the C2a from-issue skeleton design and `docs/from-issue.md`) and the `to-be-automated` label gate in `workflow.md` Step 3.

## Related

- [ADR-0010](0010-from-issue-augment-mode.md) — augment mode; the `Augmented by:` contributor tracking it defines now receives Jira issue keys instead of GitHub issue numbers.
