# CLAUDE.md — Always-loaded AI rules

This file is loaded into context for every Claude Code session in this project. Keep it under 150 lines. Detailed reference lives in `docs/`.

## Project purpose

Playwright + TypeScript test framework for [saucedemo](https://www.saucedemo.com). AI-assisted extension is a first-class workflow.

- Framework architecture: [`docs/architecture.md`](docs/architecture.md)
- App behavior (the 6 saucedemo users, flows): [`docs/app/`](docs/app/)
- Test case management philosophy (why no TCMS, where reports live): [`docs/test-case-management.md`](docs/test-case-management.md)
- Decision rationale: [`docs/adr/`](docs/adr/)
- Design specs and plans (don't auto-load — read on demand): [`docs/superpowers/`](docs/superpowers/)

## Quick run

```bash
npm test                 # full matrix (all data-driven projects, per tests/users.ts)
npm run test:standard    # standard chromium only (fast local iteration)
npm run test:debug       # Playwright Inspector
npm run test:ui          # Playwright UI mode
```

## Playwright CLI

This project ships with the `@playwright/cli` Claude Code skill registered at `.claude/skills/playwright-cli/`. When you need to inspect the live application — discover selectors on an unfamiliar page, verify a selector before writing a test, or debug a flaky test by reading the rendered DOM — invoke the skill or call `playwright-cli` commands directly via Bash.

- Skill frontmatter `allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Bash(npm:*)` permits these commands without per-call approval.
- Browser auto-detected at install time (Chrome on most dev machines).
- The CLI is independent of the test runner — `npm test` uses the bundled Playwright chromium and is unaffected.
- On `@playwright/cli` upgrade, re-run `npx playwright-cli install --skills` and commit the regenerated skill files in the same commit as the version bump.
- Full usage guide with worked examples: [`docs/playwright-cli.md`](docs/playwright-cli.md)
- Reach for `npm run codegen` instead when YOU want to manually click through the app and capture selectors interactively.

## Custom skills

This project ships custom skills under `.claude/skills/<skill-name>/` — domain-specific workflows that build on top of `playwright-cli` and other tools. The pattern is documented in [ADR-0008](docs/adr/0008-custom-skills-pattern.md): compact `SKILL.md` (frontmatter + intro + pointer) and verbose detail in `references/`.

Current custom skills:

- **`/scaffold-page-object`** — generate a draft Page Object class from a live page snapshot. Full guide: [`docs/scaffold-page-object.md`](docs/scaffold-page-object.md).
- **`/from-issue`** — generate a set of Playwright tests from a Jira ticket (read via the Atlassian MCP) and open a GitHub PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist, and grows the harness autonomously (data-driven `tests/users.ts` `AUTH_USERS`, [ADR-0014](docs/adr/0014-from-issue-harness-growth.md)) when a ticket needs an unwired auth user. Full guide: [`docs/from-issue.md`](docs/from-issue.md). Optionally mirrors generated tests into a TCMS (Qase) at PR time when `QASE_*` is set — opt-in, one-way, [ADR-0016](docs/adr/0016-tcms-mirror.md) / [`docs/tcms.md`](docs/tcms.md).
- **`/refine-ticket`** — iteratively harden a Jira ticket against a "bulletproof" rubric (grounded in existing automation + docs + sources you point it at) and write the refined acceptance criteria back to the ticket on approval, so `/from-issue` has nothing left to guess. Writes to Jira ([ADR-0013](docs/adr/0013-refine-ticket-jira-writeback.md)) — the only skill that does. Full guide: [`docs/refine-ticket.md`](docs/refine-ticket.md).

## GitHub + Jira operations

**Ticket reads come from Jira via the Atlassian MCP** (see [ADR-0011](docs/adr/0011-jira-ticket-source.md)) — `/from-issue SW-123` reads the ticket through the MCP, NOT `gh issue`. The GitHub-for-Jira app auto-links the PR onto the ticket (no write-back).

This project uses the `gh` CLI for GitHub operations (PRs, releases, workflow runs, arbitrary REST calls). `gh` is the user-installed GitHub CLI; assume it's authenticated (`gh auth login` is a one-time step).

- For PRs: `gh pr create`, `gh pr view`, `gh pr comment`, `gh pr checks`
- For arbitrary API: `gh api repos/<owner>/<repo>/...`
- We do NOT install a GitHub MCP server — see [ADR-0007](docs/adr/0007-gh-cli-not-github-mcp.md) (scoped by ADR-0011: gh for GitHub, Atlassian MCP for Jira).

## Composition rules (must follow)

1. **Component knows about Locators and (optionally) child Components only.** Never about Pages or its parent.
2. **Page composes Components and holds page-unique Locators.** Never composes other Pages.
3. **Pages NEVER return other Pages.** Methods return `void` or data only. Tests use injected page fixtures to navigate explicitly.
4. **Tests know about Pages and Data only.** Never raw Locators or Components directly.
5. **All locator/component fields are `readonly`.** Set in constructor, never reassigned.
6. **Constructor order:** composed Components first → page-direct Locators second.
7. **Action methods read like English.** Tests should be near-prose: `inventoryPage.addProductToCart('X')`.
8. **Queries return data, never `Locator`.** `getProductNames(): string[]`, not `getProductLocators(): Locator[]`.
9. **Components scoped to one of many similar elements take a discriminator** in the constructor (e.g., `new ProductCard(page, productName)`).
10. **Refactor a page-direct locator into a Component the moment a 2nd page needs it.** Don't wait.
11. **Component nesting depth ≤ 2.** Deeper indicates a design problem.
12. **No `await page.waitForTimeout()` ever.** Use Playwright auto-waiting assertions (`expect(...).toBeVisible()` etc.). Enforced by lint.

## Selector preference order

1. `[data-test="..."]` attribute
2. `getByRole(...)` (with anchored regex like `/^Add to cart$/i`)
3. Text matchers
4. CSS selectors (only when nothing above is available)

Never use XPath.

## Tag conventions (Playwright Projects + storageState + role tags)

> Tags are applied via Playwright's **`{ tag }` option** — routing tags on `test.describe`, `@smoke` on the `test` — NOT in the title string (per [ADR-0015](docs/adr/0015-spec-tags-via-tag-option.md)). Project `grep` matches option-tags, so routing is unchanged. One feature file holds one tagged describe per user-context.

Projects are **data-driven from `tests/users.ts` `AUTH_USERS`** (currently `['standard', 'problem']`); `/from-issue` grows that array one user at a time as tickets need authenticated pages (ADR-0014). Each user yields a `setup-<user>` + a `chromium-<user>` project; plus a `chromium-no-auth` project. Cross-browser (firefox/webkit) stays out (ADR-0004).

| Tag          | Runs on project(s)                                                                  | Purpose                                                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@no-auth`   | `chromium-no-auth`                                                                  | Login / logout / route-guard tests — no pre-existing session                                                                                                                                           |
| `@all-users` | every `chromium-<user>` project (currently `chromium-standard`, `chromium-problem`) | User-agnostic flows                                                                                                                                                                                    |
| `@standard`  | `chromium-standard`                                                                 | Tests where only standard_user is meaningful                                                                                                                                                           |
| `@problem`   | `chromium-problem`                                                                  | Tests that _expect_ problem_user's broken UI                                                                                                                                                           |
| `@<user>`    | `chromium-<user>` — **only once that user is wired** into `AUTH_USERS`              | On-demand per ADR-0014: e.g. `@performance_glitch` / `@error` / `@visual` route nowhere until a ticket needs that user (then `/from-issue` adds it + its project). Cross-browser stays out (ADR-0004). |
| `@smoke`     | Cross-cutting (filtered via `--grep "@smoke"`)                                      | Build-verification candidates from /from-issue. Selected per `smoke-policy.md`. Run via `npm run test:smoke`.                                                                                          |

## Where things live

| What                                            | Where                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Page objects                                    | `src/pages/` (`LoginPage.ts`, `InventoryPage.ts`, `CartPage.ts`, `checkout/*`)                                     |
| Components                                      | `src/components/` (`Header.ts`, `Footer.ts`, `CartBadge.ts`, `BurgerMenu.ts`)                                      |
| Fixture (auto-injects pages)                    | `src/fixtures/test.ts` — tests import `test`/`expect` from `@fixtures/test`, NOT `@playwright/test`                |
| Test data + types + loaders                     | `data/` (use `@data/*` alias)                                                                                      |
| env config                                      | `src/utils/env.ts` (single read point for `process.env`)                                                           |
| Specs                                           | `tests/<feature>/*.spec.ts`                                                                                        |
| Auth setup (generates storageState per user)    | `tests/auth.setup.ts`                                                                                              |
| Playwright config (data-driven from AUTH_USERS) | `playwright.config.ts`                                                                                             |
| TCMS mirror (optional Qase seam)                | `src/tcms/` (`types.ts`, `case-mapper.ts`, `results-reader.ts`, `qase-client.ts`, `suite-sync.ts`, `map-store.ts`) |

## Path aliases

```ts
'@data/*'       → 'data/*'
'@pages/*'      → 'src/pages/*'
'@components/*' → 'src/components/*'
'@fixtures/*'   → 'src/fixtures/*'
'@utils/*'      → 'src/utils/*'
```

## When extending the framework

- **Adding a test:** put it under `tests/<feature>/*.spec.ts`. Tag it correctly. Use `@fixtures/test` for `test`/`expect`, never `@playwright/test`.
- **Adding a page:** put it under `src/pages/`. Compose any existing Components first. Hold page-unique locators directly.
- **Adding a component:** put it under `src/components/`. Only if reused (or about to be reused) by 2+ pages.
- **Adding test data:** put reference data in `data/shared/`, scenarios in `data/scenarios/<feature>/`. Add a typed loader in `data/fixtures.ts`.
- **Architectural changes:** read `docs/adr/` first; if you need to overturn an ADR, write a superseding one rather than editing the original.

## What to NEVER do

- `await page.waitForTimeout()` — lint blocks; use auto-waiting assertions
- Make a Page method return another Page (we explicitly rejected fluent navigation — see ADR-0001)
- Import a Page from another Page (no cross-page imports in `src/pages/`)
- Import a raw Locator into a test (tests use Pages and Data only)
- Use XPath
- Add a 15-project per-user-per-browser matrix (smoke pattern is intentional — see ADR-0004)
