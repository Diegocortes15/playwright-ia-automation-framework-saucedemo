# Phase B.2 — Playwright MCP Setup (Design)

**Date:** 2026-05-10
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Scope:** Phase B.2 only — install and document the Playwright MCP server. GitHub MCP and Atlassian MCP are deferred to their own future mini-phases.

---

## 1. Overview

### Goal

Install the official Microsoft Playwright MCP server, register it in this project's Claude Code config, and document its use with a learning-focused guide. By end of phase, opening a fresh Claude Code session in this repo and asking Claude to "navigate to the saucedemo cart page and tell me the cart-list selector" produces a visible Chromium window and a correct selector reply.

### Why this exists

Phase B.1 delivered the static documentation layer (rules, conventions, ADRs). Phase B.2 delivers the first piece of **dynamic** AI capability: a tool Claude can use to inspect the application live. This is the bridge between docs-only context (Phase B.1) and AI-driven framework extension (Phase C).

The longer-term framing: this saucedemo project is a **template** for future client engagements. The MCP setup pattern learned here is the same pattern the user will apply when joining a new app under deadline pressure. The recipe — minimal framework scaffold first, then Playwright MCP for selector discovery — is documented as part of `docs/mcp.md`.

### Why JUST Playwright MCP

The brainstorming established a general rule: **add MCP servers right before the consuming phase needs them.** GitHub MCP and Atlassian MCP have no consumer yet (the `/from-jira` orchestrator is Phase C). Playwright MCP has an immediate consumer: the user, learning to use it on a forgiving template app. Adding GitHub/Atlassian now would be premature config and YAGNI.

### What this is NOT

- Not GitHub MCP, Atlassian MCP, or any other server — those land in their own mini-phases
- Not Claude Code custom skills (`.claude/skills/discover-selectors.md` etc.) — Phase C
- Not the `/from-jira` orchestrator — Phase C
- Not auto-running MCP in CI / pre-commit hooks — Phase D
- Not changes to `playwright.config.ts`, `src/`, `tests/`, or `data/`

---

## 2. Decision log

| #   | Decision                                                                | Rationale                                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **MCP package: `@playwright/mcp` (Microsoft official)**                 | Canonical, well-maintained, most-documented option. Other community packages exist but offer no clear advantage for this use case.                                                                                                      |
| 2   | **Install as project dev dependency, not global**                       | Version-pinned in `package-lock.json`, reproducible across machines and CI, no per-developer global install step.                                                                                                                       |
| 3   | **Register in project-local `.claude/settings.json` (committed)**       | Anyone cloning the repo gets MCP for free. Personal permission allowlists stay in the gitignored `.claude/settings.local.json`.                                                                                                         |
| 4   | **Default to headed mode (no `--headless` flag)**                       | Learning template — the user benefits from watching the browser do things. The `--headless` flag in `@playwright/mcp` is a boolean switch with no value; absence means headed on non-Linux. Override per-session for speed when needed. |
| 5   | **Default browser: chromium**                                           | Matches the framework's primary engine, fastest of the three, best DevTools-style output.                                                                                                                                               |
| 6   | **Add `.claude/settings.local.json` to `.gitignore`**                   | Establishes the project-vs-personal pattern explicitly so future MCP servers and per-developer overrides land in the right file.                                                                                                        |
| 7   | **`docs/mcp.md` is a learning guide, not a reference manual**           | Goal is muscle-memory transfer to the next client engagement, not exhaustive coverage of the `@playwright/mcp` API surface.                                                                                                             |
| 8   | **CLAUDE.md gets a brief MCP section (~10 lines)**                      | Always-loaded — Claude needs to know the tool exists to reach for it proactively. Keeps total CLAUDE.md under the 150-line cap.                                                                                                         |
| 9   | **Smoke test is manual + documented, not automated**                    | MCP only runs inside a Claude Code conversation; there's no harness to execute it from. A repeatable manual recipe in `docs/mcp.md` is the right artifact.                                                                              |
| 10  | **No changes to `playwright.config.ts`, `src/`, `tests/`, `data/`, CI** | The MCP browser is independent of the test browser. This phase is config + docs only.                                                                                                                                                   |

---

## 3. Architecture

### 3a. Package install

```bash
npm install -D @playwright/mcp
```

Adds one line to `package.json` devDependencies and updates `package-lock.json`. No new npm scripts — MCP is invoked from Claude Code conversations, not from the CLI.

### 3b. `.claude/settings.json` (new, committed)

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

The `-y` flag skips the npx confirmation prompt. The version is pinned to `@0.0.75` to match `package.json` — `npx -y <pkg>@latest` would resolve against the npm registry at runtime and bypass `package-lock.json`, which is dangerous at v0.0.x where breaking CLI changes ship between minor patches. When the team intentionally upgrades, both `package.json` and `.claude/settings.json` get bumped in the same commit. Headed mode is the default behavior of `@playwright/mcp` on non-Linux when `--headless` is absent — no flag is needed.

### 3c. `.gitignore` (modified)

Add a new section at the bottom:

```
# Claude Code: project config committed; per-developer settings ignored
.claude/settings.local.json
```

The existing `.claude/settings.local.json` (currently 2 permission entries) stays in place locally and stops appearing as untracked.

### 3d. `docs/mcp.md` (new) — six headings

| H2 heading                        | Approx. words | Purpose                                                                                 |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| 1. What is Playwright MCP         | 80            | Plain-language definition; one-line distinction between MCP browser and the test runner |
| 2. How it's wired in this project | 50            | Pointer to `.claude/settings.json`, the npm dev dep, the headed default                 |
| 3. Verifying the setup            | 30            | The 3-step smoke test (see §4)                                                          |
| 4. Worked examples                | 600           | Four scenarios, ~150 words each (see §3e)                                               |
| 5. When NOT to use it             | 80            | Honest list of anti-patterns                                                            |
| 6. Pointers                       | 30            | Links to ADR-0006, official Microsoft docs, CLAUDE.md MCP section                       |

Estimated total: ~250-300 lines of markdown. Larger than `docs/architecture.md` sections but justified — this is the artifact whose whole purpose is teaching.

### 3e. `docs/mcp.md` worked examples (heading 4)

Each example has a one-line goal, a copy-paste prompt, expected behavior, and a brief reflection note.

| #   | Scenario                                                                                                                                                                                                                                                                    | Why it matters                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **Discover selectors on a new page** — "Navigate to `/cart.html` (logged in as standard_user), list every interactive element with the most stable selector and a one-line description"                                                                                     | The headline use case for new client apps. Replaces 5 manual context-switches per element with one round-trip.                                |
| 4.2 | **Verify a selector before adding it to a Page object** — "Verify that `[data-test=\"continue\"]` is the right selector for the Continue button on `/checkout-step-one.html` and that it's clickable"                                                                       | Sanity check before the test even gets written. Catches typos, stale selectors, race conditions early.                                        |
| 4.3 | **Debug a flaky test by inspecting live DOM** — "The test `cart add/remove (@all-users)` is flaking on the badge count. Navigate to inventory, add a product, and tell me the cart badge's exact rendered HTML and computed visibility state"                               | Live DOM beats screenshots in a debug log. The go-to when something fails in CI but passes locally.                                           |
| 4.4 | **Generate a draft Page object from live exploration** — "Explore the `/checkout-complete.html` page and propose a CheckoutCompletePage class following the patterns in `src/pages/checkout/CheckoutInfoPage.ts`. Show only the locator block; I'll review before writing." | The end-to-end "new app, new page" workflow. The "show only the locator block" boundary keeps Claude from over-generating before user review. |

### 3f. `docs/adr/0006-playwright-mcp.md` (new)

Standard Nygard format. Under 80 lines.

- **Context:** Phase B.1 delivered static docs; Phase C will need live application access for AI-driven test extension. We need a tool Claude can use to inspect the running application, discover selectors, and verify behavior — without leaving the conversation.
- **Decision:** Adopt `@playwright/mcp` (Microsoft official) as the project's first MCP server. Register in committed `.claude/settings.json`; default to headed mode for learning; chromium browser to match the framework primary.
- **Consequences:** Anyone who clones the repo gets MCP working after `npm install`. Headed mode trades speed for visibility (intentional for the template phase). The npm install adds ~50MB and a Playwright browser download on first run. CI is unaffected (CI doesn't open Claude Code sessions). Future MCP servers (GitHub, Atlassian) follow this same pattern: project config committed, personal config ignored.
- **Alternatives considered:** Community MCP packages (no clear advantage); global install (less reproducible); user-level config (defeats team-shared template purpose); headless default (less learning value).

### 3g. `CLAUDE.md` (modified) — new "MCP servers" section

Insert after the existing "Quick run" section (between lines 21 and 24 of the current file). Approximately 10 lines:

```markdown
## MCP servers

This project ships with the Playwright MCP server registered in `.claude/settings.json`. When you need to inspect the live application — discover selectors on an unfamiliar page, verify a selector before writing a test, or debug a flaky test by reading the rendered DOM — reach for the Playwright MCP rather than guessing or asking the user.

- Tools available: `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`, etc. (full list via `/mcp` in Claude Code)
- Browser is chromium, headed by default — the user can see what you're doing
- Full usage guide with worked examples: [`docs/mcp.md`](docs/mcp.md)
```

The tool names above are illustrative. The implementer must run the smoke test (§4a step 2) and substitute the actual tool names returned by the live `playwright` server — `@playwright/mcp` may name them differently across versions (`playwright_navigate` vs `browser_navigate` vs `browser.navigate`).

Total CLAUDE.md will go from 98 → ~108 lines (well under the 150 cap).

### 3h. `README.md` (modified) — tech stack one-liner

Add `Playwright MCP` to the existing tech-stack line at the bottom of the file. Single-line change.

### 3i. What stays the same

- Every file under `src/`, `tests/`, `data/`, `auth/`
- `playwright.config.ts`
- `eslint.config.js`, `.prettierrc.json`, `tsconfig.json`
- `.github/workflows/test.yml`
- All Phase B.1 docs (`docs/architecture.md`, `docs/app/*`, `docs/adr/0001..0005`, placeholders)

---

## 4. Verification

There is no automated test for "MCP works correctly" because the MCP only runs inside a Claude Code conversation. Verification is a documented manual smoke test that anyone (the user, a teammate, future-self) can repeat.

### 4a. The smoke test, three steps

1. **Fresh session check.** Close any open Claude Code session in this repo. Open a new one. Type `/mcp`. Expected: a `playwright` server listed as connected.
2. **Tool availability check.** In the same session, ask: `What MCP tools do you have available from the playwright server?` Expected: Claude lists tools like `browser_navigate`, `browser_click`, `browser_snapshot`, `browser_type`, etc.
3. **End-to-end check.** Paste the headline prompt: `Use the Playwright MCP to navigate to https://www.saucedemo.com and tell me the login button selector.` Expected: a Chromium window appears (headed mode confirmation), Claude reports `[data-test="login-button"]`.

If all three pass, the install is healthy. The smoke test lives at `docs/mcp.md` heading 3 and is part of the DoD.

### 4b. Failure modes documented in `docs/mcp.md`

- `npx` can't find `@playwright/mcp` → `npm install` was skipped
- Browser doesn't appear → confirm no `--headless` flag is in the args of `.claude/settings.json` (presence sets headless=true; absence is headed by default)
- `/mcp` shows server as failed → look at Claude Code's MCP logs (Output panel → Claude Code Server)
- Tools work but very slow → first MCP call triggers Playwright's browser binary download via `npx`; subsequent calls cache

### 4c. What we cannot verify automatically

- That the docs read clearly to a future reader (humans-only review)
- That the worked examples actually return useful results (you'll find out the first time you use them in anger)
- That a teammate can clone the repo and get MCP working in <5 min (proxy: pass smoke test on a clean machine)

---

## 5. Acceptance criteria (Phase B.2 Definition of Done)

| #   | Criterion                                                                                                                                                                                                               | How to verify                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | `@playwright/mcp` is in `package.json` devDependencies and locked in `package-lock.json`                                                                                                                                | `npm ls @playwright/mcp` returns a version                                             |
| 2   | `.claude/settings.json` exists, is committed, and declares the `playwright` MCP server with args `["-y", "@playwright/mcp@0.0.75", "--browser", "chromium"]` (version pinned, no `--headless` flag — headed by default) | File diff + `git ls-files .claude/settings.json` returns the path                      |
| 3   | `.claude/settings.local.json` is gitignored                                                                                                                                                                             | `.gitignore` contains the rule; `git check-ignore .claude/settings.local.json` exits 0 |
| 4   | Smoke test passes: `/mcp` shows `playwright` connected; the headline prompt opens a visible Chromium window and returns `[data-test="login-button"]`                                                                    | Manual run, documented in `docs/mcp.md` heading 3                                      |
| 5   | `docs/mcp.md` exists with all 6 H2 headings (What is / How wired / Verifying / 4 worked examples / When NOT to use / Pointers)                                                                                          | File exists; section grep finds all 6 H2 headings                                      |
| 6   | `docs/adr/0006-playwright-mcp.md` exists, follows Nygard format (Context/Decision/Consequences/Alternatives), under 80 lines                                                                                            | File exists; line count check; section grep finds all 4 ADR headings                   |
| 7   | `CLAUDE.md` has a new "MCP servers" section (~10 lines) telling Claude the Playwright MCP is available + when to reach for it; total CLAUDE.md still under 150 lines                                                    | Section grep + `(Get-Content CLAUDE.md).Count` < 150                                   |
| 8   | `README.md` mentions Playwright MCP availability in the tech-stack line                                                                                                                                                 | Grep `README.md` for "Playwright MCP"                                                  |
| 9   | `npm run typecheck && npm run lint && npm run format:check && npm test` all exit 0; test count remains **62**                                                                                                           | Run all four; assert test count                                                        |
| 10  | Annotated tag `phase-b2-complete` exists locally                                                                                                                                                                        | `git tag -l phase-b2-complete -n5`                                                     |

---

## 6. File deliverables summary

**New files (3):**

- `.claude/settings.json` — MCP server registration
- `docs/mcp.md` — learning guide (6 H2 headings, ~250-300 lines)
- `docs/adr/0006-playwright-mcp.md` — rationale (Nygard format, under 80 lines)

**Modified files (5):**

- `.gitignore` — add `.claude/settings.local.json` rule
- `CLAUDE.md` — add ~10-line "MCP servers" section
- `README.md` — add `Playwright MCP` to tech-stack line
- `package.json` — add `@playwright/mcp` dev dependency
- `package-lock.json` — auto-updated by `npm install`

**Unchanged (everything else):**

- `playwright.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.env.example`
- All files under `src/`, `tests/`, `data/`, `auth/`
- All existing Phase B.1 docs except CLAUDE.md and README.md (modified above)
- `.github/workflows/test.yml`

---

## 7. Out of scope (deferred to later phases)

| Deferred to                 | What                                                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Future mini-phase B.3**   | GitHub MCP server (added right before Phase C orchestrator needs it for PR creation)                                                                                                        |
| **Future mini-phase B.4**   | Atlassian MCP server (added right before Phase C `/from-jira` orchestrator needs it)                                                                                                        |
| **Phase C**                 | Claude Code custom skills (`.claude/skills/*.md`) that wrap Playwright MCP into invokable workflows; the `/from-jira` orchestrator; sub-agent definitions for ticket → test code flow       |
| **Phase D**                 | Auto-running MCP in CI; pre-commit hook using MCP to validate selectors; auto-discovery of new pages; selector drift detection                                                              |
| **Out of scope (rejected)** | Global install of `@playwright/mcp`; user-level Claude config for MCP server; community/non-official MCP packages; headless default for the project; new npm scripts to invoke MCP from CLI |
