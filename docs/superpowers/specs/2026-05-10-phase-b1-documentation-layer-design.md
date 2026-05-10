# Phase B.1 — Documentation Layer (Design)

**Date:** 2026-05-10
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Scope:** Phase B.1 only — the documentation/AI-context layer. Phase B.2 (MCP servers setup) is deferred to its own brainstorm cycle. Phase C (AI workflow automation) and Phase D (self-maintenance loop) are also deferred.

---

## 1. Overview

### Goal

Build the documentation layer that AI agents (and humans) will use as their primary reference for the framework. This is the foundation for Phase C's `/from-jira` workflow — without good docs, AI agents in Phase C will make poor decisions about where to put code, which patterns to follow, and how the app under test behaves.

The deliverables follow the 2026 industry standard for AI-assisted dev projects:

- A **two-layer doc system**: short always-loaded rules (`CLAUDE.md`) + on-demand reference (`/docs/*.md`)
- **Separation of framework docs from app-under-test docs** — the framework will outlive any single app it tests
- **Architecture Decision Records (ADRs)** capturing the *why* of foundational decisions
- **Placeholder files** for known-future docs, with comments explaining why deferred

### Why this exists

Three concrete problems Phase B.1 solves:

1. **Onboarding (human and AI):** A fresh clone has no entry point. `README.md` and `CLAUDE.md` give immediate context to whoever (or whatever) opens the repo.
2. **AI extension quality:** AI agents in Phase C will write tests, pages, components. Without `CLAUDE.md` rules and architectural references, AI follows generic patterns instead of *this* framework's patterns. Convention drift compounds across PRs.
3. **Decision continuity:** The Phase A/A.5 design specs contain rich decision rationale, but they're long-form documents. ADRs distill the architecturally significant decisions into short, addressable, link-able units that AI and humans can reference quickly.

### Why split B.1 from B.2 (MCP)

Documentation work is mostly markdown writing — predictable, parallelizable, no external dependencies. MCP server setup involves installing real services (Playwright MCP, Atlassian MCP, GitHub MCP), configuring auth credentials, dealing with each server's quirks. Different DoD criteria, different failure modes. Splitting them gives cleaner ship cycles.

### What this is NOT

- Not Phase C work (skills, slash commands, sub-agents — those use these docs but don't define them)
- Not MCP setup (Phase B.2)
- Not auto-update hooks (Phase D)
- Not a generated/scraped doc system — every file is hand-written for clarity
- Not a complete content set — 3 files are intentional placeholders for future filling

---

## 2. Decision log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Two-layer doc system** (`CLAUDE.md` always-loaded; `/docs/*` on-demand) | Industry standard in 2026 (Anthropic, Cursor, GitHub Copilot all converge); keeps `CLAUDE.md` lean to avoid bloating every AI context window |
| 2 | **`CLAUDE.md` at repo root** (not `AGENTS.md` or `.cursorrules`) | Native convention for Claude Code (the tool the project's AI workflow targets) |
| 3 | **Separate `/docs/app/` for the app under test** | The framework will outlive any single app; app docs scope per-app and need their own lifecycle |
| 4 | **ADRs in `/docs/adr/` with Michael Nygard format** (Context/Decision/Consequences/Alternatives) | Industry standard since ~2018 (ThoughtWorks, Spotify); short numbered files; AI agents can reference by ID |
| 5 | **Five starter ADRs** (not all 26 decisions from Phase A/A.5 specs) | ADRs are for *architecturally significant* decisions only; the rest stay in long-form design specs |
| 6 | **Placeholder files for known-future docs** with comment block explaining deferral | User's explicit ask — keeps "future reference" without committing to write content prematurely |
| 7 | **`README.md` includes CI status badge** | Standard practice; signals project health at a glance |
| 8 | **Keep `docs/superpowers/specs/` and `docs/superpowers/plans/` untouched** | Those are *our* design artifacts (this brainstorm/plan/exec process), not the framework's external docs |
| 9 | **No `CONTRIBUTING.md` content yet** (placeholder only) | Solo project; no external contributors; CLAUDE.md absorbs the AI-side guidance |
| 10 | **No glossary content yet** (placeholder only) | Domain is small (saucedemo has ~10-15 terms total); a glossary file is overhead until terms accumulate |
| 11 | **No runbook content yet** (placeholder only) | No incidents to document yet; runbook fills naturally as flakes/failures emerge |

---

## 3. File structure

```
/
├── README.md                        # NEW — human-facing entry point
├── CLAUDE.md                        # NEW — always-loaded AI rules
├── CONTRIBUTING.md                  # NEW (PLACEHOLDER) — deferred
│
├── docs/
│   ├── architecture.md              # NEW — framework structure & rules
│   ├── runbook.md                   # NEW (PLACEHOLDER) — deferred
│   │
│   ├── app/
│   │   ├── overview.md              # NEW — saucedemo introduction
│   │   ├── users.md                 # NEW — 6 users + behaviors
│   │   ├── flows.md                 # NEW — login/browse/sort/cart/checkout
│   │   └── glossary.md              # NEW (PLACEHOLDER) — deferred
│   │
│   └── adr/
│       ├── 0000-template.md         # NEW — Nygard ADR template
│       ├── 0001-pom-by-component.md
│       ├── 0002-multi-user-via-projects-storage-state.md
│       ├── 0003-data-hybrid-shared-scenarios.md
│       ├── 0004-cross-browser-smoke-pattern.md
│       └── 0005-esm-import-attributes-for-json.md
│
└── docs/superpowers/                # exists, no changes
    ├── specs/
    └── plans/
```

**Total new files: 15** (6 framework/app docs + 1 ADR template + 5 ADRs + 3 placeholders).

| Category | Files | Count |
|---|---|---|
| Framework/app docs | `README.md`, `CLAUDE.md`, `docs/architecture.md`, `docs/app/overview.md`, `docs/app/users.md`, `docs/app/flows.md` | 6 |
| ADR template | `docs/adr/0000-template.md` | 1 |
| ADRs (real content) | `docs/adr/0001-pom-by-component.md` through `0005-esm-import-attributes-for-json.md` | 5 |
| Placeholders | `CONTRIBUTING.md`, `docs/runbook.md`, `docs/app/glossary.md` | 3 |
| **Total** | | **15** |

---

## 4. File-by-file content scope

### `README.md` (~100 lines)

**Audience:** Humans cloning the repo for the first time, plus AI agents that read README first for project orientation.

**Sections:**

1. Project name + 1-line description ("Playwright + TypeScript test framework for saucedemo, designed for AI-assisted extension")
2. CI status badge (working `https://github.com/Diegocortes15/playwright-ia-automation-framework-saucedemo/actions/workflows/test.yml/badge.svg` link)
3. Prerequisites (Node 22, `git`, ability to install Playwright browsers)
4. Quick start (4 commands: `git clone`, `npm install`, `cp .env.example .env`, `npm test`)
5. Key npm scripts (table: `test`, `test:standard`, `test:firefox`, `test:webkit`, `test:debug`, `test:ui`, `report`)
6. Project structure (high-level tree, ~15 lines)
7. Documentation pointers (`CLAUDE.md` for AI rules, `docs/architecture.md` for framework, `docs/app/` for saucedemo, `docs/adr/` for decision history)
8. Tech stack (one-liner: Node 22, Playwright 1.59, TypeScript 5.9 strict, ESLint v9 flat config + `eslint-plugin-playwright`, Prettier 3, GitHub Actions)

**Skipped from README:** No License section. License decision is deferred (project ownership not finalized for licensing). Add when ready.

### `CLAUDE.md` (~120 lines)

**Audience:** Claude Code (auto-loaded on every session) and other AI agents that respect the convention.

**Sections:**

1. **Project purpose** (1-2 lines): "Playwright + TypeScript test framework for saucedemo. AI-assisted extension is a first-class workflow — see `docs/architecture.md` and `docs/adr/` for design rationale."
2. **Quick run** (2-3 lines): how to run tests locally; reference to README.md for full setup
3. **Critical rules** (numbered list of 12, condensed from Phase A spec §4):
   - Component knows about Locators and (optionally) child Components only
   - Page composes Components and holds page-unique Locators
   - Pages NEVER return other Pages
   - Tests know about Pages and Data only
   - All locator/component fields are `readonly`
   - Constructor order: composed components first → locators second
   - Action methods read like English
   - Queries return data, never `Locator`
   - Components scoped to one of many take a discriminator
   - Refactor a page-direct locator into a Component the moment a 2nd page needs it
   - Component nesting depth ≤ 2
   - No `await page.waitForTimeout()` ever
4. **Selector preference order**: `data-test` → `getByRole` → text → CSS. Never XPath.
5. **Tag conventions** (table — same as Phase A spec §5): `@no-auth`, `@all-users`, `@standard`, `@problem`, `@performance_glitch`, `@error`, `@visual`, `@sort-functional`
6. **Where things live** (file tree pointers): pages in `src/pages/`, components in `src/components/`, fixtures in `src/fixtures/`, data in `data/`, tests in `tests/`, design history in `docs/adr/`
7. **Pointers**: For framework details → `docs/architecture.md`. For app behavior → `docs/app/`. For decision rationale → `docs/adr/`.

**Hard limit: under 150 lines.** AI loads this on every conversation; bloat = direct cost.

### `CONTRIBUTING.md` (~10 lines, PLACEHOLDER)

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: Solo project; no external contributors yet. AI-side
guidance lives in CLAUDE.md.

When to fill in: First external contributor, or when the project
formalizes a PR/code-review process beyond the current AI workflow.

Until then: Humans see README.md for setup; AI agents follow CLAUDE.md.
-->

# Contributing

(Placeholder — see comment above.)
```

### `docs/architecture.md` (~250 lines)

**Audience:** AI agents extending the framework; humans onboarding into the codebase.

**Sections:**

1. **Overview** — what this framework does (test saucedemo via Playwright + TS) and why it exists (foundation for AI-assisted test automation)
2. **Tech stack** (full versions and roles)
3. **Folder structure** (with file responsibilities, mirrors Phase A spec §3 but expanded with paragraphs)
4. **Composition rules** (full text of the 12 rules from Phase A spec §4 — same content as CLAUDE.md but with prose explanation and examples)
5. **Data layer** (typed loaders, hybrid `shared/` + `scenarios/` layout, `@data/*` alias)
6. **Multi-user infrastructure** (Playwright Projects + storageState + role tags, including the cross-browser smoke pattern)
7. **CI workflow overview** (GitHub Actions, single job, all 9 projects, browser caching strategy)
8. **Where to find more** — pointers to ADRs by topic ("for the POM-by-component decision, see `docs/adr/0001-pom-by-component.md`")

### `docs/runbook.md` (~10 lines, PLACEHOLDER)

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: No incidents to document yet. Runbook content emerges
naturally from real failures.

When to fill in: First persistent flaky test, first CI incident, first
"why does this only fail in webkit?" mystery.

Until then: Use `npm run test:debug`, `npm run test:ui`, and the HTML
report (`npm run report`) for debugging. Inspect Playwright traces in
`test-results/`.
-->

# Runbook

(Placeholder — see comment above.)
```

### `docs/app/overview.md` (~40 lines)

**Audience:** AI agents writing tests for saucedemo flows.

**Sections:**

1. **What saucedemo is** — public e-commerce demo from Sauce Labs, intentionally seeded with bugs to exercise testing tools
2. **Why we use it** — well-known among QA, fully public (no auth secrets), stable URL, designed for test automation training
3. **Base URL** — `https://www.saucedemo.com`
4. **Public credentials note** — the password `secret_sauce` is the actual public password; treated as a secret in our framework for pattern hygiene
5. **Pointers** — `users.md` for accounts, `flows.md` for user journeys

### `docs/app/users.md` (~80 lines)

**Audience:** AI agents picking the right user for a test, or interpreting per-user behavioral differences.

**Format:** One section per user, including: username, password, intended behavior, what tests/projects use it, known bugs (when applicable).

The 6 users:

| User | Test project mapping | Known behavior |
|---|---|---|
| `standard_user` | `standard`, `firefox-standard`, `webkit-standard` | Happy path; sort works; cart works; checkout works |
| `locked_out_user` | `no-auth` (login test only — no storageState) | Login fails with "Sorry, this user has been locked out" |
| `problem_user` | `problem` | Wrong product images on inventory; sort dropdown selections are ignored |
| `performance_glitch_user` | `performance_glitch` | Each navigation has ~10s artificial delay; functionally correct otherwise |
| `error_user` | `error` | Sort dropdown ignored (same as problem_user); intermittent UI glitches |
| `visual_user` | `visual` | Visual regressions intended (font sizes, colors); functional flows work |

### `docs/app/flows.md` (~150 lines)

**Audience:** AI agents writing new tests; reference for human reviewers.

**Sections (one per flow):**

1. **Login** — URL `/`, fields (`[data-test="username"]`, `[data-test="password"]`), button (`[data-test="login-button"]`), success → `/inventory.html`, errors per user
2. **Browse inventory** — URL `/inventory.html`, 6 products, product cards, header with cart badge
3. **Sort** — dropdown (`[data-test="product-sort-container"]`), 4 options (az, za, lohi, hilo), broken on `problem_user`/`error_user`
4. **Cart add/remove** — add-to-cart button per card, badge increments, cart page (`/cart.html`), remove from cart
5. **Checkout 3-step flow**:
   - Info (`/checkout-step-one.html`): firstName/lastName/postalCode + Continue/Cancel
   - Overview (`/checkout-step-two.html`): item list + subtotal/tax/total + Finish/Cancel
   - Complete (`/checkout-complete.html`): "Thank you for your order!" + back-home button
6. **Logout** — open menu (`#react-burger-menu-btn`) → click logout link (`#logout_sidebar_link`)

### `docs/app/glossary.md` (~10 lines, PLACEHOLDER)

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: Saucedemo's domain is small (~10-15 terms total). A
glossary becomes valuable once the term count exceeds ~50 and AI
starts confusing similar concepts (e.g., "cart" vs "basket" vs "bag").

When to fill in: When the framework starts testing apps with rich
business domains, or when AI agents repeatedly use the wrong term in
generated tests.

Until then: Term meanings are clear from `users.md`, `flows.md`, and
the saucedemo UI itself.
-->

# Glossary

(Placeholder — see comment above.)
```

### `docs/adr/0000-template.md` (~30 lines)

The Michael Nygard ADR template, ready to copy for new ADRs.

```markdown
# NNNN — <Decision Title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-NNNN

## Context

What's the situation that requires a decision? What forces are at play?

## Decision

What's the decision? State it clearly.

## Consequences

What happens because of this decision? Both positive and negative.

## Alternatives considered

What other options were evaluated? Why were they rejected?
```

### `docs/adr/0001-pom-by-component.md` (~50 lines)

**Source:** Phase A spec decision #2.

**Content:** Three POM patterns evaluated (Page-with-Components, Component-tree, Flat POM). Decision: Page composes Components. Reasons: best AI code-gen results, dominant 2026 pattern, clean reuse boundaries. Consequences include the strict component scope rules. Alternatives include the rejected fluent-navigation pattern (decision #5).

### `docs/adr/0002-multi-user-via-projects-storage-state.md` (~50 lines)

**Source:** Phase A spec decision #7.

**Content:** Three multi-user approaches evaluated (custom `--runAs` flag, Playwright Projects + storageState, per-test annotations). Decision: Projects + storageState + role tags. Reasons: native Playwright; full matrix in CI; massive speed win from auth-once. Consequences: 7-9 projects in playwright.config; per-user grep patterns; one-time auth setup file.

### `docs/adr/0003-data-hybrid-shared-scenarios.md` (~50 lines)

**Source:** Phase A spec decision #10.

**Content:** Three data-layout patterns evaluated (flat, mirror-POM, hybrid shared+scenarios). Decision: hybrid. Reasons: clear separation between reference data and parameterized inputs; scales well; AI-friendly. Consequences: `data/shared/` for reference, `data/scenarios/<feature>/` for parameterized; typed loaders in `data/fixtures.ts`.

### `docs/adr/0004-cross-browser-smoke-pattern.md` (~50 lines)

**Source:** Phase A.5 spec decision #1.

**Content:** Three cross-browser scopes evaluated (full per-user × per-browser matrix, smoke pattern, no cross-browser). Decision: smoke pattern (chromium full matrix; firefox + webkit on standard user only). Reasons: catches real browser rendering/locator regressions without re-running saucedemo's per-user bugs three times; 62 vs ~120 test instances. Consequences: 9 total projects; firefox/webkit grep mirrors standard chromium grep.

### `docs/adr/0005-esm-import-attributes-for-json.md` (~50 lines)

**Source:** Phase A.5 spec decision #8 + risk resolution.

**Content:** Two JSON-loading approaches evaluated (CommonJS `createRequire` workaround, ESM `with { type: 'json' }` import attributes). Decision: import attributes. Reasons: native ESM standard since Node 22.13; TypeScript 5.7+ supports it; eliminates convention-drift trap of CommonJS escape hatch in ESM file. Consequences: `data/fixtures.ts` uses native imports; documented mitigation plan if toolchain ever stops supporting it.

---

## 5. Placeholder comment format

Every placeholder file uses this exact HTML-comment block at the top:

```markdown
<!--
DEFERRED FROM PHASE B.1.

Status: Placeholder for future content.

Why deferred: <one-line reason>

When to fill in: <one-line trigger>

Until then: <where to find equivalent info, if any>
-->

# <File Title>

(Placeholder — see comment above.)
```

**Rationale for HTML comment + visible body:**
- HTML comment (`<!-- ... -->`) doesn't render in markdown viewers (clean appearance)
- Visible "(Placeholder — see comment above.)" body tells readers in rendered view that the file is intentional, not missing
- AI agents reading the raw file see the full comment block and understand the deferral

---

## 6. Acceptance criteria (Phase B.1 Definition of Done)

1. All 15 new files exist at the exact paths in §3.
2. `README.md` includes a working CI status badge image (renders correctly when viewed on GitHub).
3. `CLAUDE.md` is **under 150 lines**, covers the 12 composition rules + tag conventions + key file pointers.
4. `docs/architecture.md` covers Phase A spec §3 (folder structure) + §4 (composition rules) + cross-browser additions from A.5.
5. `docs/app/users.md` covers all 6 saucedemo users with username, behavior, and project mapping.
6. `docs/app/flows.md` covers login + browse + sort + cart + 3-step checkout + logout.
7. The 5 ADRs (0001–0005) follow the Nygard template exactly: Context / Decision / Consequences / Alternatives.
8. The 3 placeholder files (`CONTRIBUTING.md`, `docs/runbook.md`, `docs/app/glossary.md`) have the standard comment block from §5.
9. `npm run typecheck && npm run lint && npm run format:check` all exit 0.
10. `npm test` still produces 62 passing test instances on full matrix from a clean state.
11. CI run on `main` after merge is green.
12. No code changes outside `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, and `docs/` (this is a documentation-only phase).

---

## 7. Out of scope (deferred)

| Deferred to | What |
|---|---|
| **Phase B.2** | MCP servers setup: Playwright MCP (browser inspection), Atlassian MCP (Jira), GitHub MCP (PR creation) |
| **Phase C** | AI skills (`code-review`, `testrail-export`, etc.); slash commands (`/from-jira`, `/refine-jira`); planner/implementer/reviewer sub-agents; PR creation flow |
| **Phase D** | Post-commit hook to refresh `/docs` automatically; visual regression baselines; pre-commit hooks |
| **Future fill-in** (no phase yet) | Content for `CONTRIBUTING.md`, `docs/runbook.md`, `docs/app/glossary.md` |
| **Out of scope** | Translation/i18n of docs; auto-generated docs from code; ADRs 0006+ (added when new architectural decisions emerge) |
