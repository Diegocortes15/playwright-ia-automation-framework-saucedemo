# Framework Gaps Log — `experiment-rebuild-from-scratch`

Track gaps in the AI skills / framework workflow as they surface during the blank-slate rebuild experiment.

**Dual purpose** (decided after initial planning):

1. **Skill validation**: prove (or expose limits of) the existing skills' ability to rebuild a working saucedemo test suite from `to-be-automated` GitHub Issues alone.
2. **Discovery for `/customize-for-new-app`**: every manual step a developer takes during the rebuild becomes a requirement for a future bootstrap skill (Path B from the universalization design discussion). The goal is empirical input — don't predict what `/customize-for-new-app` needs; observe it.

Each entry below should be concrete (a specific issue with a specific symptom), not speculative.

## Starting state (commit `<TBD>`)

- All hand-written saucedemo implementation deleted: page objects, components, tests, test data, auth setup.
- Framework scaffolding preserved: AI skills, CLAUDE.md, configs, ADRs, GitHub Issue Template, npm scripts.
- `src/fixtures/test.ts` reduced to bare-minimum re-export of Playwright `test` + `expect`.
- `playwright.config.ts` reduced to single `no-auth` chromium project.
- `npm run typecheck` / `lint` / `format:check` all pass; `npx playwright test --list` reports 0 tests.

Target: saucedemo (https://www.saucedemo.com) — same target, blank-slate implementation.

## Known-likely gaps (predictions before experiment runs)

These were flagged during planning. Verify each as you go.

- **G1: `/scaffold-page-object` doesn't register the new page in `src/fixtures/test.ts`.** Generated Page Object lands on disk, but tests referencing it as a fixture (`async ({ loginPage }) => ...`) fail typecheck because the fixture isn't registered. Manual workaround: edit `src/fixtures/test.ts` after each scaffold. Skill fix: extend /scaffold-page-object's workflow Step 11 to also patch the fixtures file.

- **G2: No auth-setup skill.** Saucedemo's `tests/auth.setup.ts` (deleted) produced per-user storageState files. `/from-issue` for any tag other than `@no-auth` will generate tests that fail at runtime because no storageState exists. Manual workaround: hand-write a replacement auth.setup.ts + re-add per-user projects to playwright.config.ts. Skill fix: build `/scaffold-auth-setup` skill that asks for login flow + generates the setup file.

- **G3: No framework-bootstrap skill.** baseURL, project matrix, env vars, CLAUDE.md customization all require manual edits per customer. (Less critical for this experiment since target is still saucedemo — config doesn't need much change.)

- **G4: `/from-issue` may fail if tagged with `@standard` etc. while only `no-auth` project exists.** Tags don't match any project's grep → 0 tests run. Workaround: file issues only with `@no-auth` semantics until auth chain is rebuilt, OR re-add user projects manually first.

## Observed gaps (filled in as the experiment runs)

_Each entry: short title, what happened, manual workaround taken, severity (Critical/Important/Minor), suggested skill fix._

### G-OBS-001 — _(template — replace when first gap surfaces)_

- **What happened:**
- **Manual workaround:**
- **Severity:**
- **Suggested skill fix:**
- **Related issue/PR:**

## Success metrics

- **Bootstrap:** can a fresh contributor get to `npx playwright test --list` reporting 0 tests cleanly without manual fix-up? (✅ as of starting commit.)
- **First test:** can /from-issue produce a working `@no-auth` test on the first try with no manual fixups beyond the issue body?
- **First auth-needing test:** how many manual steps to get a `@standard`-tagged test passing?
- **Full saucedemo coverage rebuild:** can the skills produce equivalent coverage to the original hand-written implementation? How many gaps surfaced?

## When the experiment ends

After enough data accumulates, take stock for BOTH purposes:

**Purpose 1 — existing skill fixes:**

- Prioritize the observed gaps by severity + frequency.
- For each critical gap, spec + ship a skill fix on main (usual brainstorm → spec → plan flow).
- Re-run the experiment on the improved skills.

**Purpose 2 — design `/customize-for-new-app`:**

- Catalog every manual customization step taken during the experiment (e.g., "edited playwright.config.ts to add `standard` project", "wrote tests/auth.setup.ts by hand", "added `loginPage: LoginPage` to fixtures/test.ts").
- That catalog IS the requirements list for the bootstrap skill.
- Brainstorm the skill on main following the same Phase pattern as C.2.a (spec → plan → implementation).
- The skill's job: ask the customer the right questions and do those manual steps automatically.

## Bootstrap-skill requirements (collected during experiment)

Format: each item is a specific manual action you took that a future skill should automate. Reference the issue/commit where it surfaced.

### REQ-001 — Regenerate saucedemo-specific docs for new customer

- **Manual action:** A new customer can't use `docs/architecture.md` (saucedemo-grounded matrix description, 6 users, etc.) or `docs/app/` (entirely saucedemo behavior). These need to be regenerated for the customer's app: their architecture summary, their user roles, their key flows, their edge cases.
- **When it happened (issue/commit):** Identified during experiment planning (commit `e3d420e`), before first `/from-issue` run. Saucedemo docs were NOT wiped on this experiment branch because: (a) skills don't read them, (b) wiping is redundant with what `/customize-for-new-app` should do, (c) the experiment isn't blocked by them.
- **Inputs the skill would need:**
  - Customer app's base URL
  - Customer's user roles (or "none, single user" / "none, no auth")
  - Customer's auth scheme (saucedemo-style storageState? OAuth? SSO?)
  - Key flows the customer wants tested (could be discovered via `/playwright-cli` + LLM site exploration, or provided manually by BA)
- **Outputs the skill would produce:**
  - Fresh `docs/architecture.md` describing THIS customer's matrix (e.g., `2 users × 1 browser = 2 projects` instead of saucedemo's `5×3=9`)
  - Fresh `docs/app/` folder with customer-specific user definitions, flows, edge cases
  - Updated CLAUDE.md "Project purpose" links pointing at the new docs (no broken links)
- **Notes:** This is the first concrete requirement for `/customize-for-new-app`. There will be many more. Each REQ entry should be similarly specific (inputs in, outputs out, manual action that surfaced it).

### REQ-002 — _(template — replace when next manual customization happens)_

- **Manual action:**
- **When it happened (issue/commit):**
- **Inputs the skill would need:**
- **Outputs the skill would produce:**
- **Notes:**
