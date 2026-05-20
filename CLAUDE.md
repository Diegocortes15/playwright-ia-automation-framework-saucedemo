# CLAUDE.md — Always-loaded AI rules

This file is loaded into context for every Claude Code session in this project. Keep it under 150 lines. Detailed reference lives in `docs/`.

## Project purpose

Playwright + TypeScript test framework for [saucedemo](https://www.saucedemo.com). AI-assisted extension is a first-class workflow.

- Framework architecture: [`docs/architecture.md`](docs/architecture.md)
- App behavior (the 6 saucedemo users, flows): [`docs/app/`](docs/app/)
- Decision rationale: [`docs/adr/`](docs/adr/)
- Design specs and plans (don't auto-load — read on demand): [`docs/superpowers/`](docs/superpowers/)

## Quick run

```bash
npm test                 # full matrix (9 projects, 62 instances, ~1 min)
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
- **`/from-issue`** — generate a set of Playwright tests from a `to-be-automated`-labeled GitHub Issue and open a PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist. Full guide: [`docs/from-issue.md`](docs/from-issue.md).

## GitHub operations

This project uses the `gh` CLI for all GitHub operations (issues, PRs, releases, workflow runs, arbitrary REST calls). `gh` is the user-installed GitHub CLI; assume it's authenticated (`gh auth login` is a one-time step).

- For issues: `gh issue view <num>`, `gh issue create`, `gh issue list`
- For PRs: `gh pr create`, `gh pr view`, `gh pr comment`, `gh pr checks`
- For arbitrary API: `gh api repos/<owner>/<repo>/...`
- We do NOT install a GitHub MCP server — see [ADR-0007](docs/adr/0007-gh-cli-not-github-mcp.md) for the rationale (same logic as the Playwright CLI / MCP choice in ADR-0006).

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

| Tag                   | Runs on project(s)                                                                | Purpose                                                                                           |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `@no-auth`            | `no-auth`                                                                         | Login/logout tests, no pre-existing session                                                       |
| `@all-users`          | All 5 chromium user projects + firefox/webkit                                     | User-agnostic flows                                                                               |
| `@standard`           | `standard`, `firefox-standard`, `webkit-standard`                                 | Tests where only standard user is meaningful                                                      |
| `@problem`            | `problem`                                                                         | Tests that _expect_ the problem user's broken UI                                                  |
| `@performance_glitch` | `performance_glitch`                                                              | Tests that handle slow loads                                                                      |
| `@error`              | `error`                                                                           | Tests for the error user's random failures                                                        |
| `@visual`             | `visual`                                                                          | Visual regression for the visual user                                                             |
| `@sort-functional`    | `standard`, `performance_glitch`, `visual`, `firefox-standard`, `webkit-standard` | Sort tests (excluded from `problem`/`error` — saucedemo breaks the sort dropdown for those users) |

## Where things live

| What                                         | Where                                                                                               |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page objects                                 | `src/pages/` (`LoginPage.ts`, `InventoryPage.ts`, `CartPage.ts`, `checkout/*`)                      |
| Components                                   | `src/components/` (`Header.ts`, `CartBadge.ts`, `ProductCard.ts`, `SortDropdown.ts`)                |
| Fixture (auto-injects pages)                 | `src/fixtures/test.ts` — tests import `test`/`expect` from `@fixtures/test`, NOT `@playwright/test` |
| Test data + types + loaders                  | `data/` (use `@data/*` alias)                                                                       |
| env config                                   | `src/utils/env.ts` (single read point for `process.env`)                                            |
| Specs                                        | `tests/<feature>/*.spec.ts`                                                                         |
| Auth setup (generates storageState per user) | `tests/auth.setup.ts`                                                                               |
| Playwright config (9 projects)               | `playwright.config.ts`                                                                              |

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
