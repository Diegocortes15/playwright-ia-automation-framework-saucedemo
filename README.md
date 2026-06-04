# Playwright IA Automation Framework — Saucedemo

[![Playwright Tests](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml/badge.svg)](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml)
![Playwright](https://img.shields.io/badge/Playwright-1.59-2EAD33?logo=playwright&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9_strict-3178C6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-22.x-339933?logo=nodedotjs&logoColor=white)
![Qase](https://img.shields.io/badge/TCMS-Qase-6E5BFF)

> An end-to-end test framework where **a Jira ticket becomes a reviewed, TCMS-mirrored Playwright pull request** — authored by AI agents, gated by deterministic CI. Built on [saucedemo](https://www.saucedemo.com) as both a **reusable template** and a **portfolio piece**.

<!-- 📷 IMAGE SLOT — Hero banner or a side-by-side screenshot collage (a generated PR on the left, the Qase suite tree on the right). Replace this comment with: ![overview](docs/images/hero.png) -->

The framework is **code-first and AI-extended**. Tests are plain, fast, deterministic Playwright + TypeScript — nothing exotic at runtime. The "AI" part is the _authoring_ layer: a set of custom [Claude Code](https://claude.ai/code) skills read a Jira ticket, generate Page-Object-backed tests, run them, and open a GitHub PR — optionally mirroring each test into a [Qase](https://qase.io) TCMS so non-technical reviewers can browse human-readable cases. A human reviews and merges; CI keeps everything honest.

---

## How it works — the pipeline

The whole system, top-down: a ticket goes in one end, a reviewed-and-mirrored test comes out the other.

```mermaid
flowchart LR
    J["Jira ticket<br/>(project SW)"] -->|"/refine-ticket"| R["Hardened<br/>acceptance criteria"]
    R -->|"/from-issue"| G["Tests + Page Objects<br/>+ TCMS record"]
    G --> PR["GitHub Pull Request"]
    PR -->|"CI: changed specs only<br/>+ typecheck + strict lint"| Rev["Human review"]
    Rev -->|merge| M["main"]
    M -->|"CI: full suite<br/>+ catalog sync"| Q["Qase TCMS<br/>(human-readable cases)"]
```

<!-- 📷 IMAGE SLOT — A polished version of the pipeline above (or a screenshot of a real run: the Jira ticket → the PR → the Qase case). Replace with: ![pipeline](docs/images/pipeline.png) -->

1. **`/refine-ticket`** hardens a Jira ticket's acceptance criteria against a "bulletproof" rubric (grounded in the existing automation + app docs) and writes the refined ACs back to Jira — so the next step has nothing to guess.
2. **`/from-issue`** reads the refined ticket through the **Atlassian MCP**, generates tests + Page Objects (scaffolding new ones via `/scaffold-page-object`, verifying selectors live via `playwright-cli`), runs them, writes a committed TCMS record, and opens a **GitHub PR**.
3. **CI on the PR** runs **only the spec files that PR changed** + a **typecheck + strict-lint gate** — fast, focused feedback.
4. **A human reviews and merges** — the PR is the review gate.
5. **CI on merge** runs the **full suite**, **syncs the catalog to Qase**, and commits the refreshed id map back — so the mirror stays accurate with zero manual steps.

---

## Highlights

- 🎫 **Ticket-to-PR automation** — `/from-issue SW-123` turns a Jira story into a passing, reviewed Playwright PR.
- 🧩 **Composed Page Objects** — strict Page Object + Component model (`Header`, `Footer`, `CartBadge`, `BurgerMenu`) with enforced composition rules.
- 🔐 **Data-driven auth matrix** — Playwright projects derive from a single `AUTH_USERS` array; the toolchain grows the matrix one user at a time, only as tickets need it.
- 🗂️ **Opt-in TCMS mirror** — one-way code→[Qase](https://qase.io) sync at merge: human-readable cases with steps, per-case Jira provenance, and an auto-maintained id map.
- ⚡ **Smart CI** — PRs run only their changed specs; merges run the full suite; a typecheck + `--max-warnings 0` lint gate blocks regressions before they land.
- 🌐 **Config-driven** — base URL, credentials, and TCMS settings come from env; point it at a different app without touching code.
- 📚 **Documented decisions** — every architectural choice is an ADR; the AI rules live in [`CLAUDE.md`](CLAUDE.md).

---

## Tech stack

| Area           | Choice                                                          |
| -------------- | --------------------------------------------------------------- |
| Runtime / lang | Node 22 · TypeScript 5.9 (strict)                               |
| Test runner    | Playwright 1.59 (`@playwright/test`)                            |
| Quality gates  | ESLint v9 flat config + `eslint-plugin-playwright` · Prettier 3 |
| CI/CD          | GitHub Actions                                                  |
| TCMS           | Qase (REST, behind a swappable seam)                            |
| Ticket source  | Jira (via the Atlassian MCP)                                    |
| AI authoring   | Claude Code custom skills + `@playwright/cli`                   |

---

## The AI-assisted workflow (skills)

The authoring layer is four composable [Claude Code skills](.claude/skills/). They build on each other top-down:

| Skill                       | What it does                                                                                                                     | Writes to        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **`/refine-ticket`**        | Hardens a Jira ticket's ACs against a rubric; writes the refined criteria back. ([guide](docs/refine-ticket.md))                 | Jira             |
| **`/from-issue`**           | Reads a ticket → generates tests + Page Objects → runs them → opens a GitHub PR (+ a TCMS record). ([guide](docs/from-issue.md)) | Repo + GitHub PR |
| **`/scaffold-page-object`** | Generates a draft Page Object from a live page snapshot, composing detected components. ([guide](docs/scaffold-page-object.md))  | Repo             |
| **`playwright-cli`**        | Drives a real browser to discover/verify selectors and read the rendered DOM before authoring. ([guide](docs/playwright-cli.md)) | — (read-only)    |

`/from-issue` is the conductor: it calls `/scaffold-page-object` when a Page Object doesn't exist yet, uses `playwright-cli` to confirm selectors, grows the auth harness when a ticket needs an unwired user, and surfaces every assumption it made in the PR body for the reviewer.

> **📋 See a real example →** [**PR #25 — _automate SW-11 burger menu scenarios_**](https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/pull/25) is an actual `/from-issue` pull request from this repo. Its description carries the auto-generated **"What I understood"** summary, the **AC-coverage table**, the **⚠️ Assumptions** the agent flagged for review, and the verification results — exactly what a reviewer reads before merging.

<!-- 📷 IMAGE SLOT — Screenshot of a real /from-issue PR body (the "What I understood" + AC-coverage table + Assumptions block) — it shows the skills' reasoning nicely. A live example is linked just above (PR #25). Replace with: ![generated-pr](docs/images/from-issue-pr.png) -->

---

## Architecture

Strict, one-directional composition: **tests know Pages; Pages compose Components; Components hold Locators.** Tests never touch a raw Locator.

```mermaid
flowchart TD
    Spec["Spec — one per feature<br/>tests/.../*.spec.ts"] -->|"imports test/expect"| Fix["Fixture — @fixtures/test<br/>(injects ready Page Objects)"]
    Fix --> Pages
    subgraph Pages["Page Objects — src/pages"]
        LP[LoginPage]
        IP[InventoryPage]
        CP[CartPage]
        CK["checkout/ — Info · Overview · Complete"]
    end
    Pages -->|compose| Comps
    subgraph Comps["Components — src/components"]
        H[Header]
        F[Footer]
        CB[CartBadge]
        BM[BurgerMenu]
    end
    Comps -->|hold| Loc["Locators — data-test / getByRole"]
    Pages -.->|"page-direct locators"| Loc
```

<!-- 📷 IMAGE SLOT — A cleaner architecture/composition diagram (or a layered "onion" view). Replace with: ![architecture](docs/images/architecture.png) -->

**Key ideas:**

- **Composition rules are enforced** — e.g. Pages never return other Pages, queries return data (never `Locator`), component nesting depth ≤ 2. The full list is in [`CLAUDE.md`](CLAUDE.md) and [`docs/architecture.md`](docs/architecture.md).
- **Fixtures inject ready Page Objects** — specs `import { test, expect } from '@fixtures/test'` and receive `loginPage`, `inventoryPage`, … pre-wired.
- **Data-driven projects** — `playwright.config.ts` derives its projects from `tests/users.ts` `AUTH_USERS` (`['standard', 'problem']` today). Each user yields a `setup-<user>` (storageState) + `chromium-<user>` project, plus `chromium-no-auth`. New users wire in on demand; cross-browser is a deliberate separate decision ([ADR-0004](docs/adr/)).
- **Role tags route tests to projects** — `@no-auth`, `@standard`, `@problem`, `@all-users`, `@smoke` (see the tag table in [`CLAUDE.md`](CLAUDE.md)).

**Coverage so far:** login · inventory (content + sort) · footer · cart · checkout (information → overview → complete) · logout · burger menu.

---

## TCMS mirror (Qase)

An **opt-in, one-way** mirror so non-technical reviewers can browse human-readable cases. Off unless `QASE_*` is configured.

- **At merge**, CI runs `tcms:sync` — it creates/updates/archives Qase **cases** (suite tree `feature › context › bucket`, steps from `test.step`, expected result = the ticket's AC text, per-case Jira provenance) and commits the refreshed `qase-map.json` (the test→case id index) back to the branch. **No run is created** — merges stay noise-free.
- **Runs are explicit** — `npm run qase:smoke` / `qase:regression` execute a scope _and_ record a labeled Qase run; `tcms:run` records an ad-hoc run from the last results.
- **Swappable** — `src/tcms/qase-client.ts` is the only Qase-aware file; it implements a tool-agnostic seam, so Xray/Zephyr/etc. is a sibling client. Full design in [`docs/tcms.md`](docs/tcms.md).

<!-- 📷 IMAGE SLOT (Qase board) — Paste a screenshot of the Qase board/dashboard here: the suite tree, a case with its steps + "Covers Jira SW-x" link, or the runs view — whichever reads best. Replace with: ![qase board](docs/images/qase-board.png) -->

---

## Continuous integration

One workflow ([`.github/workflows/test.yml`](.github/workflows/test.yml)), two behaviors:

| Event              | What runs                                                                                     | Why                                              |
| ------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Pull request**   | typecheck + lint (`--max-warnings 0`) → **only the spec files the PR changed**                | Fast, focused feedback; scales to large suites   |
| **Push to `main`** | typecheck + lint → **full suite** → Qase catalog sync → auto-commit refreshed `qase-map.json` | A complete gate + an always-accurate TCMS mirror |

The "changed specs only" selection is a deliberate choice over Playwright's `--only-changed` (which follows the import graph and re-runs the world when a shared fixture changes) — the full suite on merge is the real integration gate.

---

## Getting started

### Prerequisites

- Node.js **22.x** or newer · `git` · ~300 MB free disk for the Chromium browser

### Install & run

```bash
git clone https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo.git
cd playwright-ia-automation-framework-saucedemo
npm install
npx playwright install chromium
cp .env.example .env          # baseURL + password (saucedemo defaults work out of the box)
npm test                      # full suite, green in ~under a minute
```

> The AI-authoring workflow (the `/from-issue` etc. skills) additionally requires Claude Code, the Atlassian MCP connected, and `gh` authenticated. The tests themselves need none of that.

---

## npm scripts

| Script                                           | What it does                                               |
| ------------------------------------------------ | ---------------------------------------------------------- |
| `npm test`                                       | Full matrix across all data-driven projects                |
| `npm run test:standard`                          | Only `chromium-standard` (fast local iteration)            |
| `npm run test:smoke` / `test:regression`         | `@smoke`-tagged tests / the full suite (run-only, no TCMS) |
| `npm run test:debug` / `test:headed` / `test:ui` | Standard project under Inspector / headed / UI mode        |
| `npm run test:unit`                              | Browserless unit tests for the TCMS modules                |
| `npm run report` / `codegen`                     | Open the last HTML report / Playwright codegen             |
| `npm run typecheck`                              | `tsc --noEmit` (strict)                                    |
| `npm run lint` / `lint:fix`                      | ESLint (`--max-warnings 0`) / with autofix                 |
| `npm run format` / `format:check`                | Prettier write / check                                     |
| `npm run qase:smoke` / `qase:regression`         | Run a scope **and** record a labeled Qase run              |
| `npm run tcms:sync` / `tcms:run`                 | Sync the Qase catalog / record an ad-hoc Qase run          |

---

## Project structure

```
.
├── src/
│   ├── pages/          # Page Objects (LoginPage, InventoryPage, CartPage, checkout/*)
│   ├── components/     # Reusable components (Header, Footer, CartBadge, BurgerMenu)
│   ├── fixtures/       # Playwright fixture — injects Page Objects into tests
│   ├── tcms/           # Qase TCMS mirror (seam, case-mapper, sync, client)
│   └── utils/          # env config (single process.env read point) + logger
├── data/               # Reference data (shared/products.json) + typed loaders (@data/*)
├── tests/              # Specs (one folder per feature) + auth.setup.ts + users.ts
├── auth/               # Generated storageState (git-ignored)
├── .claude/skills/     # AI authoring skills (from-issue, refine-ticket, scaffold-page-object, playwright-cli)
├── docs/               # architecture, app/, adr/, skill guides, tcms, superpowers/
└── .github/workflows/  # GitHub Actions CI
```

---

## Configuration

All environment config flows through `src/utils/env.ts` (the single `process.env` read point). Copy `.env.example` → `.env`:

| Variable             | Required | Purpose                                                  |
| -------------------- | -------- | -------------------------------------------------------- |
| `SAUCEDEMO_BASE_URL` | no       | App under test (defaults to `https://www.saucedemo.com`) |
| `SAUCEDEMO_PASSWORD` | yes      | Login password (saucedemo's `secret_sauce`)              |
| `QASE_API_TOKEN`     | no       | Enables the Qase TCMS mirror (unset = mirror off)        |
| `QASE_PROJECT_CODE`  | no       | Qase project code                                        |
| `QASE_API_HOST`      | no       | Override only for self-hosted Qase                       |

In CI these are GitHub Actions secrets.

---

## Documentation

| File                                             | Purpose                                             |
| ------------------------------------------------ | --------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                         | AI rules — auto-loaded by Claude Code               |
| [`docs/architecture.md`](docs/architecture.md)   | Framework structure, composition rules, conventions |
| [`docs/from-issue.md`](docs/from-issue.md)       | The ticket-to-PR skill, in depth                    |
| [`docs/refine-ticket.md`](docs/refine-ticket.md) | The ticket-hardening skill                          |
| [`docs/tcms.md`](docs/tcms.md)                   | The Qase TCMS mirror design                         |
| [`docs/app/`](docs/app/)                         | About the app under test (saucedemo users + flows)  |
| [`docs/adr/`](docs/adr/)                         | Architecture Decision Records (numbered)            |
| [`docs/runbook.md`](docs/runbook.md)             | Operational runbook                                 |
