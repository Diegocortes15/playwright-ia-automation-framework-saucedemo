# 0007 — gh CLI for GitHub Operations (No GitHub MCP)

**Date:** 2026-05-15
**Status:** Accepted

## Context

Phase B.2's spec §7 originally listed a "future mini-phase B.3" to install a GitHub MCP server, on the assumption that the Phase C `/from-issue` orchestrator would need MCP-style structured access to GitHub for reading issues, creating PRs, and posting comments.

After Phase B.2 completed (`@playwright/mcp` → `@playwright/cli` pivot — see ADR-0006), the same evaluation applied to the GitHub side: install an MCP server, or use the `gh` CLI directly?

The user already has `gh` installed and authenticated (used implicitly throughout Phase A.5 and Phase B). The Phase C orchestrator runs inside a Claude Code session; agents can invoke Bash commands without per-call approval when wrapped in a skill (same pattern as `@playwright/cli`).

## Decision

**Use the `gh` CLI directly. Do not install a GitHub MCP server.**

When Phase C's `/from-issue` orchestrator needs GitHub access, it invokes `gh` commands via Bash:

- `gh issue view <num>` to read a ticket
- `gh issue list --state open` to enumerate work
- `gh pr create` to open a pull request
- `gh pr comment <num> --body "..."` to post review responses
- `gh api repos/...` for arbitrary REST calls not covered by first-class commands

No additional npm package, no MCP server registration, no PAT in the repo or CI secrets.

## Consequences

- Zero project setup — `gh auth login` is a one-time per-developer step, not per-project
- Token-efficient by the same logic as `@playwright/cli` over `@playwright/mcp` — focused command output, no persistent MCP server schema in context every turn
- Authentication uses the developer's existing GitHub OAuth credentials; no PATs to manage
- Phase C orchestrator code is portable — `gh` is preinstalled on GitHub Actions runners, so the same code runs locally and in CI without changes
- The previously planned "Phase B.3 mini-phase for GitHub MCP" is cancelled; this ADR documents that decision so future-you doesn't re-litigate it
- If a future use case truly needs MCP-style streaming or tool-advertisement features (e.g., a long-running watcher for new issues), the decision can be revisited via a superseding ADR

## Alternatives considered

- **GitHub MCP server** — rejected: `gh` CLI is already installed and authenticated, more token-efficient. Same rationale as ADR-0006 (CLI over MCP for coding agents). MCP would be redundant.
- **Direct REST calls via `curl` + a PAT** — rejected: PAT management adds setup overhead, and `gh api` already wraps this with proper auth.
- **Octokit (npm `@octokit/rest`)** — rejected: only useful if we needed JS-level GitHub integration in test code, which we don't.
