# Phase C.1 — `/scaffold-page-object` Skill (Design)

**Date:** 2026-05-15
**Status:** Approved (brainstorming complete; ready for implementation plan)
**Scope:** Phase C.1 only — the first project-specific Claude Code skill that scaffolds a Page Object class from a live page. Sub-phases C.2 (`/from-issue` orchestrator), C.3 (catalog expansion), and optional C.4 (test-writer sub-agent) are deferred to their own specs.

---

## 1. Overview

### Goal

Add a custom Claude Code skill `/scaffold-page-object` that, given a URL + page name + storageState, produces a draft Page Object class file at `src/pages/<Name>.ts` (or `scratch/<Name>.ts` for experimentation). The Page Object follows the framework's conventions: `readonly` locator fields, constructor wiring, action methods inferred from the live page snapshot, and composition of existing Header/CartBadge/ProductCard/SortDropdown components when detected.

By end of C.1, a fresh Claude Code session in this repo can be told:

> Use the scaffold-page-object skill to create a CheckoutCompletePage from https://www.saucedemo.com/checkout-complete.html using auth/standard.json.

…and a draft `src/pages/checkout/CheckoutCompletePage.ts` lands on disk, ready for review.

### Why this exists

Phase B.2 added the vendored `@playwright/cli` skill — Claude can now drive a browser. Phase C.1 builds the first **project-specific** skill on top: instead of "I want to inspect a page" (playwright-cli), C.1 offers "I want a Page Object for this page" — a higher-level intent the framework actually cares about.

C.1 is bottom-up groundwork for the larger Phase C arc:

- **C.1** (this spec): one skill, no GitHub integration, manual invocation
- **C.2**: `/from-issue` orchestrator that reads a GitHub Issue and calls C.1's skill, then opens a PR
- **C.3**: catalog expansion to handle 2-3 more issue label types
- **C.4** (conditional): test-writer sub-agent if test bodies become complex

C.2 will reuse C.1 as its primary tool. Building C.1 first means C.2 has a real artifact to compose, not a stub.

### Phase C decomposition (locked during brainstorming)

| Sub-phase  | Builds                                 | Status      |
| ---------- | -------------------------------------- | ----------- |
| C.1 (this) | `/scaffold-page-object` skill          | In design   |
| C.2        | `/from-issue` orchestrator (one label) | Future spec |
| C.3        | Catalog expansion (2-3 more labels)    | Future spec |
| C.4        | Test-writer sub-agent (if needed)      | Conditional |

Phase C end-state vision: **draft-and-review** — file a labeled GitHub Issue, orchestrator opens a PR you must review and approve before merge. **Small typed catalog** of 3-5 issue labels at full maturity. **Manual invocation** in Claude Code session (GitHub Action automation deferred to Phase D).

### What this is NOT

- Not GitHub Issue reading — that's C.2
- Not opening a PR — that's C.2
- Not generating a companion smoke test — also C.2 (where issue context tells us what to test)
- Not auto-running `npm test` to refresh storageState if missing — skill aborts and asks the user
- Not file overwrites or merging — skill refuses if the target file exists
- Not detecting arbitrary unknown components — only the four known framework components (Header, CartBadge, ProductCard, SortDropdown)

---

## 2. Decision log

| #   | Decision                                                                                  | Rationale                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Skill writes a complete `.ts` file to disk** (not a markdown report in chat)            | "Closest to done" output; C.2 orchestrator can pick the file up and commit it without re-parsing markdown blocks.                                      |
| 2   | **Use existing storageState files for auth** (no inline login)                            | Reuses Phase A's `auth.setup.ts` work; skill stays small; matches the framework's existing auth pattern; no credential handling in skill code.         |
| 3   | **Generate locators + obvious action methods** (no companion smoke test in C.1)           | Sweet spot: enough to be useful in a PR diff, simple enough that AI gets it right reliably. Smoke test generation deferred to C.2 with issue context.  |
| 4   | **Compose known components when detected** (Header, CartBadge, ProductCard, SortDropdown) | Generated code follows ADR-0001's "refactor shared UI into a Component" rule. SKILL.md hardcodes the 4 known components; arbitrary detection deferred. |
| 5   | **Skill is procedural prose** (SKILL.md + `references/` markdown), not code               | Same pattern as the vendored `playwright-cli` skill. Pure prose is simpler for AI to follow than a hybrid prose+script setup.                          |
| 6   | **Skill refuses to overwrite existing files**                                             | Prevents accidental destruction. User must `rm` and retry. Predictable, no surprise data loss.                                                         |
| 7   | **Smoke test writes to gitignored `scratch/` directory, not `src/pages/`**                | No "Scaffold"-suffixed clones polluting the framework. `scratch/` is the documented experimentation area for any skill that produces files.            |
| 8   | **Skill takes an explicit output path** (`scratch/<Name>.ts` or `src/pages/<Name>.ts`)    | Same skill serves real usage AND verification; no special "test mode" branch in the skill logic.                                                       |
| 9   | **First project-specific skill establishes the pattern** (ADR-0008 documents it)          | C.2/C.3 will follow the same conventions (where skills live, structure, allowed-tools, references). Locking the pattern now prevents drift.            |
| 10  | **No changes to `src/`, `tests/`, `data/`, `playwright.config.ts`, CI**                   | C.1 is a skill + docs phase. The framework code stays untouched.                                                                                       |

---

## 3. Architecture

### 3a. Skill file structure

New directory: `.claude/skills/scaffold-page-object/`

```
.claude/skills/scaffold-page-object/
├── SKILL.md                       # frontmatter + procedural workflow
└── references/
    ├── page-object-template.md    # canonical TS template the skill produces
    └── component-detection.md     # how to recognize the 4 known components
```

`SKILL.md` frontmatter:

```yaml
---
name: scaffold-page-object
description: Generate a draft Page Object class from a live page snapshot, composing known framework components (Header, CartBadge, ProductCard, SortDropdown) when detected.
allowed-tools: Bash(playwright-cli:*) Bash(npx:*) Read Glob Grep Write
---
```

The body is a numbered workflow Claude executes when the skill is invoked.

### 3b. Workflow Claude follows (12 steps)

1. **Validate inputs.** Required: URL, page name (e.g., `CheckoutCompletePage`). Optional: output path (default per step 10), storageState path (no auth assumed if omitted). If any required field is missing, ask the user; don't guess.
2. **Verify storageState file exists** (if provided). If missing, abort with: _"storageState file not found at `<path>`. Run `npm test` (or `npx playwright test --project=setup`) to generate it."_
3. **Refuse to overwrite.** If the output path already exists, abort with: _"`<path>` exists. `rm` it and re-run, or pick a different output path."_
4. **Load existing component knowledge.** Glob `src/components/*.ts`; Read each to extract the root selector signature (e.g., `Header` is detected by the `#react-burger-menu-btn` locator inside its constructor). The four signatures are also pre-documented in `references/component-detection.md` as a fallback.
5. **Open page via playwright-cli.** If storageState was provided, run `playwright-cli state-load <path>` first. Then `playwright-cli goto <url>`.
6. **Snapshot the page.** `playwright-cli snapshot` returns a structured tree with element refs.
7. **Detect known components.** Walk the snapshot for the four known component signatures from step 4. Mark each detected component for composition (not re-generation of its locators).
8. **Generate locators for non-component elements.** For each remaining interactive element (excluding any covered by detected components): `playwright-cli generate-locator <ref>` to get a stable selector. Pick a semantic field name from the element's accessible label or text content (button "Continue" → `continueButton`, input labeled "First Name" → `firstNameInput`).
9. **Render the Page Object** following `references/page-object-template.md`. Includes: imports (`type Page`, `type Locator`, detected component classes), class declaration, `readonly` fields (composed components first, page-direct locators second per ADR-0001 rule #6), constructor wiring (same order), action methods inferred from element types (button → `click<Name>()`, input → `fill<Name>(value)`).
10. **Write the file** to the output path (default `src/pages/<Name>.ts`; checkout pages auto-route to `src/pages/checkout/<Name>.ts` when URL contains `/checkout-step` or `/checkout-complete` AND user hasn't overridden the path).
11. **Run typecheck.** `npx tsc --noEmit` (full project typecheck). This validates the file IF it landed inside `src/pages/` (which is in `tsconfig.json`'s `include`). For files written to `scratch/` (outside `include`), typecheck won't see them — the skill notes this in the report so the user knows to eyeball the scratch file manually. If real-path typecheck errors, leave the file in place and report them.
12. **Report what landed.** Include: file path, list of composed components, list of generated locators + action methods, typecheck result.

### 3c. Page Object output template (`references/page-object-template.md`)

Fixed template Claude fills in. Annotated for the skill's reference:

```typescript
import { type Locator, type Page } from '@playwright/test';
// ONE of these per detected component:
import { Header } from '@components/Header';

export class <Name>Page {
  // Composed components first (ADR-0001 rule #6)
  readonly header: Header;

  // Page-direct locators second
  readonly pageTitle: Locator;
  readonly continueButton: Locator;
  // ... one readonly Locator per remaining interactive element

  constructor(public readonly page: Page) {
    // Wire components first
    this.header = new Header(page);
    // Then page-direct locators (data-test preferred per CLAUDE.md selector preference order)
    this.pageTitle = page.locator('[data-test="title"]');
    this.continueButton = page.getByRole('button', { name: /^Continue$/i });
  }

  async clickContinue(): Promise<void> {
    await this.continueButton.click();
  }
  async fillFirstName(value: string): Promise<void> {
    await this.firstNameInput.fill(value);
  }
}
```

The skill picks selectors per CLAUDE.md's selector preference order (data-test → getByRole anchored regex → text → CSS), using `playwright-cli generate-locator` output as the source of truth.

### 3d. Component detection reference (`references/component-detection.md`)

Hardcoded signatures for the 4 known framework components. Each entry: component name, import path, root selector signature, what to skip in the snapshot if detected.

| Component      | Import path                | Root signature                                     | When detected, skip these elements                                                          |
| -------------- | -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Header`       | `@components/Header`       | `#react-burger-menu-btn` AND `.app_logo` present   | burger menu, logo, cart icon, logout link, navigation links                                 |
| `CartBadge`    | `@components/CartBadge`    | `[data-test="shopping-cart-badge"]` (when count>0) | the badge counter span                                                                      |
| `ProductCard`  | `@components/ProductCard`  | `[data-test="inventory-item"]` (multiple)          | per-card name, price, add/remove buttons (use `new ProductCard(page, productName)` instead) |
| `SortDropdown` | `@components/SortDropdown` | `[data-test="product-sort-container"]`             | the sort `<select>` element                                                                 |

Header always implies CartBadge availability (Header composes CartBadge per Phase A).

### 3e. Scratch directory convention

A new top-level directory `scratch/` is the documented experimentation area:

- Add `scratch/` to `.gitignore`
- Add `scratch/**` to `tsconfig.json`'s `exclude` array — TypeScript skips the scratch directory, so a half-baked AI-generated file there can't break `npm run typecheck` for the rest of the project. The skill's per-file typecheck in step 11 still runs against the new file via `npx tsc --noEmit <path>` (or with a temporary include override) so the user gets feedback on the generated content.
- The skill writes there for verification (smoke test) and any ad-hoc exploration
- Nothing in `scratch/` is committed; nothing in `src/pages/` is duplicated
- Pattern reusable for any future skill that produces files

### 3f. What this does NOT touch

- The vendored `playwright-cli` skill — used as-is, no modification
- `playwright.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`
- `src/`, `tests/`, `data/`, `auth/`
- `.github/workflows/test.yml`
- `package.json` / `package-lock.json` — no new npm dependencies

---

## 4. Verification

Same shape as Phase B.2: manual smoke test in a fresh Claude Code session, since custom skills only run inside that context.

### 4a. Smoke test, three steps

**Step 1 — Skill discoverable.** Open a fresh Claude Code session in this repo. Type `/skills`. Expected: both `playwright-cli` AND `scaffold-page-object` are listed; the new one shows the description from §3a frontmatter ("Generate a draft Page Object class from a live page snapshot, composing known framework components (Header, CartBadge, ProductCard, SortDropdown) when detected.").

**Step 2 — Unauthenticated page.** Paste:

> Use the scaffold-page-object skill to create a `LoginPage` from https://www.saucedemo.com — no auth needed. Write to `scratch/LoginPage.ts`.

Expected: skill executes the 12-step workflow, opens the page, snapshots, generates locators for username/password/login-button, writes a complete TypeScript file. Report shows: file `scratch/LoginPage.ts` written, no Header detected, 3 page-direct locators, 1 action method (`clickLogin`), typecheck passes.

**Step 3 — Authenticated page.** Paste:

> Use the scaffold-page-object skill to create a `CartPage` from https://www.saucedemo.com/cart.html using `auth/standard.json`. Write to `scratch/CartPage.ts`.

Expected: skill loads storageState, detects `Header` component, composes it instead of regenerating its locators. The generated file imports `Header` and has `readonly header: Header` as the first field; page-direct locators cover the cart-list / continue-shopping / checkout buttons. Typecheck passes.

If all three pass, the skill is healthy. The `scratch/` artifacts can be eyeballed against the real `src/pages/CartPage.ts` to gauge how close the AI got, then discarded.

### 4b. Failure modes documented in `docs/scaffold-page-object.md`

- **`auth/<file>.json` missing on Step 3** → skill aborts with the documented message
- **Target file already exists** → skill aborts; user must `rm` and retry
- **No interactive elements found** → skill aborts; user checks URL and storageState validity
- **Generated file fails typecheck** → skill leaves file in place and reports errors

### 4c. What we cannot verify automatically

- That generated locators are stable across deployments (saucedemo's `data-test` is reliable; not a general guarantee)
- That action method names are sensible (`clickContinue` vs `proceedToCheckout` — semantic, not testable)
- That a C.1 output will pass C.2's orchestrator review (we'll find out in C.2)

---

## 5. Acceptance criteria (Phase C.1 Definition of Done)

| #   | Criterion                                                                                                                                                                                                                                          | How to verify                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | `.claude/skills/scaffold-page-object/SKILL.md` exists, is committed, has the frontmatter from §3a (`name`, `description`, `allowed-tools` covering Bash + Read + Glob + Grep + Write)                                                              | `git ls-files .claude/skills/scaffold-page-object/SKILL.md`; `head -5` shows the frontmatter              |
| 2   | `.claude/skills/scaffold-page-object/references/page-object-template.md` and `component-detection.md` exist and are committed                                                                                                                      | `git ls-files .claude/skills/scaffold-page-object/references/` returns 2 entries                          |
| 3   | `scratch/` is gitignored                                                                                                                                                                                                                           | `.gitignore` contains the rule; `git check-ignore scratch/anything.ts` exits 0                            |
| 4   | `docs/scaffold-page-object.md` exists with all 6 H2 headings (What is / How wired / Verifying / Worked examples / When NOT to use / Pointers)                                                                                                      | File exists; section grep finds 6 H2 headings                                                             |
| 5   | `docs/adr/0008-custom-skills-pattern.md` exists, follows Nygard format (Context/Decision/Consequences/Alternatives), under 80 lines                                                                                                                | File exists; line count < 80; section grep finds 4 ADR headings                                           |
| 6   | `CLAUDE.md` has a new "Custom skills" section (~8 lines); CLAUDE.md still under 150 lines total                                                                                                                                                    | Section grep + `(Get-Content CLAUDE.md).Count` < 150                                                      |
| 7   | Smoke test Step 1 passes — `/skills` lists both `playwright-cli` AND `scaffold-page-object`                                                                                                                                                        | Manual run, recorded in DoD evidence                                                                      |
| 8   | Smoke test Step 2 passes — skill writes `scratch/LoginPage.ts`; expected fields/methods present; file is syntactically valid TypeScript on manual review (project typecheck doesn't see `scratch/` since it's outside `tsconfig.json`'s `include`) | Manual run; inspect generated file in editor — TS extension flags any errors                              |
| 9   | Smoke test Step 3 passes — skill writes `scratch/CartPage.ts`; file imports and composes `Header`; syntactically valid TypeScript on manual review (same caveat as #8)                                                                             | Manual run; inspect for `import { Header } from '@components/Header'` and `readonly header: Header` field |
| 10  | `npm run typecheck && npm run lint && npm run format:check && npm test` all exit 0; test count remains **62**                                                                                                                                      | Run all four; assert test count                                                                           |
| 11  | Annotated tag `phase-c1-complete` exists locally                                                                                                                                                                                                   | `git tag -l phase-c1-complete -n5`                                                                        |

---

## 6. File deliverables summary

**New files (5):**

- `.claude/skills/scaffold-page-object/SKILL.md`
- `.claude/skills/scaffold-page-object/references/page-object-template.md`
- `.claude/skills/scaffold-page-object/references/component-detection.md`
- `docs/scaffold-page-object.md` (~200-250 lines)
- `docs/adr/0008-custom-skills-pattern.md` (Nygard, < 80 lines)

**Modified files (3):**

- `.gitignore` — add `scratch/` rule
- `tsconfig.json` — add `scratch/**` to `exclude` so TypeScript skips throwaway scratch files
- `CLAUDE.md` — add "Custom skills" section (~8 lines)

**Unchanged:**

- `playwright.config.ts`, `tsconfig.json`, `eslint.config.js`, `.prettierrc.json`, `.env.example`
- All files under `src/`, `tests/`, `data/`, `auth/`
- All Phase B.2 docs and skill files
- `package.json`, `package-lock.json`
- `.github/workflows/test.yml`
- README.md (skill is internal AI capability, not user-facing tech stack)

---

## 7. Out of scope (deferred to later phases)

| Deferred to                 | What                                                                                                                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phase C.2**               | `/from-issue` orchestrator that reads a GitHub Issue (via `gh`), routes by label, calls C.1's skill, opens PR via `gh pr create`. Companion smoke-test generation lands here.                |
| **Phase C.3**               | Catalog expansion — add 2-3 more labels (e.g., `add-scenario`, `fix-flake`). Each adds a new skill or extends C.1's pattern.                                                                 |
| **Phase C.4 (conditional)** | Test-writer sub-agent if test bodies become complex enough that inline templating in C.2/C.3 isn't holding up.                                                                               |
| **Phase D**                 | GitHub Action that triggers the orchestrator on issue label; auto-running CLI in CI; pre-commit hook using CLI to validate selectors                                                         |
| **Out of scope (rejected)** | Inline login (skill stays storageState-only); arbitrary component detection beyond the 4 known framework components; auto-overwriting existing Page Object files; full autonomy / auto-merge |
