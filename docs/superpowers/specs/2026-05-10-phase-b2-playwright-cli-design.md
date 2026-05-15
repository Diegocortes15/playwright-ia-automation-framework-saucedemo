# Phase B.2 — Playwright CLI Setup (Design)

**Date:** 2026-05-10
**Status:** Approved (revised after MCP→CLI pivot; ready for the remaining tasks)
**Scope:** Phase B.2 only — install and document the Playwright CLI package + Claude Code skill. GitHub MCP and Atlassian MCP are deferred to their own future mini-phases.

---

## 1. Overview

### Goal

Install the official `@playwright/cli` package, run its skill installer to land a Claude Code skill at `.claude/skills/playwright-cli/`, and document the use of the CLI as the AI's interactive browser-control tool. By end of phase, opening a fresh Claude Code session in this repo and asking Claude to "use the Playwright CLI to open saucedemo and tell me the login button selector" produces a visible Chrome window driven by Bash commands, with Claude reporting the correct selector — without any MCP server in the loop.

### Why this exists

Phase B.1 delivered the static documentation layer. Phase B.2 delivers the first piece of dynamic AI capability: a tool Claude can use to inspect the live application — discover selectors, verify selectors before generating tests, debug flakes by reading the rendered DOM. This is the bridge between docs-only context (Phase B.1) and AI-driven framework extension (Phase C).

The longer-term framing: this saucedemo project is a **template** for future client engagements. The CLI setup pattern learned here is the same pattern the user will apply when joining a new app under deadline pressure. The recipe — minimal framework scaffold first, then Playwright CLI for selector discovery — is documented as part of `docs/playwright-cli.md`.

### Why CLI and not MCP

This phase originally targeted `@playwright/mcp` (Microsoft's MCP server for Playwright). After hands-on trial we pivoted to `@playwright/cli` based on the official Playwright recommendation:

> "playwright-cli is best for coding agents (Claude Code, GitHub Copilot, etc.) that favor token-efficient, skill-based workflows. CLI commands avoid loading large tool schemas and verbose accessibility trees into the model context."
> — playwright.dev/docs/getting-started-cli

The CLI's three concrete advantages for our use case:

1. **Token efficiency.** No persistent MCP server holding session state in the conversation. Each Bash command returns only its own output. Snapshots are command-scoped, not auto-loaded every turn.
2. **Skill-based workflow.** The package ships a Claude Code skill (`.claude/skills/playwright-cli/SKILL.md`) with `allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)` — Claude invokes commands directly without per-call permission prompts, and the skill body teaches Claude the command surface.
3. **Same Playwright underneath.** No second browser engine, no different selector semantics. Just a thin CLI over the same Playwright Chromium binary the test runner uses.

The MCP path is preserved in the project's git history (commits `03235d0`, `93e1993`, `3371da1`) as a learning artifact — future-you can read the journey.

### Why JUST Playwright CLI

The brainstorming established a general rule: **add agent tools right before the consuming phase needs them.** GitHub MCP and Atlassian MCP have no consumer yet (the `/from-jira` orchestrator is Phase C). Playwright CLI has an immediate consumer: the user, learning to use it on a forgiving template app.

### What this is NOT

- Not GitHub MCP, Atlassian MCP, or any other server — those land in their own mini-phases
- Not a custom orchestrator, sub-agent, or `/from-jira` — Phase C
- Not auto-running CLI in CI / pre-commit hooks — Phase D
- Not changes to `playwright.config.ts`, `src/`, `tests/`, or `data/`
- Not `@playwright/mcp` — explicitly de-scoped after the CLI pivot

---

## 2. Decision log

| #   | Decision                                                                                                           | Rationale                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Package: `@playwright/cli` (Microsoft official)** instead of `@playwright/mcp`                                   | Token-efficient skill-based workflow officially recommended for coding agents; avoids loading large tool schemas and verbose accessibility trees into model context.             |
| 2   | **Install as project dev dependency, not global**                                                                  | Version-pinned in `package-lock.json`, reproducible across machines and CI. Same reasoning as the (rejected) MCP path.                                                           |
| 3   | **Run `playwright-cli install --skills` once and commit the generated `.claude/skills/playwright-cli/` directory** | Anyone cloning the repo + running `npm install` gets a working skill without an extra setup step. Skill content is small (~50 KB) and versioned alongside the package.           |
| 4   | **Auto-detected browser (Chrome) — no `--browser` override**                                                       | The installer detected the local Chrome and set it as default. Matches what real users have. The framework's tests still use the bundled Playwright chromium independently.      |
| 5   | **Add `.claude/settings.local.json` to `.gitignore`** (carried over from MCP attempt)                              | Establishes the project-vs-personal pattern for any future Claude Code config. Orthogonal to the CLI/MCP choice.                                                                 |
| 6   | **NO `.claude/settings.json` file**                                                                                | The CLI requires no Claude Code config. Skills are auto-discovered from `.claude/skills/`. Any old MCP config is deleted.                                                        |
| 7   | **`docs/playwright-cli.md` is a learning guide, not a reference manual**                                           | Goal is muscle-memory transfer to the next client engagement. The shipped `SKILL.md` is the reference; our doc is the "when to reach for what" narrative.                        |
| 8   | **CLAUDE.md gets a brief "Playwright CLI" section (~12 lines)**                                                    | Always-loaded — Claude needs to know the skill exists to invoke it proactively. Keeps total CLAUDE.md under the 150-line cap.                                                    |
| 9   | **Smoke test is manual + documented, not automated**                                                               | The CLI is invoked from Bash, but verification of the full path (Claude Code → skill → CLI → browser) happens inside a real session. A repeatable manual recipe is the artifact. |
| 10  | **No changes to `playwright.config.ts`, `src/`, `tests/`, `data/`, CI**                                            | The CLI's browser is independent of the test browser. This phase is config + docs only.                                                                                          |
| 11  | **Preserve the MCP commits (don't rewrite history)**                                                               | The git history honestly captures the learning journey: tried MCP → discovered CLI is recommended → pivoted. Supports the project's "learning template" purpose.                 |

---

## 3. Architecture

### 3a. Package install

```bash
npm install -D @playwright/cli
```

Adds one line to `package.json` devDependencies (`@playwright/cli@^0.1.13`) and updates `package-lock.json`. No new npm scripts — the CLI is invoked directly by Claude via Bash, or by the user via `npx playwright-cli <command>`.

### 3b. Skill install

```bash
npx playwright-cli install --skills
```

Output:

```
✅ Workspace initialized at `D:\...\playwright-ia-framework`.
✅ Skills installed to `.claude\skills\playwright-cli`.
✅ Found chrome, will use it as the default browser.
```

The installer creates `.claude/skills/playwright-cli/` with:

- `SKILL.md` (~388 lines) — main skill file with frontmatter `name: playwright-cli`, `allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)`, plus the full command surface (~40 commands across Core / Navigation / Keyboard / Mouse / Save as / Tabs / Storage / DevTools)
- `references/` (10 files): `element-attributes.md`, `playwright-tests.md`, `request-mocking.md`, `running-code.md`, `session-management.md`, `spec-driven-testing.md`, `storage-state.md`, `test-generation.md`, `tracing.md`, `video-recording.md`

These files are committed to the repo. When the package is upgraded (`npm install -D @playwright/cli@<new>`), re-run `npx playwright-cli install --skills` to refresh the generated content alongside the version bump in the same commit.

### 3c. `.claude/settings.json` is intentionally absent

No file is created. The CLI does not need an MCP server registration. Claude Code auto-discovers skills under `.claude/skills/`.

### 3d. `.gitignore` (modified — already landed during MCP attempt)

```
# Claude Code: project config committed; per-developer settings ignored
.claude/settings.local.json
```

This rule was added during the MCP attempt and carries over unchanged. `.claude/settings.local.json` (the personal permissions allowlist) stays gitignored. `.claude/skills/` is NOT ignored — those files are committed.

### 3e. `docs/playwright-cli.md` (new) — six headings

| H2 heading                        | Approx. words | Purpose                                                                                                     |
| --------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| 1. What is the Playwright CLI     | 100           | Plain-language definition; one-line distinction between CLI browser, the test runner, and `npm run codegen` |
| 2. How it's wired in this project | 60            | Pointer to `.claude/skills/playwright-cli/`, the npm dev dep, why no `.claude/settings.json`                |
| 3. Verifying the setup            | 60            | The 3-step smoke test (see §4) plus a "failure modes" H3 sub-section                                        |
| 4. Worked examples                | 600           | Four scenarios, ~150 words each (see §3f)                                                                   |
| 5. When NOT to use it             | 100           | Honest list of anti-patterns; includes "use codegen for human-driven exploration" pointer                   |
| 6. Pointers                       | 50            | Links to ADR-0006, official docs, the SKILL.md, CLAUDE.md section                                           |

Estimated total: ~250-300 lines.

### 3f. `docs/playwright-cli.md` worked examples (heading 4)

Each example shows the exact Bash command sequence Claude would invoke (or the user can paste).

| #   | Scenario                                                | Why it matters                                                                                                                                                                       |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | **Discover selectors on a new page**                    | Headline use case for new client apps. `playwright-cli open <url>` then `playwright-cli snapshot` returns a token-efficient text snapshot with element refs Claude can reason about. |
| 4.2 | **Verify a selector before adding it to a Page object** | Sanity check before test code. `playwright-cli generate-locator <ref>` proposes a stable selector; `playwright-cli click <ref>` confirms it's interactive.                           |
| 4.3 | **Debug a flaky test by inspecting live DOM**           | `playwright-cli eval "el => el.outerHTML" <ref>` returns the exact rendered HTML. Live DOM beats screenshots in a debug log.                                                         |
| 4.4 | **Generate a draft Page object from live exploration**  | `playwright-cli snapshot` + `playwright-cli generate-locator` per element produces selectors Claude shapes into a `readonly` locator block matching the framework's conventions.     |

### 3g. `docs/adr/0006-playwright-cli.md` (new)

Standard Nygard format. Under 80 lines.

- **Context:** Phase B.1 delivered static docs; Phase C will need live application access. Originally targeted `@playwright/mcp`; the official Playwright docs explicitly recommend `@playwright/cli` for coding agents because it's token-efficient and skill-based.
- **Decision:** Adopt `@playwright/cli` (Microsoft official) as the project's first AI browser-control tool. Install as project dev dependency. Run skill installer once and commit `.claude/skills/playwright-cli/`. No `.claude/settings.json` needed.
- **Consequences:** Anyone cloning + `npm install` gets a working setup. Token cost per command is much lower than MCP equivalent (no persistent state, no DOM dumps). Skill content is generated and committed — must be regenerated on package upgrade. The MCP package is explicitly NOT installed.
- **Alternatives considered:** `@playwright/mcp` (rejected — see decision log #1); global install (rejected — less reproducible); `npm run codegen` only (rejected — codegen is human-driven; agents need live programmatic access).

### 3h. `CLAUDE.md` (modified) — new "Playwright CLI" section

Insert after the existing "Quick run" section. Approximately 12 lines:

```markdown
## Playwright CLI

This project ships with the `@playwright/cli` Claude Code skill registered at `.claude/skills/playwright-cli/`. When you need to inspect the live application — discover selectors on an unfamiliar page, verify a selector before writing a test, or debug a flaky test by reading the rendered DOM — invoke the skill or call `playwright-cli` commands directly via Bash.

- Skill frontmatter `allowed-tools: Bash(playwright-cli:*)` permits the commands without per-call approval.
- Browser auto-detected at install time (Chrome on most dev machines).
- The CLI is independent of the test runner — `npm test` uses the bundled Playwright chromium and is unaffected.
- Full usage guide with worked examples: [`docs/playwright-cli.md`](docs/playwright-cli.md)
- Reach for `npm run codegen` instead when YOU want to manually click through the app and capture selectors interactively.
```

Total CLAUDE.md will go from 98 → ~111 lines (well under the 150 cap).

### 3i. `README.md` (modified) — tech-stack one-liner

Add `Playwright CLI` to the existing tech-stack line at the bottom of the file. Single-line change.

### 3j. What stays the same

- Every file under `src/`, `tests/`, `data/`, `auth/`
- `playwright.config.ts`
- `eslint.config.js`, `.prettierrc.json`, `tsconfig.json`
- `.github/workflows/test.yml`
- All Phase B.1 docs (`docs/architecture.md`, `docs/app/*`, `docs/adr/0001..0005`, placeholders)
- `npm run codegen` (the human-driven recorder, `playwright codegen` under the hood — pointed at by CLAUDE.md and `docs/playwright-cli.md` as the codegen alternative)

---

## 4. Verification

There is no automated test for "Claude Code can use the CLI skill correctly" because that path runs inside a Claude Code session. Verification is a documented manual smoke test that anyone can repeat.

### 4a. The smoke test, three steps

1. **Package check.** `npx playwright-cli --version` from the repo root. Expected: `0.1.13` (or whatever is in `package.json`).
2. **Skill discovery check.** Open a fresh Claude Code session in this repo. Type `/skills` (or whatever Claude Code's command is for listing available skills) — `playwright-cli` should appear with the description "Automate browser interactions, test web pages and work with Playwright tests."
3. **End-to-end check.** Paste: `Use the playwright-cli skill to open https://www.saucedemo.com and tell me the login button selector.` Expected: a Chrome window appears, Claude runs `playwright-cli open ...` and `playwright-cli snapshot`, and reports `[data-test="login-button"]` (or an equivalent stable selector via `playwright-cli generate-locator`).

If all three pass, the install is healthy. The smoke test lives at `docs/playwright-cli.md` heading 3 and is part of the DoD.

### 4b. Failure modes documented in `docs/playwright-cli.md`

- `npx playwright-cli` not found → `npm install` was skipped after a fresh clone
- Skill not listed in `/skills` → `.claude/skills/playwright-cli/` is missing or corrupted; re-run `npx playwright-cli install --skills`
- Browser doesn't appear on `playwright-cli open` → no Chrome on machine; install Chrome or pass `--browser=chromium` to use the bundled Playwright binary
- First call slow → first run downloads browser binary if needed; subsequent calls cache

### 4c. What we cannot verify automatically

- That the docs read clearly to a future reader
- That the worked examples actually return useful results (you'll find out the first time you use them)
- That a teammate can clone the repo and get the CLI working in <5 min

---

## 5. Acceptance criteria (Phase B.2 Definition of Done)

| #   | Criterion                                                                                                                                                             | How to verify                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | `@playwright/cli` is in `package.json` devDependencies and locked in `package-lock.json`; `@playwright/mcp` is NOT present                                            | `npm ls @playwright/cli @playwright/mcp` shows cli only                                                 |
| 2   | `.claude/skills/playwright-cli/SKILL.md` exists, is committed, and starts with the frontmatter `name: playwright-cli`                                                 | `git ls-files .claude/skills/playwright-cli/SKILL.md` returns the path; `head -5` shows the frontmatter |
| 3   | `.claude/skills/playwright-cli/references/` directory has all 10 reference files committed                                                                            | `git ls-files .claude/skills/playwright-cli/references/` returns 10 entries                             |
| 4   | `.claude/settings.json` does NOT exist (any prior MCP config is removed)                                                                                              | `Test-Path .claude/settings.json` returns False                                                         |
| 5   | `.claude/settings.local.json` is gitignored                                                                                                                           | `git check-ignore .claude/settings.local.json` exits 0                                                  |
| 6   | Smoke test passes: `npx playwright-cli --version` returns 0.1.13; skill discoverable in fresh Claude Code session; end-to-end prompt opens browser + returns selector | Manual run, documented in `docs/playwright-cli.md` heading 3                                            |
| 7   | `docs/playwright-cli.md` exists with all 6 H2 headings (What is / How wired / Verifying / 4 worked examples / When NOT to use / Pointers)                             | File exists; section grep finds 6 H2 headings                                                           |
| 8   | `docs/adr/0006-playwright-cli.md` exists, follows Nygard format, under 80 lines                                                                                       | File exists; line count < 80; section grep finds 4 ADR headings                                         |
| 9   | `CLAUDE.md` has a new "Playwright CLI" section (~12 lines); CLAUDE.md still under 150 lines total                                                                     | Section grep + `(Get-Content CLAUDE.md).Count` < 150                                                    |
| 10  | `README.md` mentions Playwright CLI in the tech-stack line                                                                                                            | Grep `README.md` for "Playwright CLI"                                                                   |
| 11  | `npm run typecheck && npm run lint && npm run format:check && npm test` all exit 0; test count remains **62**                                                         | Run all four; assert test count                                                                         |
| 12  | Annotated tag `phase-b2-complete` exists locally                                                                                                                      | `git tag -l phase-b2-complete -n5`                                                                      |

---

## 6. File deliverables summary

**Already landed during the swap (commit `ce4deaf`):**

- New: `.claude/skills/playwright-cli/SKILL.md`
- New: `.claude/skills/playwright-cli/references/*.md` (10 files)
- Deleted: `.claude/settings.json` (was orphan MCP config)
- Modified: `package.json` (`-@playwright/mcp` `+@playwright/cli`)
- Modified: `package-lock.json`

**To be added in remaining tasks:**

- `docs/playwright-cli.md` (Task 3)
- `docs/adr/0006-playwright-cli.md` (Task 2)
- Modified: `CLAUDE.md` (Task 4 — add "Playwright CLI" section)
- Modified: `README.md` (Task 4 — add to tech stack)

**Already landed earlier (preserved from MCP attempt):**

- `.gitignore` (commit `03235d0`) — `.claude/settings.local.json` rule

**Renamed (to track this revised spec):**

- `docs/superpowers/specs/2026-05-10-phase-b2-playwright-mcp-design.md` → `docs/superpowers/specs/2026-05-10-phase-b2-playwright-cli-design.md` (this file)
- `docs/superpowers/plans/2026-05-10-phase-b2-playwright-mcp.md` → `docs/superpowers/plans/2026-05-10-phase-b2-playwright-cli.md`

**Unchanged:**

- `playwright.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.env.example`
- All files under `src/`, `tests/`, `data/`, `auth/`
- All Phase B.1 docs except CLAUDE.md and README.md (modified above)
- `.github/workflows/test.yml`

---

## 7. Out of scope (deferred to later phases)

| Deferred to                 | What                                                                                                                                                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase C**                 | Custom Claude Code skills layered on top of the playwright-cli skill (e.g., a `/discover-selectors` skill that wraps a multi-step CLI workflow); the `/from-issue` orchestrator (reads GitHub Issues via `gh` CLI)                                                                                            |
| **Phase D**                 | Auto-running CLI in CI; pre-commit hook using CLI to validate selectors; auto-discovery of new pages; selector drift detection                                                                                                                                                                                |
| **Out of scope (rejected)** | `@playwright/mcp` (rejected after CLI pivot — see ADR-0006); GitHub MCP (rejected — `gh` CLI is sufficient, see ADR-0007); Atlassian/Jira MCP (rejected — project uses GitHub Issues, not Jira); global install of `@playwright/cli`; community/non-official packages; explicit `--browser` override in skill |

---

## 8. Pivot history

The phase originally designed against `@playwright/mcp` (commits `03235d0`, `93e1993`, `3371da1`). The user discovered the official `@playwright/cli` recommendation; we verified it against playwright.dev and pivoted (commit `ce4deaf`). The MCP commits are preserved as a learning artifact. This spec replaces the MCP design wholesale.
