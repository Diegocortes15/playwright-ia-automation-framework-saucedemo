# Phase A.5 — Cross-Browser, CI, createRequire Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the three deferred-from-Phase-A items defined in `docs/superpowers/specs/2026-05-10-phase-a5-cross-browser-and-ci-design.md`: createRequire → import attributes cleanup, firefox-standard + webkit-standard project additions, and a GitHub Actions CI workflow on the new GitHub repository.

**Architecture:** Three sequential, mostly independent changes. createRequire goes first (small, with revert mitigation) so we know our JSON-loading baseline before adding browsers. Cross-browser projects extend `playwright.config.ts` and reuse the existing `auth/standard.json`. CI is GitHub Actions, single job, all 9 projects in one parallelized run. Remote setup is the last operational step, requiring user input (GitHub URL, secret).

**Tech Stack:** Same as Phase A — Node 22, Playwright 1.59.x (chromium + firefox + webkit), TypeScript 5.9, ESLint v9 flat config. Adds GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4`).

**Build order:** createRequire cleanup → install browsers locally → add cross-browser projects + scripts → write CI workflow → set up remote and push → set up secret → verify first CI run → final DoD check.

**Working directory:** `d:\Diego\Projects\IA Engineer\playwright-ia-framework`. Currently on `main` at `be88c77` (Phase A.5 design spec commit). Implementation should happen on a new feature branch `phase-a5-bridge`.

**Platform note:** Commands use cross-platform syntax. PowerShell on Windows; `npx`, `npm`, and `git` work identically.

---

## Pre-flight: Create feature branch

- [ ] **Step 1: Create and switch to feature branch**

Run:
```
git checkout -b phase-a5-bridge
```

Expected: `Switched to a new branch 'phase-a5-bridge'`

- [ ] **Step 2: Verify clean baseline**

Run: `npm run typecheck && npm run lint && npm run format:check`
Expected: all exit 0.

Run: `npm test`
Expected: 40 tests pass (Phase A baseline).

If anything fails: STOP and report — Phase A's main is not actually green.

---

## Task 1: createRequire cleanup → import attributes

**Files:**
- Modify: `data/fixtures.ts` (currently uses `createRequire`)

**Risk:** import attributes (`with { type: 'json' }`) may not work in our Playwright/Node 22.x toolchain. If it fails at runtime, we revert and continue with the rest of Phase A.5 — the design spec's Section 6 mitigation plan.

- [ ] **Step 1: Replace `data/fixtures.ts` with import-attributes form**

Current file uses `createRequire`. Replace the entire file contents with:

```ts
import productsJson from './shared/products.json' with { type: 'json' };
import validCheckoutJson from './scenarios/checkout/valid-checkout.json' with { type: 'json' };
import invalidPostalJson from './scenarios/checkout/invalid-postalcode.json' with { type: 'json' };
import sortOrdersJson from './scenarios/sort/sort-orders.json' with { type: 'json' };
import type { Product, CheckoutScenario, SortOption } from './types';

export const loadProducts = (): Product[] => productsJson as Product[];
export const loadValidCheckouts = (): CheckoutScenario[] => validCheckoutJson as CheckoutScenario[];
export const loadInvalidPostal = (): CheckoutScenario[] => invalidPostalJson as CheckoutScenario[];
export const loadSortOrders = (): SortOption[] => sortOrdersJson as SortOption[];

export const getProductById = (id: string): Product => {
  const product = loadProducts().find((p) => p.id === id);
  if (!product) throw new Error(`Product not found in shared/products.json: ${id}`);
  return product;
};
```

Note: the `createRequire` workaround comment is removed entirely. The new code is self-explanatory.

- [ ] **Step 2: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: exit 0.

If typecheck fails with an error about `with` syntax: TypeScript may be too old, or `tsconfig.json` may need a flag. Report the exact error before proceeding.

- [ ] **Step 3: Verify lint and format**

Run: `npm run lint && npm run format:check`
Expected: both exit 0.

If format check fails: run `npm run format` then re-check.

- [ ] **Step 4: Verify the JSON imports actually work at runtime — run a small test slice**

Run: `npx playwright test --project=standard tests/inventory/browse.spec.ts`

Expected: 1 test passes (the standard-project `@all-users inventory shows all 6 products` test). This proves `loadProducts()` works at runtime via the new import syntax.

**If this fails with an error like `Unsupported MIME type "application/json"` or similar JSON-parse error**: the toolchain doesn't support import attributes yet. Apply the fallback:

1. Revert `data/fixtures.ts` to the previous content (use `git checkout HEAD -- data/fixtures.ts`)
2. Verify the revert: `npx playwright test --project=standard tests/inventory/browse.spec.ts` should now pass
3. Skip the commit in Step 6 below
4. Report this as DONE_WITH_CONCERNS for Task 1, mention the actual error, and explicitly note that the cleanup is deferred to a future phase
5. Continue to Task 2 — the rest of Phase A.5 is unaffected

- [ ] **Step 5: Run the full test matrix to confirm nothing else broke**

Run: `npm test`
Expected: 40 tests pass (the Phase A baseline — we haven't added browsers yet).

- [ ] **Step 6: Commit (skip if you applied the fallback in Step 4)**

```
git add data/fixtures.ts
git commit -m "refactor(data): use ESM import attributes for JSON

Native `import x from './x.json' with { type: 'json' }` replaces the
createRequire workaround from Phase A. Single idiomatic import pattern
for AI agents extending data/fixtures.ts in Phase C."
```

---

## Task 2: Install firefox and webkit browsers locally

**Files:** None modified — runtime install only.

- [ ] **Step 1: Install firefox and webkit Playwright bundles**

Run: `npx playwright install firefox webkit`

Expected: Two large downloads (~150MB each). Output ends with both browsers reported as downloaded.

If installation fails (rare, usually network): report the exact error.

- [ ] **Step 2: Verify browsers are available**

Run: `npx playwright install --dry-run`

Expected: Output reports `chromium`, `firefox`, `webkit` all "is already installed" or equivalent. If `--dry-run` isn't supported on the installed Playwright version, this step is informational only — proceed.

No commit — these are user-machine binaries, not source code changes.

---

## Task 3: Add firefox-standard and webkit-standard projects

**Files:**
- Modify: `playwright.config.ts` (extend the projects array)
- Modify: `package.json` (add 2 scripts)

- [ ] **Step 1: Read the current `playwright.config.ts`**

Inspect the existing file to confirm the current `projects:` array structure. The 7 existing projects are: `setup`, `no-auth`, and the 5 chromium user projects produced by `userProjects.map(...)`.

- [ ] **Step 2: Add firefox-standard and webkit-standard projects**

In `playwright.config.ts`, the current `projects` array ends with the spread of `userProjects.map(...)`. Append two new project objects to the array.

Find the closing `]` of the projects array (immediately after the `userProjects.map(...)` block). Insert these two project objects immediately before that closing bracket:

```ts
    {
      name: 'firefox-standard',
      testIgnore: /.*\.setup\.ts/,
      grep: /@all-users|@standard|@sort-functional/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'auth/standard.json',
      },
    },
    {
      name: 'webkit-standard',
      testIgnore: /.*\.setup\.ts/,
      grep: /@all-users|@standard|@sort-functional/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Safari'],
        storageState: 'auth/standard.json',
      },
    },
```

After the edit, the projects array contains 9 entries: `setup`, `no-auth`, 5 chromium user projects, plus `firefox-standard` and `webkit-standard`.

- [ ] **Step 3: Add npm scripts**

In `package.json`, the `"scripts"` block already has `test:standard`, `test:no-auth`, `test:problem`, etc. Add two new entries immediately after `test:problem`:

```json
"test:firefox": "playwright test --project=firefox-standard",
"test:webkit":  "playwright test --project=webkit-standard",
```

- [ ] **Step 4: Verify typecheck/lint/format still green**

Run: `npm run typecheck && npm run lint && npm run format:check`
Expected: all exit 0.

- [ ] **Step 5: Verify all 9 projects appear in the project list**

Run: `npx playwright test --list 2>&1 | grep -E "Project:"` (or on PowerShell: `npx playwright test --list | Select-String "Project:"`)

If `--list` isn't outputting project names that way, alternatively run:

```
npx playwright test --project=firefox-standard --list
npx playwright test --project=webkit-standard --list
```

Expected: each shows the relevant tests (the standard-user grep — should be 11 tests each).

- [ ] **Step 6: Run firefox-standard project**

Run: `npm run test:firefox`

Expected: 11 tests pass on `firefox-standard` (browse 1 + sort 4 + add-remove 2 + happy 2 + validation 2). Plus the setup project runs first to generate `auth/standard.json` if not present.

If a test fails specifically on firefox: capture the failure (which test, which assertion). Real browser-rendering differences would be the cause.

- [ ] **Step 7: Run webkit-standard project**

Run: `npm run test:webkit`
Expected: 11 tests pass on `webkit-standard`.

If failures occur on webkit specifically: same capture instructions. webkit on Windows uses Playwright's bundled WebKit build — generally stable but reports of `getByRole` differences exist.

- [ ] **Step 8: Run the full matrix and confirm 62 instances pass**

Clean state then run all:

PowerShell:
```powershell
Remove-Item -Recurse -Force test-results, playwright-report -ErrorAction SilentlyContinue
Remove-Item auth/*.json -Force -ErrorAction SilentlyContinue
npm test
```

Expected counts:

| Project | Tests |
|---|---|
| setup | 5 |
| no-auth | 3 |
| standard | 11 |
| problem | 4 |
| performance_glitch | 7 |
| error | 3 |
| visual | 7 |
| firefox-standard | 11 |
| webkit-standard | 11 |
| **Total** | **62** |

- [ ] **Step 9: Commit**

```
git add playwright.config.ts package.json
git commit -m "feat(config): add firefox-standard and webkit-standard projects

Smoke-pattern cross-browser coverage — chromium runs the full 5-user
matrix; firefox and webkit run the standard user only. ~22 additional
test instances; 62 total. Catches framework-level browser locator
regressions without re-running saucedemo's per-user bugs three times."
```

---

## Task 4: Create GitHub Actions workflow file

**Files:**
- Create: `.github/workflows/test.yml`

The workflow file lives in the repo before any push to GitHub. Once we push and the secret is set, the workflow runs on every PR and main push.

- [ ] **Step 1: Create the workflow directory**

PowerShell:
```powershell
New-Item -ItemType Directory -Force -Path .github/workflows | Out-Null
```

(Or `mkdir -p .github/workflows` on POSIX shells.)

- [ ] **Step 2: Create `.github/workflows/test.yml`**

```yaml
name: test

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  playwright:
    name: Playwright matrix
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - run: npm ci

      - name: Cache Playwright browsers
        uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: pw-${{ runner.os }}-${{ hashFiles('package-lock.json') }}

      - run: npx playwright install --with-deps chromium firefox webkit

      - name: Run tests
        env:
          SAUCEDEMO_PASSWORD: ${{ secrets.SAUCEDEMO_PASSWORD }}
          CI: 'true'
        run: npm test

      - name: Upload HTML report on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 3: Verify the YAML is well-formed**

Run: `npx --yes yaml-validator .github/workflows/test.yml` (the `--yes` autoconfirms the package install).

If `yaml-validator` isn't readily available: open the file and visually verify indentation is 2-space consistent, no tabs, all `:` followed by space.

If invalid YAML: report the parser error.

- [ ] **Step 4: Verify lint/format don't try to format the YAML**

Run: `npm run format:check`
Expected: exit 0.

If Prettier complains about the YAML formatting: either accept Prettier's reformatting (`npm run format`) or add `.github/` to `.prettierignore` (NOT recommended — workflow files should be Prettier-friendly).

- [ ] **Step 5: Commit**

```
git add .github/workflows/test.yml
git commit -m "ci: add GitHub Actions workflow for Playwright matrix

Single-job pipeline running all 9 projects on push to main and on PRs
to main. Caches Playwright browsers keyed on package-lock.json. Uploads
the HTML report as artifact on failure for trace inspection."
```

---

## Task 5: Set up GitHub remote and push

**Files:** None modified — git remote operations only.

This task requires user input (GitHub username, SSH/HTTPS preference).

- [ ] **Step 1: Confirm there's no existing remote**

Run: `git remote -v`
Expected: no output (no remote currently configured).

If a remote already exists: STOP and report — the user may have set one up already.

- [ ] **Step 2: Ask the user for the remote URL**

This step requires interactive user input. The implementer must ask the user:

> "What's the remote URL for the new GitHub repo `playwright-ia-automation-framework-saucedemo`? I'll need either:
>
> SSH: `git@github.com:<your-username>/playwright-ia-automation-framework-saucedemo.git`
> HTTPS: `https://github.com/<your-username>/playwright-ia-automation-framework-saucedemo.git`
>
> Paste the exact URL you want to use."

Wait for the user's response before proceeding.

- [ ] **Step 3: Add the remote**

With the URL the user provided as `<URL>`:

```
git remote add origin <URL>
git remote -v
```

Expected: `origin <URL> (fetch)` and `origin <URL> (push)`.

- [ ] **Step 4: Push the feature branch FIRST (not main)**

We're on `phase-a5-bridge`. Push it (NOT main yet — we want to review the CI config before it lands on main).

```
git push -u origin phase-a5-bridge
```

Expected: push succeeds, branch tracked. The push uploads all commits — including the entire main history since the GitHub repo was empty.

If the push is rejected because the remote has a default branch already (e.g., GitHub auto-initialized with a README): report and stop. The user needs to either delete the remote's auto-init commits or we need to merge them in carefully.

- [ ] **Step 5: Verify the push landed**

Run: `git log origin/phase-a5-bridge --oneline -5`
Expected: shows the 4 most recent commits (Task 4 CI commit, Task 3 cross-browser commit, Task 1 createRequire commit if applied, Phase A.5 spec commit).

---

## Task 6: Set up the SAUCEDEMO_PASSWORD GitHub Actions secret

**Files:** None modified — GitHub UI configuration only.

This task is performed by the user in the GitHub web UI. The implementer provides instructions.

- [ ] **Step 1: Direct the user to set the secret**

Tell the user:

> "Open the repo on GitHub: `https://github.com/<your-username>/playwright-ia-automation-framework-saucedemo`
>
> Then:
> 1. Click **Settings** (top right of the repo page)
> 2. Left sidebar: **Secrets and variables → Actions**
> 3. Click **New repository secret**
> 4. Name: `SAUCEDEMO_PASSWORD`
> 5. Value: `secret_sauce`
> 6. Click **Add secret**
>
> Confirm when done so I can trigger the first CI run."

Wait for the user to confirm.

- [ ] **Step 2: Verify the secret is set (indirectly)**

There's no API to read secret values for security reasons. We verify the secret works by triggering a CI run that uses it (Task 7).

---

## Task 7: Trigger and verify the first CI run

**Files:** None modified — operational verification only.

- [ ] **Step 1: Trigger the workflow by pushing or opening a PR**

The simplest trigger is to merge `phase-a5-bridge` to `main` locally and push main:

```
git checkout main
git merge phase-a5-bridge --ff-only
git push -u origin main
```

The push to main triggers the `push` event on the workflow. Or if the user prefers to test via PR first, open a PR from `phase-a5-bridge` to `main` in the GitHub UI — the `pull_request` event will trigger the same workflow.

Recommend: merge and push main (faster feedback, single workflow run instead of two).

- [ ] **Step 2: Watch the workflow run**

The user (or implementer with `gh` CLI installed) can watch via:

```
gh run watch
```

If `gh` is not installed: tell the user to open `https://github.com/<your-username>/playwright-ia-automation-framework-saucedemo/actions` in a browser.

Expected: the workflow takes ~3-5 minutes the first time (no cache yet). It should produce a green check mark.

- [ ] **Step 3: If the first CI run fails, diagnose**

Common first-run failures:

- **"Missing required env var: SAUCEDEMO_PASSWORD"** → secret not set; ask user to confirm Task 6.
- **`Error: browserType.launch: Executable doesn't exist`** → cache key issue; the install step should have fetched browsers regardless. Inspect the install step's logs.
- **All chromium tests pass but firefox or webkit fail with timeouts** → the `npx playwright install --with-deps` step may have skipped a deps install on Ubuntu. The workflow uses `--with-deps` which auto-installs system libraries; if that step is logged as skipped or errored, fix it.
- **A specific test fails that passed locally** → may be a Linux-vs-Windows behavioral difference. Download the HTML report artifact from the failed run, inspect the trace.

Do NOT modify the workflow file in response to a failure without first reading the actual error. Report the failure to the user with specifics; we'll iterate together.

- [ ] **Step 4: Once green, confirm artifact upload (only if a test ever fails)**

The artifact upload step is `if: failure()` — it only triggers on failed runs. We'll confirm this works the first time a test fails in CI naturally; no need to force a failure now.

---

## Task 8: Final Definition-of-Done verification

**Files:** None modified — verification only.

- [ ] **Step 1: Confirm all DoD items from the spec**

Working through `docs/superpowers/specs/2026-05-10-phase-a5-cross-browser-and-ci-design.md` Section 5:

```
git log --oneline | head -10                    # confirm Phase A.5 commits present
cat playwright.config.ts                        # verify 9 projects defined
npx playwright install --dry-run                # verify all 3 browsers installed
npm test                                        # 62 tests pass (or note: createRequire reverted)
npm run test:firefox                            # 11 tests pass
npm run test:webkit                             # 11 tests pass
cat data/fixtures.ts | head -5                  # verify import attributes (or createRequire if reverted)
npm run typecheck && npm run lint && npm run format:check
ls .github/workflows/test.yml                   # exists
git remote -v                                   # origin set
gh run list --limit 1                           # last CI run is success (or visit web UI)
```

- [ ] **Step 2: Tag the milestone**

```
git tag -a phase-a5-complete -m "Phase A.5 complete: cross-browser, CI, createRequire cleanup"
git push origin phase-a5-complete
```

- [ ] **Step 3: Delete the feature branch (now merged)**

If the user merged `phase-a5-bridge` to main locally in Task 7:

```
git branch -d phase-a5-bridge
git push origin --delete phase-a5-bridge
```

If the user used a PR via GitHub UI: GitHub will offer to delete the branch on PR merge. Confirm via `git remote prune origin` and `git branch -D phase-a5-bridge` locally.

---

## Self-review notes (already applied)

The plan was reviewed against the spec before writing. Coverage check:

| Spec section | Tasks |
|---|---|
| §3 Architecture changes — `playwright.config.ts` 2 new projects | Task 3 Step 2 |
| §3 — `package.json` 2 new scripts | Task 3 Step 3 |
| §3 — `data/fixtures.ts` to import attributes | Task 1 |
| §3 — `.github/workflows/test.yml` | Task 4 |
| §3 — Repository setup (remote, push, secret, branch protection) | Tasks 5, 6, 7 |
| §5 DoD all 11 items | Task 8 |
| §6 Risk mitigation for import attributes | Task 1 Step 4 (explicit fallback) |
| §7 Out of scope | Plan contains nothing from the deferred lists |
