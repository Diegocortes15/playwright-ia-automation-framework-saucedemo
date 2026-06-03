# from-issue Workflow

The procedural workflow Claude follows when the `from-issue` skill is invoked. The source ticket is a **Jira** issue (project `SW`), read via the Atlassian MCP — see [ADR-0011](../../../../docs/adr/0011-jira-ticket-source.md). (Originally 13 GitHub-Issue steps; Step 3 was dropped and Step 13's Jira write-back removed in Phase E.)

## Inputs

- **Jira issue key** (required, positional) — e.g., `/from-issue SW-123` (project key `SW`).
- **`--new-file`** (optional flag) — force CREATE-NEW instead of augmenting an existing feature spec (per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md), Step 8).
- **`dry-run`** (optional flag) — skip steps 11–12 (branch, push, PR). Files written and tests run locally only.

## Steps

### 1. Validate inputs

Check that a Jira issue **key** is present and matches `^[A-Z][A-Z0-9]+-\d+$` (e.g. `SW-123`). If missing or malformed, ask the user — don't guess.

Confirm the **Atlassian MCP** is connected (the skill reads tickets through it). If no Atlassian MCP tool is available, abort with: _"The Atlassian MCP isn't connected. Connect it in Claude Code (OAuth), then re-run."_

Check `gh auth status` exits 0 (needed for the PR in Step 12). If not, abort with: _"`gh` is not authenticated. Run `gh auth login` and re-run."_

### 1.5. Resolve and sync the base branch

`/from-issue` branches off the base captured in Step 11, and the Step 5/8 "does this feature already exist?" checks read **that branch's tree**. Two failure modes are prevented here, **before any inspection** — first pick the *right* base, then make it current.

**(a) Never branch from a leftover ticket branch.** A previous `/from-issue` run leaves the working tree on **its** `<KEY>-<feature>` branch, so the next run starts there by default. Branching the new ticket off that one stacks it on unmerged work and targets the wrong base — this is what forced SW-11 to stop and ask.

```bash
current=$(git branch --show-current)
```

- If `current` matches `^[A-Z][A-Z0-9]*-[0-9]+-` (a ticket branch from a prior run), it is **not** a valid base. Resolve the **integration base** — the branch this project's ticket PRs target (commonly `main`, or a long-lived integration branch during a build-up). Prefer the branch `current` was cut from; if you cannot determine it unambiguously, **ask the user**: _"You're on `<current>` (a prior ticket's branch). Which branch should `<KEY>` branch from?"_ Then `git checkout <integration-base>`.
- Otherwise `current` already is the base.

**(b) Sync the chosen base with its remote** — catches a stale local base (work merged on the remote but not pulled), so the existence checks don't wrongly conclude a feature is new and fork a colliding copy (the SW-7/SW-8 collision).

```bash
base=$(git branch --show-current)   # the resolved integration base from (a)
git fetch origin "$base"
```

- **Working tree must be clean.** If `git status --porcelain` is non-empty, abort: _"working tree is dirty — commit/stash before running /from-issue."_
- If `origin/$base` exists, **fast-forward only**: `git merge --ff-only "origin/$base"`. If that fails (local diverged from the remote), abort: _"`<base>` isn't a clean fast-forward of `origin/<base>` — reconcile them, then re-run."_ Never force or auto-merge.
- If `origin/$base` has no remote-tracking counterpart (purely local base), skip the sync.

Together this makes the "let a feature's PR merge before the next ticket on that feature" discipline reliable: the new ticket branches from a current integration base that includes prior merged work, so this run **augments** the existing feature instead of forking a conflicting copy.

### 2. Fetch the Jira ticket

Read the ticket via the **Atlassian MCP's get-issue tool** for the key (e.g. `SW-123`), requesting the rendered/text form of the description.

> The connected Atlassian MCP server exposes a get-issue tool; confirm its exact name from the available tool list once the MCP is connected (commonly `getJiraIssue` / `jira_get_issue`). Until connected, refer to it generically.

Capture: `<KEY>` (the issue key), `summary` (the title), and `description` (rendered text). If the ticket doesn't exist or you lack access, abort with the MCP error verbatim.

### 3. (Removed in Phase E — no readiness gate)

There is no label/status gate. Explicitly invoking `/from-issue <KEY>` is the intent signal; the Step 4 "no ACs worth automating → abort" backstop fails safe if pointed at a non-spec ticket.

### 4. LLM normalization

Tickets are authored many ways and at any quality (trainee → senior BA). **Normalize whatever the ticket contains — format- AND quality-agnostic** (per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md)): a formal "As a / I want / so that" narrative, Given/When/Then scenarios, a bullet/numbered AC list, plain prose, structured fields, or a partial/mixed blob all reduce to the same internal AC records. Extract from the summary + description:

- **Feature** (single-line slug) — drives `tests/<feature>/`. If not stated, infer it from the summary/subject (and record the inference as an assumption, below).
- **Acceptance Criteria** — one behavior each, derived from whatever form the ticket used.
- **Notes** (optional) — context only.

While normalizing, also capture (used by the PR's "What I understood", Step 7 / `pr-description-template.md`):

- **`requirement_form`** — one of `narrative` / `gwt` / `bullets` / `prose` / `structured` / `mixed`.
- **`requirement_restated`** — a faithful restatement of what the ticket actually says (the narrative if one is present; a scenario summary for GWT; a paraphrase for prose).
- **`assumptions[]`** — every inference or ambiguity resolution **not explicit** in the ticket (e.g. "user unspecified → defaulted to `standard_user`"; "'works correctly' interpreted as lands on inventory"). Empty when the ticket was fully explicit.

(Page Object names are inferred from AC text — see "Page inference from AC text" below.)

For each Acceptance Criterion, build an internal record:

```
{
  id: 1,  // sequential
  text: "<normalized AC text>",
  user: "<inferred saucedemo user, e.g., standard_user; default standard_user if unspecified>",
  worth_automating: true | false,
  rationale: "<LLM justification; required when worth_automating=false>"
}
```

**Skip-signal = LLM judgment from AC text** (spec §2 Decision 11). Examples of ACs to skip:
- "Visual aesthetic — manual review only"
- "Verify the spelling of the button label" (low automation value)
- "Confirm legal copy matches the marketing-approved version" (data may shift)

**Vague / low-quality tickets** (per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md)): do NOT abort and do NOT pause to ask. Produce a **best-effort** normalization, record every inference in `assumptions[]`, and let the PR's **⚠️ Assumptions & open questions** block surface them for the reviewer (the PR is the review gate). Abort **only** when nothing testable can be extracted at all:

> _"Couldn't extract any testable behavior from ticket `<KEY>`. Ask the reporter to follow [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md)."_

**If `worth_automating=false` for ALL ACs**, abort BEFORE writing files. Report the per-AC rationale to the user, with the recommendation to close ticket `<KEY>` if the assessment is correct or refile with more concrete ACs. No Jira write-back is performed (per [ADR-0011](../../../../docs/adr/0011-jira-ticket-source.md)) and no PR is opened. Then stop.

#### Free-form / GWT body handling

A well-authored ticket (per [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md)) has a `Feature:` line and one AC per line in the description. If the description uses a looser format (e.g., free-form Given/When/Then scenarios, no headings, partial structure), best-effort parse:

- Extract the **Feature** field from any heading or first line that looks like a feature name
- Look for Acceptance Criteria in any list/bullet form, regardless of `### Acceptance Criteria` heading
- Recognize GWT-style scenarios (`Given... When... Then...`) as ACs, one scenario = one AC candidate
- If parsing fails entirely (no recognizable ACs anywhere), abort with: _"Couldn't extract ACs from ticket `<KEY>`. Ask the reporter to follow [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md)."_

(Note: this subsection replaces an earlier shorter free-form note. The behavior was previously implicit — confirmed working in PR #8 of the experiment. Now documented explicitly.)

#### Page inference from AC text

Tickets do not carry a Page Name field. Extract Page Names from AC text by:

- Scanning each AC for mentions of UI surfaces ("from the LoginPage", "on the cart page", "checkout overview", etc.)
- Mapping each mention to a PascalCase Page Object name (e.g., "login page" → `LoginPage`, "cart page" → `CartPage`)
- Building a set of unique Page Names referenced across all ACs

If zero pages can be inferred: abort with: _"Couldn't infer any Page Object references from the AC text. Ask the reporter to mention UI surfaces explicitly (e.g., 'from the LoginPage', 'on the checkout overview')."_

#### Wire QA analysis (NEW reference doc)

Before producing the per-test records (Step 6), apply senior QA SDET judgment to the extracted ACs per [`qa-analysis.md`](qa-analysis.md):

- Identify ACs to MERGE (shared setup + parameterized variants)
- Identify ACs to SPLIT (compound behaviors that should be separate tests)
- Identify ACs to SKIP (non-automatable, out of scope, redundant)

Each merge/split/skip decision must be surfaced in the PR body's "What I understood" + AC coverage table + "Notes for reviewer" section (per `pr-description-template.md`).

### 5. Resolve target Page Object

```bash
ls src/pages/<PageName>.ts 2>/dev/null
# If not found at top level, also check the checkout subfolder:
ls src/pages/checkout/<PageName>.ts 2>/dev/null
```

- **Either path exists** → reuse the existing Page Object. Record a collision warning for the PR body. During render (Step 7 / Step 8.5), the Page Object may need changes to support the new tests:
  - **Add** — a new test needs a locator/method the Page Object lacks → **append** it, following the composed-vs-primitive + `test.step` conventions in [`../../scaffold-page-object/references/page-object-template.md`](../../scaffold-page-object/references/page-object-template.md). Existing members are untouched. When the new members query many similar elements (cards/rows), choose parallel-array queries vs a discriminator component per [`component-detection.md`](../../scaffold-page-object/references/component-detection.md) ("Parallel-array queries vs a discriminator component").
  - **Modify** — a new test needs an **existing** method to behave differently → modify it in place and set the run-internal flag **`po_modified = true`** (consumed by Step 10). Per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md), modifying a shared method can regress other specs, so it widens verification.
  - **Irreconcilable** — if a required change would break the existing method's contract in a way you cannot reconcile, **abort**: _"augmenting <KEY> needs `<Method>` to change incompatibly; edit `<PageObject>` manually, then re-run."_ No PR.
- **Neither path exists** → invoke `/scaffold-page-object` with inputs:
  - Page name: `<PageName>`
  - URL: inferred from the AC text (e.g., AC mentions "cart page" → `https://www.saucedemo.com/cart.html`)
  - storageState: `auth/standard.json` by default. Override only if ALL Step 4 AC records share the same non-standard user (the storageState is only used for the snapshot; tests pick their own user via tag→project mapping). The project that actually runs each test is wired in Step 6.5 — see [`references/harness.md`](harness.md).

  If `/scaffold-page-object` fails, abort with the subprocess error verbatim. No PR.

### 6. Analyze ACs

Group the `worth_automating=true` AC records into a set of tests. One test may cover multiple ACs (spec §2 Decision 5 — adaptive multi-test). For each test, record:

```
{
  title: "<behavior-only description, e.g., 'remove single item from cart updates badge'>",
  covers: [1, 3],  // AC IDs
  user: "<saucedemo user>",
  tags: ["<auth-tag>", "<user-tag-if-not-no-auth>"],
  bucket: "Positive" | "Negative" | "Edge",
  smoke: true | false
}
```

Tag selection follows CLAUDE.md "Tag conventions" table. Title format follows [`references/test-template.md`](test-template.md) "Rules". Bucket assignment follows [`references/bucket-classification.md`](bucket-classification.md) — read it before classifying. The bucket lives on the test (not on the AC) because one test can cover multiple ACs; classify by the test's dominant behavior, using the ambiguity rules in bucket-classification.md as the tiebreaker.

Smoke assignment follows [`references/smoke-policy.md`](smoke-policy.md) — read it before classifying. Smoke status is orthogonal to bucket: a Negative test can be smoke (critical regression risk) and a Positive test can be NOT-smoke (peripheral happy path). The default per smoke-policy.md is `false` ("when in doubt, NOT smoke").

Data placement follows [`references/data-placement.md`](data-placement.md) — decide, per dataset, whether the test's data is **inline** (the default for small, test-local parameterization) or **externalized** to `data/` (only on a concrete trigger: reused / large / non-engineer-owned / env-specific / named scenario). Most issues keep data inline; if any dataset hits an externalize trigger, note that the spec render (Step 7) and commit (Step 11) must also create + stage the `data/` file(s) and loader.

**Validate bucket values before Step 7.** Each test's `bucket` must be one of `{Positive, Negative, Edge}`. If the LLM emits any other value (e.g., `"Boundary"`), default that test to `Edge` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid bucket "<value>" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`

**Validate smoke values before Step 7.** Each test's `smoke` must be exactly `true` or `false`. If the LLM emits any other value, default that test to `false` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid smoke value "<value>" for test "<title>" — defaulted to false. Reviewer: verify classification.`

**If `references/bucket-classification.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/bucket-classification.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules — the doc is the source of truth.

**If `references/smoke-policy.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules.

### 6.5. Resolve & grow the harness

Per [`references/harness.md`](harness.md) (read it before this step). From the Step 6 test records, compute the **required user set**: `@no-auth` tests need no user; user-agnostic tests (`@all-users`/`@standard`) need only `standard`; a test targeting a specific user needs that user.

For each required user **not** wired in `tests/users.ts` `AUTH_USERS`, **append it autonomously** — no mid-run question, no recovering config from git history. The data-driven `playwright.config.ts` + `tests/auth.setup.ts` derive the project + storageState from the array. If `tests/users.ts` / the data-driven config / `auth.setup.ts` don't exist yet, create all three from the canonical shapes in `harness.md`, seeded with the required users.

**Guardrail ([ADR-0004](../../../../docs/adr/0004-cross-browser-smoke-pattern.md)):** never pre-create unused users; never add `<browser>-<non-standard>` projects. Cross-browser stays out.

Record a side-effect note for the PR body: `⚙️ Harness grew: wired the <user> project + auth setup (first ticket needing <user>). Reviewer: confirm.`

### 7. Render test file

Apply [`references/test-template.md`](test-template.md). Also consult [`references/test-principles.md`](test-principles.md) (F.I.R.S.T. principles), [`references/playwright-conventions.md`](playwright-conventions.md) (Playwright best practices), and [`references/data-placement.md`](data-placement.md) (inline vs. externalized test data) to ensure the rendered tests comply with project quality standards:

- Top-of-file 5-line provenance block (substitute today's date, Jira key, URL, summary)
- Imports: `@fixtures/test` (always), `@utils/env` (when password needed)
- One `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, ...)` per user-context (per [ADR-0015](../../../../docs/adr/0015-spec-tags-via-tag-option.md)) — the routing tag lives in the **`{ tag }` option, not the title** (see test-template.md for the context-label mapping). Multiple contexts in one feature = sibling tagged describes in the same file.
- Inside each context describe, group tests by their `bucket` field into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', ...)` blocks
- Bucket describes appear in fixed order: **Positive → Negative → Edge** (even if Negative tests outnumber Positive)
- **Omit empty buckets entirely** — if no tests were classified into a bucket, don't emit its describe block at all
- Within each bucket describe, tests appear in their Step 6 emission order

Each `test(...)` title is **pure prose** (behavior-only) — NO tags in the title. If `smoke: true`, attach `{ tag: '@smoke' }` as the test's options arg: `test('<behavior>', { tag: '@smoke' }, async (...) => {...})`; if `smoke: false`, omit the options arg entirely. The routing tag is NOT repeated on the test — it's on the context describe. This is the format defined in [`references/test-template.md`](test-template.md) "Rules".

Render to an in-memory string. Do NOT Write yet — Step 8 handles overwrite refusal first.

### 8. Write test file

The test file is named after the **Feature**, not the issue title. The framework targets a single app (saucedemo), so issue-title prefixes like `[SDA]` and suffixes like "Login in Saucedemo App" are redundant noise in a filename.

```
tests/<feature>/<feature>.spec.ts
```

Where `<feature>` is the snake_case Feature field. Example: Feature `login` → `tests/login/login.spec.ts`.

#### Collision handling

Resolve the target path **and the write mode**. Read the contributor set of `tests/<feature>/<feature>.spec.ts` if it exists — that is the origin key on line 1 (`// Generated by /from-issue ... from Jira <KEY>.`) **plus** every key on the `// Augmented by:` line (if present). Then:

| Condition                                              | Mode                                                                                                                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--new-file` flag passed                               | **CREATE-NEW** — use `tests/<feature>/<feature>.spec.ts`, or `tests/<feature>/<feature>-<KEY>.spec.ts` if that exists (refuse if the suffixed path also exists for this same issue) |
| File does **not** exist                                | **CREATE-NEW** — write a fresh `tests/<feature>/<feature>.spec.ts`                                                                                                                  |
| File exists, `<KEY>` **is** in the contributor set     | **REFUSE** — _"issue <KEY> already contributed to `tests/<feature>/<feature>.spec.ts`. `rm` the relevant tests or edit it directly."_ No PR.                                       |
| File exists, `<KEY>` is **not** a contributor          | **AUGMENT** — go to Step 8.5                                                                                                                                                        |

For **CREATE-NEW**, ensure `tests/<feature>/` exists (`mkdir -p` if needed), then Write the file. For **AUGMENT**, Step 8.5 edits the existing file in place. In both cases, call the resolved path **`<testfile>`** — later steps reference it.

The new test title format, bucket structure, and the header block are unchanged from Step 7 / [`test-template.md`](test-template.md); AUGMENT reuses the same rendering, then inserts rather than writing a fresh file.

### 8.5. Insert into the existing file (AUGMENT mode only)

Skip this step entirely in CREATE-NEW mode. In AUGMENT mode, edit `<testfile>` in place with targeted `Edit` calls — never regenerate the whole file (that would destroy manual edits, per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md)).

**Resolve the context describe by tag (per [ADR-0015](../../../../docs/adr/0015-spec-tags-via-tag-option.md)).** The file holds one `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, ...)` per user-context. Find the sibling describe whose `{ tag }` equals the new tests' routing tag:

- **Match found** → insert the new tests into THAT describe's bucket blocks (the bucket logic below operates within it).
- **No match** → add a NEW sibling `test.describe('<feature> — <context-label>', { tag: '<routing-tag>' }, ...)` (with its own bucket children) after the existing context describes. This is the multi-user case (e.g. file has `@problem`, new tests are `@standard`) — no abort, no `--new-file` needed.

**Pre-check — structure recognizable.** If the file has no locatable outer `test.describe` or its bucket describes can't be found (hand-restructured beyond recognition), **abort**: _"couldn't locate insertion point in `<testfile>`; add the tests manually or re-run with `--new-file`."_

For each new test record (already bucket-classified in Step 6):

1. **Duplicate guard.** Normalize the record's title (lowercase, strip leading tags like `@smoke`/`@<user>`, collapse whitespace) and compare against the normalized titles already in the file. On a clear match, **skip** the record and record a note: `⏭️ skipped "<title>" — already covered by "<existing test>"`. When unsure, include it and let the reviewer decide (matches [`qa-analysis.md`](qa-analysis.md)'s conservative "default NOT skip").
2. **Locate the bucket** _within the resolved context describe_ (above). Find the `test.describe('Positive' | 'Negative' | 'Edge', () => { ... })` block matching the record's `bucket`.
   - Block exists → `Edit` to insert the new `test(...)` at the end of that block (before its closing `});`).
   - Block absent → insert a new bucket describe in the fixed **Positive → Negative → Edge** order, positioned correctly relative to existing buckets.
3. **Render the test body** exactly as Step 7 would (no spec-level `test.step`; steps live in Page Object methods per [`playwright-conventions.md`](playwright-conventions.md)).

**Update the header.** Append this issue to the `// Augmented by:` line as `<KEY> (YYYY-MM-DD)` (comma-separated). If the line doesn't exist yet, add it directly below the `// Title:` line:

```ts
// Augmented by: <KEY> (YYYY-MM-DD)
```

Record which records were `added` vs `skipped` for the PR body (Step 12).

### 9. Isolated typecheck

Use the same `.tsconfig.scratch.json` pattern as C.1 step 11. A bare `npx tsc --noEmit <path>` doesn't pick up the project's `tsconfig.json` (it falls back to TS defaults without `paths` aliases, so `@fixtures/test` and `@pages/*` imports would fail with bogus "Cannot find module" errors).

1. **Write a throwaway tsconfig** via the `Write` tool at `.tsconfig.scratch.json` (substitute the `<testfile>` resolved in Step 8):

   ```json
   {
     "extends": "./tsconfig.json",
     "include": ["<testfile>"],
     "exclude": []
   }
   ```

2. **Typecheck via the temp tsconfig**:

   ```bash
   npx tsc --noEmit -p .tsconfig.scratch.json
   ```

3. **Always clean up** (whether typecheck passed or failed):

   ```bash
   rm .tsconfig.scratch.json
   ```

- If typecheck **passes**, record `Typecheck: ✅ PASS` for the PR body.
- If typecheck **fails**, capture the errors verbatim for the PR body — but DO NOT abort. Continue to Step 10.

### 10. Run the generated tests

**Scope depends on whether an existing Page Object member was modified:**

- CREATE-NEW, or AUGMENT that only **added** Page Object members (`po_modified` is false) → run the target spec:

  ```bash
  npx playwright test <testfile> --reporter=list
  ```

- AUGMENT where `po_modified` is **true** → a shared method changed, so run the **full suite** to catch dependent-spec regressions (the matrix is ~1 min):

  ```bash
  npx playwright test --reporter=list
  ```

  Record in the PR's Verification section that the full suite ran because an existing method was modified, plus per-spec PASS/FAIL.

Capture per-test PASS/FAIL output. Record one line per test for the PR body's Verification section:

- ✅ PASS → `` `<test title>` — ✅ PASS ``
- ❌ FAIL → `` `<test title>` — ❌ FAIL: <one-line message> `` plus a `<details>` block with verbatim failure output

DO NOT abort on test failures — continue to Step 11. The PR-as-review-gate model means reviewers see and fix failures in the PR.

### 11. Branch + commit + push

**Dry-run check:** If `dry-run` was passed, SKIP this step and Step 12. Report the local file path and verification status only.

First record the branch you're on — the PR will target it (Step 12):

```bash
git branch --show-current   # capture as <base-branch> (e.g. e2e-jira-from-issues, or main)
git checkout -b <KEY>-<feature>
```

The branch is named **`<KEY>-<feature>`** — the exact uppercase Jira key first, then the feature slug (e.g., `SW-1-login`). Key-first per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md); the GitHub-for-Jira app matches the key (case-insensitively) to auto-link the PR onto ticket `<KEY>`.

If the branch already exists, abort with: _"Branch `<KEY>-<feature>` exists — delete it and re-run."_ No PR.

```bash
git add <testfile>
# If /scaffold-page-object created a new file during Step 5, also stage its actual path.
# Use the resolved path from Step 5 — could be src/pages/<PageName>.ts OR src/pages/checkout/<PageName>.ts.
# Example (top-level page):
#   git add src/pages/<PageName>.ts
# Example (checkout subfolder):
#   git add src/pages/checkout/<PageName>.ts
# If Step 7 externalized data per data-placement.md, also stage the data file(s) + loader:
#   git add data/scenarios/<feature>/<name>.json data/shared/<name>.json data/fixtures.ts data/types.ts
# If Step 6.5 grew the harness (per harness.md), also stage the changed source of truth
# (and, on first-time creation, the config + auth setup):
#   git add tests/users.ts
#   git add playwright.config.ts tests/auth.setup.ts   # first-time creation only
git commit \
  -m "feat(<feature>): automate <KEY> <feature> scenarios" \
  -m "<body: 1–3 sentences — coverage added (N tests across buckets), the scenarios/ACs covered, and any scaffold/side-effects (new Page Object, fixture registration, externalized data, augment)>" \
  -m "Refs: <KEY>" \
  -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin <KEY>-<feature>
```

**Conventional Commit (per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md)):** subject `feat(<feature>): automate <KEY> <feature> scenarios` — imperative, ≤ ~72 chars; `<feature>` is the scope. Body explains what + why. `Refs: <KEY>` trailer ties the commit to the ticket. Each block is a **separate `-m`** flag.

**Commit message — never use a shell here-string.** Keep the subject as one `-m`, and pass any body or trailer (e.g. the `Co-Authored-By:` line the project requires) as **additional `-m` flags**, as shown above. Do NOT use `<<'EOF'` (bash) or `@'...'@` (PowerShell): wrong-shell heredoc syntax leaks stray characters into the commit subject — a v5 run used PowerShell here-string syntax inside the Bash tool and produced a literal `@` prefix on the subject, forcing an amend + force-push. Repeated `-m` flags are cross-shell safe and need no escaping. (Same class of defect as D1-OBS-001, which moved the PR body to `--body-file` in Step 12.)

If `git push` fails (no remote, no auth), abort with the git error verbatim. The local branch and files remain on disk.

### 11.5. Write the TCMS records artifact (Qase, at-merge model)

**Skip** if `dry-run`. Per [`references/tcms-sync.md`](tcms-sync.md): write the Step 6 semantic model to **`.tcms/records/<feature>.json`** — keyed by **feature, not ticket**: **append** to the existing feature file when one exists (Step 1.5 guarantees you branched from a base that includes any merged sibling work), create it only if absent. One object per generated test: `title`, `acText`, `user`, `tags`, `bucket`, `feature`, `contextLabel`, plus a **per-record `jira` array** (`[{ "key": "<KEY>", "url": "…/browse/<KEY>" }]`) — there is **no file-level `meta` block** (a feature file legitimately spans tickets; see [`tcms-sync.md`](tcms-sync.md) for the exact shape). `git add` it with the rest of the change (Step 11). This does **NOT** touch Qase. The authoritative Qase create/update/archive runs **at merge** in CI (`npm run tcms:sync`, see [ADR-0017](../../../../docs/adr/0017-tcms-sync-at-merge.md)), so a rejected PR never mutates Qase. No `QASE_*` is needed at PR time.

### 12. Open PR

Render the PR body using [`references/pr-description-template.md`](pr-description-template.md). **Use the Write tool to put the body in a temporary file**, then pass it to `gh pr create --body-file` (do NOT use bash heredoc — see note below):

1. Write the rendered PR body to `.pr-body.md` using the Write tool.
2. Open the PR:

   ```bash
   # If <base-branch> (captured in Step 11) isn't on the remote yet, push it first so the PR can target it:
   #   git push -u origin <base-branch>
   gh pr create --base <base-branch> \
     --title "feat(<feature>): automate <KEY> <feature> scenarios" \
     --body-file .pr-body.md
   ```

   - **`--base <base-branch>`** = the branch recorded in Step 11 (the one you branched from) — the integration branch during a build-up, `main` in normal use. Never hardcode `main`.
   - **Title** is the Conventional-Commit form (matches the commit subject), per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md). The PR body MUST also reference `<KEY>` so the GitHub-for-Jira app links it.

3. After PR creation succeeds, delete the temp file:

   ```bash
   rm .pr-body.md
   ```

Capture the returned PR URL — `gh pr create` writes it to stdout on success (the only line of output is the URL).

If `gh pr create` fails (no remote, no permission), abort with the `gh` error verbatim. The local branch and pushed branch remain on the remote.

**Why `--body-file` instead of `--body "$(cat <<'EOF' ... EOF)"`:** the inline heredoc pattern (used in earlier workflow versions) is fragile when the PR body contains backtick-wrapped code spans (e.g., `` `/from-issue` ``, `` `LoginPage` ``, `` `src/fixtures/test.ts` ``). The skill can mis-escape the backticks and leak template-literal-style syntax (`` ` + "..." + ` ``) into the rendered PR body. Writing to a file first eliminates the escaping problem entirely. (Surfaced as D1-OBS-001 during the v2 experiment verification of D.1.)

### 13. Report to user

No Jira write-back is performed: the **GitHub-for-Jira app** auto-links the PR to ticket `<KEY>` from the key in the branch + PR title/body. _(If the link doesn't appear on the ticket, the app isn't connected to this repo's org — post a comment-back via the Atlassian MCP as a fallback.)_

Report to the user:

- PR URL
- Test count (generated)
- Skipped-AC count (if any)
- Collision warnings (if any)
- Typecheck status
- Test run result (PASS/FAIL counts)

Done.
