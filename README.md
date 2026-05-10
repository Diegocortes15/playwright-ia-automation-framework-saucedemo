# Playwright IA Automation Framework — saucedemo

[![Playwright Tests](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml/badge.svg)](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml)

A Playwright + TypeScript test automation framework targeting [https://www.saucedemo.com](https://www.saucedemo.com), designed for AI-assisted extension. Code-first, AI-assisted: tests run as fast deterministic Playwright code; AI agents extend the suite by reading tickets and authoring PRs.

## Prerequisites

- Node.js 22.x or newer
- `git`
- ~600 MB free disk space for Playwright browsers

## Quick start

```bash
git clone https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo.git
cd playwright-ia-automation-framework-saucedemo
npm install
npx playwright install chromium firefox webkit
cp .env.example .env
npm test
```

Expected: 62 test instances pass across 9 Playwright projects (~1 minute on a warm cache).

## npm scripts

| Script                  | What it does                                            |
| ----------------------- | ------------------------------------------------------- |
| `npm test`              | Run the full matrix (all 9 projects, 62 instances)      |
| `npm run test:standard` | Run only the standard chromium project (fast iteration) |
| `npm run test:no-auth`  | Run only login tests (no storageState)                  |
| `npm run test:problem`  | Run only the `problem_user` project                     |
| `npm run test:firefox`  | Run only the `firefox-standard` project                 |
| `npm run test:webkit`   | Run only the `webkit-standard` project                  |
| `npm run test:debug`    | Standard project with `--debug` (Playwright Inspector)  |
| `npm run test:ui`       | Open Playwright UI mode                                 |
| `npm run test:headed`   | Standard project in headed mode                         |
| `npm run report`        | Open the HTML report from the last run                  |
| `npm run codegen`       | Open Playwright codegen against saucedemo               |
| `npm run typecheck`     | TypeScript strict typecheck (no emit)                   |
| `npm run lint`          | ESLint v9 flat config                                   |
| `npm run format`        | Prettier write                                          |
| `npm run format:check`  | Prettier check (used by CI)                             |

## Project structure

```
.
├── src/
│   ├── pages/        # Page objects (LoginPage, InventoryPage, CartPage, checkout/*)
│   ├── components/   # Reusable UI components (Header, ProductCard, CartBadge, SortDropdown)
│   ├── fixtures/     # Playwright test fixture (page injection)
│   └── utils/        # env config + logger
├── data/             # Test data — typed loaders import JSON via `@data/*` alias
│   ├── shared/       # Reference data (products.json)
│   └── scenarios/    # Parameterized test scenarios (sort/, checkout/)
├── tests/            # Spec files (one folder per feature) + auth.setup.ts
├── auth/             # Generated storageState files (git-ignored; .gitkeep tracked)
├── docs/             # Documentation
└── .github/workflows/test.yml   # GitHub Actions CI
```

## Documentation

| File                                           | Purpose                                             |
| ---------------------------------------------- | --------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                       | AI rules — auto-loaded by Claude Code               |
| [`docs/architecture.md`](docs/architecture.md) | Framework structure, composition rules, conventions |
| [`docs/app/`](docs/app/)                       | About the app under test (saucedemo)                |
| [`docs/adr/`](docs/adr/)                       | Architecture Decision Records (numbered)            |

## Tech stack

Node 22 · Playwright 1.59 · TypeScript 5.9 (strict) · ESLint v9 flat config + `eslint-plugin-playwright` · Prettier 3 · GitHub Actions.
