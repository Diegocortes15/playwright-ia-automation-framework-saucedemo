# 0006 — Playwright CLI for Token-Efficient AI Application Inspection

**Date:** 2026-05-10
**Status:** Accepted

## Context

Phase B.1 delivered the static documentation layer (CLAUDE.md, architecture, ADRs, app docs). Phase C will need live application access for AI-driven test extension — discover selectors on unfamiliar pages, verify selectors before generating tests, debug flakes by inspecting live DOM.

Two Microsoft-official options exist:

- `@playwright/mcp` — exposes browser control as MCP tools the agent calls from the conversation
- `@playwright/cli` — provides ~40 CLI commands the agent invokes via Bash, plus a Claude Code skill that teaches the command surface

The official Playwright docs explicitly recommend the CLI for coding agents like Claude Code and GitHub Copilot.

## Decision

**Use `@playwright/cli` (Microsoft official) as the project's first AI browser-control tool.**

- Install as a project dev dependency (`npm install -D @playwright/cli`); version-pinned via `package-lock.json`
- Run `npx playwright-cli install --skills` once and commit the generated `.claude/skills/playwright-cli/` directory (SKILL.md + 10 reference files, ~50 KB total)
- No `.claude/settings.json` — the CLI requires no MCP server registration; skills are auto-discovered from `.claude/skills/`
- Browser auto-detected at install time (Chrome on most dev machines)

## Consequences

- Anyone cloning + `npm install` gets a working CLI without an extra setup step
- Token cost per command is much lower than the MCP equivalent — no persistent server holding state in the conversation, no full-DOM dumps every snapshot
- The committed skill content is generated; on package upgrade run `npx playwright-cli install --skills` again and commit the diff alongside the version bump
- The CLI is independent of the test runner — `npm test` uses the bundled Playwright chromium and is unaffected
- Future agent tools (GitHub MCP, Atlassian MCP) follow the project pattern: project config committed, personal config ignored

## Alternatives considered

- **`@playwright/mcp`** — rejected after hands-on trial: large MCP tool schemas and verbose accessibility trees are loaded into the model context every turn, costing tokens that the CLI's command-scoped output avoids. The original MCP attempt is preserved in git history (commits `03235d0`, `93e1993`, `3371da1`) as a learning artifact.
- **Global install of `@playwright/cli`** — rejected: less reproducible across machines, no per-project version pinning.
- **`npm run codegen` only** — rejected: codegen is a human-driven recorder; agents need live programmatic browser access. Codegen and the CLI are complementary, both documented.
