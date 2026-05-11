# Phase B.2 — Playwright MCP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install `@playwright/mcp` (Microsoft official) as a project dev dependency, register it in `.claude/settings.json`, and document its use with a learning-focused guide so the user can verify the install with a 3-step smoke test and reuse the MCP setup pattern on future client projects.

**Architecture:** Pure config + docs phase. Adds one npm dev dependency, one Claude Code project config file (committed), one gitignore rule, three new doc files, and small additions to two existing docs. Zero changes to `playwright.config.ts`, `src/`, `tests/`, `data/`, or CI.

**Tech Stack:** Node 22 · `@playwright/mcp` (Microsoft) · Claude Code · Chromium · Markdown.

**Spec:** [`docs/superpowers/specs/2026-05-10-phase-b2-playwright-mcp-design.md`](../specs/2026-05-10-phase-b2-playwright-mcp-design.md)

---

## Pre-flight: branch + clean baseline

**Files:**

- Create branch: `phase-b2-mcp` from `main`

- [ ] **Step 1: Confirm clean working tree on main**

```
git status
```

Expected: `On branch main` and either "nothing to commit, working tree clean" or only the untracked `.claude/` directory listed (the existing `.claude/settings.local.json` is currently untracked — that's expected; Task 1 will add a gitignore rule).

If anything else is dirty: STOP and report.

- [ ] **Step 2: Confirm baseline checks pass on main**

```
npm run typecheck
npm run lint
npm run format:check
```

All three must exit 0. (Skipping `npm test` here — the test suite was verified at the end of Phase B.1; this phase doesn't change any test-affecting code.)

- [ ] **Step 3: Create the feature branch**

```
git checkout -b phase-b2-mcp
git branch --show-current
```

Expected: `phase-b2-mcp`.

- [ ] **Step 4: Confirm Phase B.1 tag is reachable**

```
git tag -l phase-b1-complete -n2
```

Expected: tag exists, message starts with "Phase B.1 complete".

If missing: STOP — Phase B.1 isn't merged.

---

## Task 1: Install package + register MCP server + gitignore rule

**Files:**

- Modify: `package.json` (add devDependency entry)
- Modify: `package-lock.json` (auto-updated by npm)
- Create: `.claude/settings.json` (committed project MCP config)
- Modify: `.gitignore` (add `.claude/settings.local.json` rule)

- [ ] **Step 1: Install `@playwright/mcp` as a dev dependency**

```
npm install -D @playwright/mcp
```

Expected: install succeeds; `package.json` and `package-lock.json` both updated. The CLI prints something like `added N packages, and audited M packages`.

- [ ] **Step 2: Verify the install**

```
npm ls @playwright/mcp
```

Expected output ends with a line like `└── @playwright/mcp@<version>` (where `<version>` is whatever npm resolved). If `(empty)`: STOP — install failed.

- [ ] **Step 3: Create `.claude/settings.json` with the EXACT content below**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.75", "--browser", "chromium"]
    }
  }
}
```

The version is pinned to `@0.0.75` to match `package.json` from Step 1. `--headless` is intentionally absent — `@playwright/mcp` defaults to headed when the flag is missing, and passing `--headless=false` is a parse error in v0.0.75.

Use the Write tool. The file does not exist yet — `.claude/` already exists locally (it contains `settings.local.json`).

- [ ] **Step 4: Add gitignore rule for the personal settings file**

Append the following lines to the end of `.gitignore` (use Edit tool):

```
# Claude Code: project config committed; per-developer settings ignored
.claude/settings.local.json
```

- [ ] **Step 5: Verify the gitignore rule works**

```
git check-ignore -v .claude/settings.local.json
```

Expected: prints something like `.gitignore:13:.claude/settings.local.json	.claude/settings.local.json` (the line number may vary). Exits 0.

```
git status
```

Expected: `.claude/settings.json` shows under untracked files; `.claude/settings.local.json` does NOT appear (now ignored); `package.json` + `package-lock.json` + `.gitignore` show as modified.

- [ ] **Step 6: Format check**

```
npm run format:check
```

If `.claude/settings.json` fails: run `npx prettier --write .claude/settings.json` and re-check. Both should exit 0 by the end.

- [ ] **Step 7: Commit**

```
git add package.json package-lock.json .claude/settings.json .gitignore
git commit -m "feat(mcp): install @playwright/mcp + register Playwright MCP server"
```

---

## Task 2: ADR-0006 — Playwright MCP

**Files:**

- Create: `docs/adr/0006-playwright-mcp.md`

- [ ] **Step 1: Create `docs/adr/0006-playwright-mcp.md` with the EXACT content below**

```markdown
# 0006 — Playwright MCP for AI Application Inspection

**Date:** 2026-05-10
**Status:** Accepted

## Context

Phase B.1 delivered the static documentation layer (CLAUDE.md, architecture, ADRs, app docs). For Phase C (AI-driven framework extension via `/from-jira` and similar workflows), Claude Code agents need a way to inspect the live application — discover selectors on unfamiliar pages, verify a selector before generating a test, debug a flaky test by reading the rendered DOM. Without that capability, Claude is limited to static reasoning and educated guessing about selectors.

Several MCP server implementations for Playwright exist. We needed to pick one, decide where to register it, and choose sensible defaults for a learning-focused template project.

## Decision

**Use `@playwright/mcp` (Microsoft official) as the project's first MCP server.**

- Install as a project dev dependency (`npm install -D @playwright/mcp`); version-pinned via `package-lock.json`
- Register in `.claude/settings.json` (project-local, committed) so the team gets MCP working after `npm install`
- Default to chromium browser, headed mode (no `--headless` flag — absence means headed on non-Linux)
- Personal Claude Code config (permissions allowlist) stays in the gitignored `.claude/settings.local.json`

## Consequences

- Anyone cloning the repo gets a working Playwright MCP after `npm install` — zero per-developer setup beyond opening a Claude Code session
- Headed mode trades speed for visibility; intentional for the template phase where the user is learning what MCP does
- The npm install adds an `@playwright/mcp` package and triggers a Playwright browser download on first MCP call (subsequent calls cache)
- CI is unaffected — CI runs `npm test`, not Claude Code sessions
- Future MCP servers (GitHub, Atlassian) follow this same pattern: project config committed, personal config ignored
- The `.claude/settings.json` file becomes the single source of truth for MCP wiring; agents extending the project must update this file when adding new servers

## Alternatives considered

- **Community MCP packages** — rejected: no clear advantage over Microsoft's official package, smaller user base, less likely to track upstream Playwright changes
- **Global install of `@playwright/mcp`** — rejected: less reproducible across machines, no per-project version pinning, breaks the "fresh clone works" property
- **User-level Claude Code config (`~/.claude/settings.json`)** — rejected: defeats the team-shared template purpose; new collaborators wouldn't get MCP without separate setup steps
- **Headless default** — rejected for this phase: less learning value when the user can't see what the browser is doing. Documented as easy to override per-session for speed
```

- [ ] **Step 2: Verify the file exists and the line count is under 80**

PowerShell:

```powershell
Test-Path docs/adr/0006-playwright-mcp.md
(Get-Content docs/adr/0006-playwright-mcp.md).Count
```

Expected: `True` then a number under 80 (target ~50).

- [ ] **Step 3: Format check**

```
npm run format:check
```

If it fails on this file: `npx prettier --write docs/adr/0006-playwright-mcp.md` then re-check.

- [ ] **Step 4: Commit**

```
git add docs/adr/0006-playwright-mcp.md
git commit -m "docs(adr): add ADR-0006 Playwright MCP for AI application inspection"
```

---

## Task 3: docs/mcp.md learning guide

**Files:**

- Create: `docs/mcp.md` (~250-300 lines, six H2 headings)

- [ ] **Step 1: Create `docs/mcp.md` with the EXACT content below**

````markdown
# Playwright MCP

This is the learning guide for using the Playwright MCP server in this project. If you're new to MCP, read sections 1 and 2 first. If you've used MCP before, jump to the worked examples in section 4.

## What is Playwright MCP

The Model Context Protocol (MCP) is a way to plug extra capabilities into AI tools like Claude Code. Each **MCP server** is a separate program exposing a set of tools the AI can call. The Playwright MCP server wraps a real Chromium browser: when Claude calls `browser_navigate(url)` or `browser_snapshot()`, the server drives the browser and returns the result back into the conversation as text.

Important distinction: **the MCP browser is for exploration; `npm test` is for verification.** They run separate browser instances and do not share state. MCP is your live-DOM inspector and selector-discovery tool — not a replacement for Playwright tests.

## How it's wired in this project

The MCP server is declared in [`.claude/settings.json`](../.claude/settings.json):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@0.0.75", "--browser", "chromium"]
    }
  }
}
```

`@playwright/mcp` is a project dev dependency declared in `package.json` and locked in `package-lock.json`. Run `npm install` once and the server is ready — no global installs.

The version is pinned to `0.0.75` in BOTH `package.json` and the args above. Keep them in sync when upgrading: `npx -y <pkg>@latest` would resolve against the npm registry at runtime and bypass the lockfile, which is dangerous at v0.0.x.

The browser defaults to **chromium, headed**. Headed mode (visible window) is intentional: this is a learning template, and you should see what the MCP is doing. The `--headless` flag is omitted — it's a boolean switch (presence sets headless=true), and absence means headed on non-Linux. To run headless for one session, modify the args temporarily.

## Verifying the setup

After `npm install`, run this 3-step smoke test to confirm everything works.

1. **Connection check.** Open a fresh Claude Code session in this repo. Type `/mcp`. Expected: a `playwright` server listed as connected.
2. **Tool availability check.** Ask: `What MCP tools do you have available from the playwright server?` Expected: a list of tools like `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`, etc. (exact tool names depend on the installed `@playwright/mcp` version).
3. **End-to-end check.** Paste: `Use the Playwright MCP to navigate to https://www.saucedemo.com and tell me the login button selector.` Expected: a Chromium window appears (headed-mode confirmation), Claude reports `[data-test="login-button"]`.

If all three pass, the install is healthy.

### Failure modes

- **`/mcp` shows the server as failed or absent.** Check Claude Code's MCP logs (Output panel → Claude Code Server). Most common cause: `npm install` was skipped after a fresh clone, so `@playwright/mcp` isn't on disk.
- **Browser window doesn't appear when MCP runs.** Confirm no `--headless` flag is in the args of `.claude/settings.json` (the flag is a boolean switch — presence sets headless=true; absence is headed by default on non-Linux). Restart the Claude Code session after editing.
- **First call is very slow (~30s+).** First MCP call triggers Playwright's browser binary download via `npx`. Subsequent calls cache; this is one-time cost.
- **`npx` can't find `@playwright/mcp`.** Run `npm install` from the repo root. The package must be present locally; it is not a global tool.

## Worked examples

The four scenarios below are the load-bearing reasons to use Playwright MCP. Each one replaces a slower, more error-prone manual workflow.

### 4.1 Discover selectors on a new page

**Goal:** survey an unfamiliar page and get a list of stable selectors for every interactive element.

**Prompt:**

> Use the Playwright MCP to navigate to https://www.saucedemo.com/cart.html (log in as standard_user via the login flow first, then navigate). List every interactive element on the page with the most stable selector you can find and a one-line description of what it does.

**What you'll see:** A Chromium window opens, MCP logs in, navigates to the cart, and Claude returns a markdown table with selectors (`[data-test="continue-shopping"]`, `[data-test="checkout"]`, etc.) and descriptions.

**Why it matters:** This is the headline use case for new client apps. Without MCP, you'd open the browser, right-click, inspect, copy a selector, test it in DevTools, paste it into a file — five context-switches per element. With MCP, it's one round-trip.

### 4.2 Verify a selector before adding it to a Page object

**Goal:** confirm a selector works before writing test code that depends on it.

**Prompt:**

> Use the Playwright MCP to verify that `[data-test="continue"]` is the right selector for the Continue button on https://www.saucedemo.com/checkout-step-one.html (log in first, add a product to cart, navigate via the cart). Confirm it's clickable and report the button's accessible name.

**What you'll see:** MCP logs in, navigates through cart → checkout, attempts to locate the selector, reports `clickable: true, name: "Continue"` (or fails loudly if the selector is wrong).

**Why it matters:** Sanity check before the test even gets written. Catches typos, stale selectors, and "wait, the button only appears after X" race conditions early — long before they show up as test failures in CI.

### 4.3 Debug a flaky test by inspecting live DOM

**Goal:** when a test fails intermittently, get the exact rendered HTML at the moment of failure.

**Prompt:**

> The test `cart add/remove (@all-users)` is flaking on the badge count assertion. Use the Playwright MCP to navigate to inventory (logged in as standard_user), add the Sauce Labs Backpack, and report the cart badge's exact rendered HTML, computed visibility state, and innerText.

**What you'll see:** MCP performs the steps, returns something like `<span data-test="shopping-cart-badge">1</span>` plus visibility metadata.

**Why it matters:** Live DOM beats screenshots in a debug log. This is the go-to when something fails in CI but passes locally — you can rule out (or confirm) a saucedemo-side intermittent rendering issue without leaving the conversation.

### 4.4 Generate a draft Page object from live exploration

**Goal:** propose a new Page object class scaffold based on what's actually on a page.

**Prompt:**

> Use the Playwright MCP to explore https://www.saucedemo.com/checkout-complete.html (log in and run through a checkout to reach this page). Propose a `CheckoutCompletePage` class following the patterns in `src/pages/checkout/CheckoutInfoPage.ts`. Show only the locator block (the `readonly` field declarations and constructor); I'll review before writing the rest.

**What you'll see:** MCP completes a checkout, examines the complete page, and returns a draft `readonly` locator block matching the framework's conventions.

**Why it matters:** This is the end-to-end "new app, new page" workflow. The "show only the locator block" boundary is intentional — it keeps Claude from over-generating action methods before you've reviewed and approved the selector choices.

## When NOT to use it

- **Routine grep / file reading.** If the question is "what's in this file?", use the file-reading tools, not MCP.
- **Test execution.** MCP doesn't replace `npm test`. Tests in `tests/` are the source of truth for "does this work in CI?"
- **Apps with real credentials or PII without thinking it through.** The MCP browser stores cookies and cached pages in `~/.cache/ms-playwright`. For sensitive apps, treat it like a real browser session and clean up after.
- **Scripted batch operations.** MCP is interactive (one round-trip per call). For "navigate to 50 URLs and screenshot each", write a Playwright script in `tests/` instead.

## Pointers

- [`docs/adr/0006-playwright-mcp.md`](adr/0006-playwright-mcp.md) — rationale for the package, config scope, and headed-mode default
- [Microsoft Playwright MCP repo](https://github.com/microsoft/playwright-mcp) — official source, tool reference, latest features
- [`CLAUDE.md`](../CLAUDE.md) `## MCP servers` section — quick reference for AI agents working in this repo
````

- [ ] **Step 2: Verify the file exists and has all six H2 headings**

PowerShell:

```powershell
Test-Path docs/mcp.md
(Get-Content docs/mcp.md | Select-String '^## ').Count
```

Expected: `True` then `6` (six H2 headings — What is / How it's wired / Verifying / Worked examples / When NOT to use / Pointers; "Failure modes" is an H3 nested under Verifying).

(If the count is 5 or 7, STOP and check — content drift from the spec.)

- [ ] **Step 3: Format check**

```
npm run format:check
```

If it fails on this file: `npx prettier --write docs/mcp.md` then re-check. Markdown tables and the JSON code block may need reformatting.

- [ ] **Step 4: Commit**

```
git add docs/mcp.md
git commit -m "docs(mcp): add Playwright MCP learning guide with worked examples"
```

---

## Task 4: CLAUDE.md MCP section + README.md tech stack

**Files:**

- Modify: `CLAUDE.md` (insert ~12-line "MCP servers" section)
- Modify: `README.md` (add `Playwright MCP` to tech stack line)

- [ ] **Step 1: Read current CLAUDE.md to find the insertion point**

Use Read tool on `CLAUDE.md`. Find the "Quick run" section (currently around lines 14-22) and the "Composition rules" section that follows it.

The insertion point is **immediately after the closing fence of the Quick run code block, before the `## Composition rules (must follow)` heading**.

- [ ] **Step 2: Insert the new MCP servers section in CLAUDE.md**

Use one Edit tool call. Anchor the swap on the closing fence of the Quick run code block AND the start of the Composition rules heading — that way the insertion point is unambiguous.

`old_string` (exactly this text — three lines: closing fence, blank line, heading):

````
```

## Composition rules (must follow)
````

`new_string`:

````
```

## MCP servers

This project ships with the Playwright MCP server registered in `.claude/settings.json`. When you need to inspect the live application — discover selectors on an unfamiliar page, verify a selector before writing a test, or debug a flaky test by reading the rendered DOM — reach for the Playwright MCP rather than guessing or asking the user.

- Tools available: `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`, etc. (full list via `/mcp` in Claude Code; tool names may differ slightly across `@playwright/mcp` versions — verify against `/mcp` output if in doubt)
- Browser is chromium, headed by default — the user can see what you're doing
- Full usage guide with worked examples: [`docs/mcp.md`](docs/mcp.md)

## Composition rules (must follow)
````

If the Edit fails because `old_string` is not unique (e.g., another `## ` heading immediately follows another closing fence somewhere in CLAUDE.md): widen `old_string` to include the last line of the Quick run code block (`npm run test:ui          # Playwright UI mode`) so the anchor becomes unique.

- [ ] **Step 3: Verify CLAUDE.md still under 150 lines**

PowerShell:

```powershell
(Get-Content CLAUDE.md).Count
```

Expected: number between 100 and 115 (was 98; +9 lines for the new section). Must be under 150.

If over 150: STOP — the section grew beyond design.

- [ ] **Step 4: Read current README.md tech-stack line**

Use Read tool on `README.md`. The tech-stack line is currently the last line of the file (around line 76):

```
Node 22 · Playwright 1.59 · TypeScript 5.9 (strict) · ESLint v9 flat config + `eslint-plugin-playwright` · Prettier 3 · GitHub Actions.
```

- [ ] **Step 5: Update the README.md tech stack line**

Use Edit tool.

`old_string`:

```
Node 22 · Playwright 1.59 · TypeScript 5.9 (strict) · ESLint v9 flat config + `eslint-plugin-playwright` · Prettier 3 · GitHub Actions.
```

`new_string`:

```
Node 22 · Playwright 1.59 · TypeScript 5.9 (strict) · ESLint v9 flat config + `eslint-plugin-playwright` · Prettier 3 · GitHub Actions · Playwright MCP (see [`docs/mcp.md`](docs/mcp.md)).
```

- [ ] **Step 6: Format check + lint**

```
npm run format:check
npm run lint
```

Both must exit 0. If format fails: `npm run format` then re-check.

- [ ] **Step 7: Commit**

```
git add CLAUDE.md README.md
git commit -m "docs: add MCP servers section to CLAUDE.md and Playwright MCP to README tech stack"
```

---

## Task 5: User-driven smoke test + tool name corrections

**Files:**

- Possibly modify: `CLAUDE.md` (only if actual MCP tool names differ from the illustrative ones)

This task **cannot be executed by an automated subagent.** A subagent runs in a different process and does not share Claude Code's MCP session. The user (or a controller agent that has Claude Code MCP access) must run the smoke test manually.

- [ ] **Step 1: User opens a fresh Claude Code session in the project directory**

Close any existing Claude Code session in this repo. Open a new one (the new `.claude/settings.json` is loaded at session start).

- [ ] **Step 2: Run the connection check**

In the new session, type:

```
/mcp
```

Expected: a `playwright` server listed as connected. The user may be prompted to authorize the new MCP server on first run — accept.

If `playwright` shows as failed: open Output panel → Claude Code Server → check logs. Common cause: `npm install` not yet run, or the args in `.claude/settings.json` are malformed.

- [ ] **Step 3: Run the tool availability check**

Type:

```
What MCP tools do you have available from the playwright server?
```

Expected: Claude lists tools (e.g., `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`, `browser_press_key`, etc.).

**Record the actual tool names returned.** They will be used in Step 5.

- [ ] **Step 4: Run the end-to-end check**

Type:

```
Use the Playwright MCP to navigate to https://www.saucedemo.com and tell me the login button selector.
```

Expected:

- A Chromium window appears (headed-mode confirmation)
- Claude reports `[data-test="login-button"]` (or an equivalent stable selector if MCP suggests `getByRole(...)` instead)

If the window doesn't appear: an unexpected `--headless` flag is present in the args — verify `.claude/settings.json` has no `--headless` and restart the session.

If the selector returned is wrong: STOP and investigate (saucedemo's selectors are stable; this would indicate an MCP issue).

- [ ] **Step 5: Compare actual tool names against CLAUDE.md illustrative names**

CLAUDE.md currently lists illustrative tool names: `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`.

Compare against the names recorded in Step 3.

**If they match exactly:** skip to Step 6. No CLAUDE.md change needed.

**If they differ** (e.g., the actual names are `playwright_navigate` or `browser.navigate`): use Edit on CLAUDE.md to swap the illustrative list for the real names. Keep the "etc. (full list via `/mcp` in Claude Code...)" qualifier.

- [ ] **Step 6: Commit any tool-name corrections**

If Step 5 made changes:

```
git add CLAUDE.md
git commit -m "docs(claude): correct illustrative MCP tool names to match @playwright/mcp output"
```

If Step 5 made no changes: no commit. Move to Task 6.

- [ ] **Step 7: Document the smoke-test result for the DoD**

Record (in your status report when handing back to the controller):

- `/mcp` showed `playwright` as: connected | failed
- Tool names returned: `<list>`
- End-to-end prompt returned: `<the selector Claude reported>`
- Visible Chromium window appeared: yes | no

This is the evidence the DoD smoke-test criterion (Task 6 / DoD #4) is satisfied.

---

## Task 6: Final Definition-of-Done verification + tag

**Files:** None modified. Verification only, then annotated tag.

- [ ] **Step 1: Confirm all 3 new files exist**

PowerShell:

```powershell
$expected = @(
  '.claude/settings.json',
  'docs/mcp.md',
  'docs/adr/0006-playwright-mcp.md'
)
$missing = $expected | Where-Object { -not (Test-Path $_) }
if ($missing) { Write-Host "MISSING:"; $missing } else { Write-Host "All 3 new files present." }
```

Expected: `All 3 new files present.`

- [ ] **Step 2: Confirm `@playwright/mcp` is installed and locked**

```
npm ls @playwright/mcp
```

Expected: returns a single line like `└── @playwright/mcp@<version>`.

- [ ] **Step 3: Confirm `.gitignore` has the rule and `.claude/settings.local.json` is ignored**

```
git check-ignore -v .claude/settings.local.json
```

Expected: exits 0 and prints the gitignore rule line.

- [ ] **Step 4: Confirm `.claude/settings.json` is tracked by git**

```
git ls-files .claude/settings.json
```

Expected: prints `.claude/settings.json`. (Empty output = file is not tracked.)

- [ ] **Step 5: Confirm CLAUDE.md is under 150 lines AND has the new "MCP servers" section**

PowerShell:

```powershell
(Get-Content CLAUDE.md).Count
Get-Content CLAUDE.md | Select-String '^## MCP servers'
```

Expected: a number under 150, then a single match line for the heading.

- [ ] **Step 6: Confirm README.md mentions Playwright MCP**

PowerShell:

```powershell
Get-Content README.md | Select-String 'Playwright MCP'
```

Expected: at least one match (the tech-stack line).

- [ ] **Step 7: Confirm ADR-0006 has the four Nygard sections**

PowerShell:

```powershell
Get-Content docs/adr/0006-playwright-mcp.md | Select-String '^## (Context|Decision|Consequences|Alternatives considered)'
```

Expected: 4 matches.

- [ ] **Step 8: Confirm docs/mcp.md has the expected H2 headings**

PowerShell:

```powershell
(Get-Content docs/mcp.md | Select-String '^## ').Count
```

Expected: 6 (What is / How it's wired / Verifying / Worked examples / When NOT to use / Pointers).

- [ ] **Step 9: Confirm typecheck + lint + format + tests all green**

```
npm run typecheck
npm run lint
npm run format:check
npm test
```

All exit 0. `npm test` produces **exactly 62 passing test instances** (this phase adds zero tests).

If `npm test` shows fewer or more than 62: STOP — a doc/config-only phase shouldn't change the test count.

- [ ] **Step 10: Confirm the smoke test passed (from Task 5 Step 7 evidence)**

Re-read the smoke-test result recorded in Task 5 Step 7. All four checks must be positive:

- `/mcp` connection: connected
- Tool names: returned a non-empty list
- End-to-end selector: `[data-test="login-button"]` or equivalent
- Visible Chromium window: yes

If any are missing: revisit Task 5 before tagging.

- [ ] **Step 11: Tag the milestone**

```
git tag -a phase-b2-complete -m "Phase B.2 complete: Playwright MCP installed, registered, documented"
git tag -l phase-b2-complete -n5
```

Expected: tag exists with the message above. Don't push the tag — the controller will handle that during finishing-a-development-branch.

---

## Self-review notes (already applied)

The plan was reviewed against the Phase B.2 spec before writing. Coverage check:

| Spec section                              | Tasks                                                                   |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| §1 overview / scope                       | All tasks scoped to Playwright MCP only; no GitHub/Atlassian touched    |
| §2 decision log (10 decisions)            | Tasks 1-4 implement each decision exactly                               |
| §3a-b (package install + settings.json)   | Task 1                                                                  |
| §3c (.gitignore rule)                     | Task 1                                                                  |
| §3d-e (docs/mcp.md structure + examples)  | Task 3                                                                  |
| §3f (ADR-0006)                            | Task 2                                                                  |
| §3g (CLAUDE.md MCP section)               | Task 4                                                                  |
| §3h (README.md tech stack)                | Task 4                                                                  |
| §4 verification (3-step smoke test)       | Task 5 (manual) + Task 6 Step 10 (DoD evidence check)                   |
| §5 acceptance criteria (10 DoD items)     | Task 6 Steps 1-10 verify each                                           |
| §6 file deliverables (3 new + 5 modified) | All accounted for: Task 1 (5 files), Task 2 (1), Task 3 (1), Task 4 (2) |
| §7 out of scope                           | Plan contains no GitHub MCP, no Atlassian MCP, no skills, no hooks      |

**Source content provenance:**

- `docs/adr/0006-playwright-mcp.md`: Phase B.2 spec §2 + §3a-c + §3f
- `docs/mcp.md`: Phase B.2 spec §3d-e (six H2 headings, four worked examples) + spec §4 (verification steps as section 3 of the doc) + a "Failure modes" section adapted from spec §4b
- `CLAUDE.md` MCP section: Phase B.2 spec §3g
- `README.md` tech-stack line: Phase B.2 spec §3h

**Type/path consistency check:**

- `.claude/settings.json` referenced consistently across CLAUDE.md, docs/mcp.md, ADR-0006
- `@playwright/mcp` package name spelled consistently
- The pinned version `@playwright/mcp@0.0.75` and the absence of any `--headless` flag are spelled the same way in `.claude/settings.json`, ADR-0006, and docs/mcp.md (the package version in `package.json` matches the version pin in args)
- The illustrative tool names (`browser_navigate`, etc.) are flagged as illustrative in CLAUDE.md and verified against actual output in Task 5
- The 62-passing-tests target matches Phase B.1's tag state and is verified in Task 6 Step 9
