# Playwright CLI

This is the learning guide for using `@playwright/cli` in this project. The CLI gives Claude Code interactive browser control via ~40 Bash commands, registered as a Claude Code skill at `.claude/skills/playwright-cli/SKILL.md`. If you're new to the CLI, read sections 1-3 first. If you've used it before, jump to the worked examples in section 4.

## What is the Playwright CLI

`@playwright/cli` is a command-line interface for browser automation, built by the Playwright team specifically for AI coding agents. Each command (`playwright-cli open`, `playwright-cli snapshot`, `playwright-cli click <ref>`) drives a real Chrome browser and returns a focused, token-efficient text result. There is no persistent MCP server, no DOM dumps every turn, no large tool schemas — just one Bash command, one focused output.

The package ships a Claude Code skill at `.claude/skills/playwright-cli/SKILL.md`. The skill's frontmatter declares `allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)`, which means Claude Code can invoke any `playwright-cli ...` command without prompting you for permission per call.

Three things to keep straight:

- **`playwright-cli`** — Claude's interactive browser. Invoked from inside conversations to inspect, verify, and explore.
- **`npm test`** — the test runner (`@playwright/test`). The source of truth for "does this pass in CI?". Independent of the CLI; uses its own Playwright browser instance.
- **`npm run codegen`** — `playwright codegen` for YOU. Open a browser, click around manually, get auto-generated Playwright code. Use this when you want human-driven exploration; the CLI is for AI-driven exploration.

## How it's wired in this project

Two pieces:

1. **The npm package** — `@playwright/cli` is a dev dependency in `package.json`. Run `npm install` once after cloning and the binary is available via `npx playwright-cli`.
2. **The Claude Code skill** — `.claude/skills/playwright-cli/` (committed) contains the skill file and 10 reference docs. Claude Code auto-discovers skills under `.claude/skills/`; nothing else to configure.

There is intentionally **no `.claude/settings.json`** in this project. The CLI doesn't need MCP server registration. The previous Phase B.2 attempt with `@playwright/mcp` did create one — it was deleted during the pivot.

When the package is upgraded (`npm install -D @playwright/cli@<new>`), refresh the skill content with `npx playwright-cli install --skills` and commit the diff alongside the version bump in the same commit.

## Verifying the setup

After `npm install`, run this 3-step smoke test to confirm everything works.

1. **Package check.** From the repo root:

   ```bash
   npx playwright-cli --version
   ```

   Expected: prints `0.1.13` (or whatever version is in `package.json`).

2. **Skill discovery check.** Open a fresh Claude Code session in this repo. Type `/skills` (Claude Code's command for listing available skills). The `playwright-cli` skill should appear with the description "Automate browser interactions, test web pages and work with Playwright tests."

3. **End-to-end check.** In the same session, paste:

   > Use the playwright-cli skill to open https://www.saucedemo.com and tell me the login button selector.

   Expected: a Chrome window appears, Claude runs `playwright-cli open https://www.saucedemo.com` followed by `playwright-cli snapshot`, and reports `[data-test="login-button"]` (or proposes an equivalent stable selector via `playwright-cli generate-locator`).

If all three pass, the install is healthy.

### Failure modes

- **`npx playwright-cli` not found.** `npm install` was skipped after a fresh clone. Run `npm install` from the repo root.
- **Skill not listed by `/skills`.** `.claude/skills/playwright-cli/` is missing or corrupted. Re-run `npx playwright-cli install --skills` to regenerate.
- **Browser doesn't appear on `playwright-cli open`.** No Chrome on this machine. Either install Chrome or pass `--browser=chromium` to use the bundled Playwright binary.
- **First call slow (~30 s).** First run downloads the browser binary if needed; subsequent calls cache.

## Worked examples

The four scenarios below are the load-bearing reasons to use `playwright-cli`. Each one replaces a slower or more error-prone manual workflow.

### 4.1 Discover selectors on a new page

**Goal:** survey an unfamiliar page and get stable selectors for every interactive element.

**Prompt to Claude:**

> Use the playwright-cli skill: log in to saucedemo as `standard_user` (password `secret_sauce`), navigate to `/cart.html`, take a snapshot, and list every interactive element with the most stable selector you can find and a one-line description.

**What Claude actually runs (visible in the conversation):**

```bash
playwright-cli open https://www.saucedemo.com
playwright-cli fill <ref-username> standard_user
playwright-cli fill <ref-password> secret_sauce
playwright-cli click <ref-login>
playwright-cli goto https://www.saucedemo.com/cart.html
playwright-cli snapshot
# Then per element of interest:
playwright-cli generate-locator <ref>
```

**What you get back:** A markdown table from Claude listing each element (`[data-test="continue-shopping"]`, `[data-test="checkout"]`, etc.) with descriptions, derived from the snapshot's element refs.

**Why it matters:** This is the headline use case for new client apps. Without the CLI, you'd open the browser, right-click, inspect, copy a selector, test it in DevTools, paste it into a file — five context-switches per element. With the CLI, it's a few Bash commands and a Claude summary. Snapshot output is concise (a structured tree, not a DOM dump), so token cost stays low even on dense pages.

### 4.2 Verify a selector before adding it to a Page object

**Goal:** confirm a selector works before writing test code that depends on it.

**Prompt to Claude:**

> Use the playwright-cli skill: log in, navigate to `/checkout-step-one.html` (add an item first via cart), then verify that `[data-test="continue"]` is the right selector for the Continue button. Confirm it's clickable and report its accessible name.

**What Claude runs:**

```bash
# (login + navigation steps as above)
playwright-cli snapshot
# Find the continue button's ref in the snapshot, then:
playwright-cli generate-locator <ref>     # Confirms playwright generates the expected locator
playwright-cli click <ref>                # Confirms it's clickable (or fails loudly)
```

**Why it matters:** Sanity check before the test even gets written. Catches typos, stale selectors, and "wait, the button only appears after X" race conditions — long before they show up as failures in CI.

### 4.3 Debug a flaky test by inspecting live DOM

**Goal:** when a test fails intermittently, get the exact rendered HTML at the moment of interest.

**Prompt to Claude:**

> The test `cart add/remove (@all-users)` is flaking on the badge count assertion. Use the playwright-cli skill to log in as standard_user, navigate to inventory, add the Sauce Labs Backpack, and report the cart badge's rendered HTML, computed visibility, and innerText.

**What Claude runs:**

```bash
# (login + navigation + add-to-cart steps)
playwright-cli snapshot
# Find the cart badge ref, then:
playwright-cli eval "el => el.outerHTML" <ref>
playwright-cli eval "el => ({ visible: el.offsetParent !== null, text: el.innerText })" <ref>
```

**Why it matters:** Live DOM beats screenshots in a debug log. This is the go-to when something fails in CI but passes locally — you can rule out (or confirm) an intermittent rendering issue without leaving the conversation. Each `eval` returns only the requested data, not a full DOM snapshot.

### 4.4 Generate a draft Page object from live exploration

**Goal:** propose a new Page object class scaffold based on what's actually on a page.

**Prompt to Claude:**

> Use the playwright-cli skill to explore `/checkout-complete.html` (run a checkout to reach it). Then propose a `CheckoutCompletePage` class following the patterns in `src/pages/checkout/CheckoutInfoPage.ts`. Show only the locator block (the `readonly` field declarations and constructor); I'll review before writing the rest.

**What Claude runs:**

```bash
# (login + checkout flow to reach the complete page)
playwright-cli snapshot
# For each element that should become a locator:
playwright-cli generate-locator <ref>
```

**Why it matters:** End-to-end "new app, new page" workflow. The "show only the locator block" boundary is intentional — it keeps Claude from over-generating action methods before you've reviewed and approved the selectors. Snapshot + per-element generate-locator gives Claude exactly the inputs it needs without polluting context with unrelated DOM.

## When NOT to use it

- **Routine grep / file reading.** If the question is "what's in this file?", use Read or Grep, not the CLI.
- **Test execution.** The CLI doesn't replace `npm test`. Tests in `tests/` are the source of truth for "does this work in CI?".
- **Human-driven recording.** When YOU want to manually click through the app and capture selectors, use `npm run codegen` (the Playwright recorder). The CLI is for AI-driven workflows; codegen is for human-driven workflows. They're complementary.
- **Apps with real credentials or PII without thinking it through.** The CLI's browser stores cookies and session data in its workspace state. For sensitive apps, treat sessions like real browser logins and clean up after.
- **Scripted batch operations.** The CLI is interactive (one round-trip per command). For "navigate to 50 URLs and screenshot each", write a Playwright script in `tests/` instead.

## Pointers

- [`docs/adr/0006-playwright-cli.md`](adr/0006-playwright-cli.md) — rationale for the package and pivot from `@playwright/mcp`
- [`.claude/skills/playwright-cli/SKILL.md`](../.claude/skills/playwright-cli/SKILL.md) — full command reference (the shipped skill file)
- [Playwright CLI docs (playwright.dev)](https://playwright.dev/docs/getting-started-cli) — official upstream docs and getting started
- [`CLAUDE.md`](../CLAUDE.md) `## Playwright CLI` section — quick reference for AI agents working in this repo
