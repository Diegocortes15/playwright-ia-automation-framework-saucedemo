# Framework Gaps Log — `experiment-rebuild-from-scratch`

Track gaps in the AI skills / framework workflow as they surface during the blank-slate rebuild experiment. Each entry should be concrete (a specific issue with a specific symptom), not speculative.

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

After enough data accumulates, take stock:

- Prioritize the observed gaps by severity + frequency.
- For each critical gap, spec + ship a skill fix (back to main via the usual brainstorm → spec → plan flow).
- Re-run the experiment on the improved skills.
- Repeat until "blank slate to working coverage" is smooth.
