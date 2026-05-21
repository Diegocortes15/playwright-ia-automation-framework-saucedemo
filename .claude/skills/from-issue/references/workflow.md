# from-issue Workflow

The 13-step procedural workflow Claude follows when the `from-issue` skill is invoked.

## Inputs

- **Issue number** (required, positional) — e.g., `/from-issue 42`
- **`dry-run`** (optional flag) — skip steps 11–13 (push, PR, issue comment). Files written and tests run locally only.

## Steps

### 1. Validate inputs

Check that an issue number is present and is a positive integer. If missing or malformed, ask the user — don't guess.

Check `gh auth status` exits 0. If not, abort with: _"`gh` is not authenticated. Run `gh auth login` and re-run."_

### 2. Fetch issue

```bash
gh issue view <num> --json title,body,labels,number,url
```

If the issue doesn't exist or you lack access, abort with the `gh` error verbatim.

Parse the JSON. Capture: `title`, `body`, `labels[].name`, `number`, `url`.

### 3. Verify `to-be-automated` label present

If `to-be-automated` is NOT in `labels[].name`, abort with:

> _"Issue #N is missing the `to-be-automated` label. Add the label and re-run."_

Do NOT add the label autonomously.

### 4. LLM normalization

The issue body should follow the GitHub Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml`. Extract:

- **Feature** (single-line) — drives `tests/<feature>/`
- **Page Name** (PascalCase) — drives the Page Object resolution
- **User Story** (optional) — context only
- **Acceptance Criteria** (multi-line, one AC per line)
- **Notes** (optional) — context only

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

**If the issue body is free-form (no template structure)**, attempt best-effort parse. If no ACs can be extracted, abort with:

> _"Couldn't extract ACs from issue body. Ask the reporter to refile using the `to-be-automated` template."_

**If `worth_automating=false` for ALL ACs**, abort BEFORE writing files. If `dry-run` was passed, simply report the rationale to the user (no issue comment, no PR). Otherwise, post a comment on the source issue:

```bash
gh issue comment <num> --body "$(cat <<'EOF'
/from-issue reviewed this issue but found no ACs worth automating:

- AC 1: <rationale>
- AC 2: <rationale>
- ...

Close this issue if the assessment is correct, or refile with more concrete ACs.
EOF
)"
```

Then stop. No PR.

### 5. Resolve target Page Object

```bash
ls src/pages/<PageName>.ts 2>/dev/null
# If not found at top level, also check the checkout subfolder:
ls src/pages/checkout/<PageName>.ts 2>/dev/null
```

- **Either path exists** → reuse the existing Page Object. Record a collision warning for the PR body. Continue.
- **Neither path exists** → invoke `/scaffold-page-object` with inputs:
  - Page name: `<PageName>`
  - URL: inferred from the AC text (e.g., AC mentions "cart page" → `https://www.saucedemo.com/cart.html`)
  - storageState: `auth/standard.json` by default. Override only if ALL Step 4 AC records share the same non-standard user (the storageState is only used for the snapshot; tests pick their own user via tag→project mapping).

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

**Validate bucket values before Step 7.** Each test's `bucket` must be one of `{Positive, Negative, Edge}`. If the LLM emits any other value (e.g., `"Boundary"`), default that test to `Edge` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid bucket "<value>" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`

**Validate smoke values before Step 7.** Each test's `smoke` must be exactly `true` or `false`. If the LLM emits any other value, default that test to `false` and record a soft warning for the PR body's Verification section: `⚠️ LLM emitted invalid smoke value "<value>" for test "<title>" — defaulted to false. Reviewer: verify classification.`

**If `references/bucket-classification.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/bucket-classification.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules — the doc is the source of truth.

**If `references/smoke-policy.md` is missing or unreadable**, abort with: _"`.claude/skills/from-issue/references/smoke-policy.md` not found. Re-install the skill or restore from git."_ Do not fall back to inline rules.

### 7. Render test file

Apply [`references/test-template.md`](test-template.md):

- Top-of-file 5-line provenance block (substitute today's date, issue number, URL, title)
- Imports: `@fixtures/test` (always), `@utils/env` (when password needed)
- Single outer `test.describe('<feature> (<auth-tag>)', ...)` wrap
- Inside the outer describe, group tests by their `bucket` field into up to three nested `test.describe('Positive' | 'Negative' | 'Edge', ...)` blocks
- Bucket describes appear in fixed order: **Positive → Negative → Edge** (even if Negative tests outnumber Positive)
- **Omit empty buckets entirely** — if no tests were classified into a bucket, don't emit its describe block at all
- Within each bucket describe, tests appear in their Step 6 emission order

Each `test(...)` title is constructed by prepending the test record's tags to the behavior description: `'<auth-tag> [@smoke] [<user-tag>] <behavior>'` (square brackets = optional). If `smoke: true`, prepend `@smoke ` immediately after the auth-tag; if `smoke: false`, omit it. Omit `<user-tag>` for user-agnostic tests like `@all-users`. This is the format defined in [`references/test-template.md`](test-template.md) "Rules".

Render to an in-memory string. Do NOT Write yet — Step 8 handles overwrite refusal first.

### 8. Write test file

Resolve the target path:

```
tests/<feature>/<slug>.spec.ts
```

Where `<feature>` is the snake_case Feature field and `<slug>` is the issue-title slug (see "Slug derivation" below).

Check whether the file already exists:

```bash
ls tests/<feature>/<slug>.spec.ts 2>/dev/null
```

- **Exists** → refuse with: _"`tests/<feature>/<slug>.spec.ts` exists. `rm` it and re-run, or refile the issue with a different title."_ No PR.
- **Does not exist** → ensure the `tests/<feature>/` directory exists (`mkdir -p` if needed), then Write the file.

#### Slug derivation

The same `<slug>` is used for both the test filename and the branch name (`from-issue/<num>-<slug>`). Derive deterministically:

1. Take the issue title (e.g., `"[TBA] Add Cart validation for empty checkout"`).
2. Strip a leading `[TBA] ` (or `[TBA]`) prefix if present.
3. Lowercase.
4. Replace any non-alphanumeric character with `-`.
5. Collapse repeated `-` and strip leading/trailing `-`.
6. Truncate to **40 characters max**, breaking on a `-` boundary if possible.

Example: `"[TBA] Add Cart validation for empty checkout"` → `add-cart-validation-for-empty-checkout`. No stop-word stripping (keep meaning intact).

### 9. Isolated typecheck

Use the same `.tsconfig.scratch.json` pattern as C.1 step 11. A bare `npx tsc --noEmit <path>` doesn't pick up the project's `tsconfig.json` (it falls back to TS defaults without `paths` aliases, so `@fixtures/test` and `@pages/*` imports would fail with bogus "Cannot find module" errors).

1. **Write a throwaway tsconfig** via the `Write` tool at `.tsconfig.scratch.json`:

   ```json
   {
     "extends": "./tsconfig.json",
     "include": ["tests/<feature>/<slug>.spec.ts"],
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

```bash
npx playwright test tests/<feature>/<slug>.spec.ts --reporter=list
```

Capture per-test PASS/FAIL output. Record one line per test for the PR body's Verification section:

- ✅ PASS → `` `<test title>` — ✅ PASS ``
- ❌ FAIL → `` `<test title>` — ❌ FAIL: <one-line message> `` plus a `<details>` block with verbatim failure output

DO NOT abort on test failures — continue to Step 11. The PR-as-review-gate model means reviewers see and fix failures in the PR.

### 11. Branch + commit + push

**Dry-run check:** If `dry-run` was passed, SKIP this step and Steps 12–13. Report the local file path and verification status only.

```bash
git checkout -b from-issue/<num>-<slug>
```

If the branch already exists, abort with: _"Branch `from-issue/<num>-<slug>` exists — delete it and re-run."_ No PR.

```bash
git add tests/<feature>/<slug>.spec.ts
# If /scaffold-page-object created a new file during Step 5, also stage its actual path.
# Use the resolved path from Step 5 — could be src/pages/<PageName>.ts OR src/pages/checkout/<PageName>.ts.
# Example (top-level page):
#   git add src/pages/<PageName>.ts
# Example (checkout subfolder):
#   git add src/pages/checkout/<PageName>.ts
git commit -m "feat: add generated tests from #<num>"
git push -u origin from-issue/<num>-<slug>
```

If `git push` fails (no remote, no auth), abort with the git error verbatim. The local branch and files remain on disk.

### 12. Open PR

Render the PR body using [`references/pr-description-template.md`](pr-description-template.md). Pass the body via a HEREDOC:

```bash
# Title: "feat: tests from #<num> — <issue-title>"; truncate the title portion to ≤ 60 chars (break on a word boundary if possible).
gh pr create --title "feat: tests from #<num> — <truncated-title>" --body "$(cat <<'EOF'
<rendered PR body>
EOF
)"
```

Capture the returned PR URL — `gh pr create` writes it to stdout on success (the only line of output is the URL).

If `gh pr create` fails (no remote, no permission), abort with the `gh` error verbatim. The local branch and pushed branch remain on the remote.

### 13. Comment on source issue + report to user

```bash
gh issue comment <num> --body "🤖 /from-issue opened <pr-url> with generated tests for review."
```

Then report to the user:

- PR URL
- Test count (generated)
- Skipped-AC count (if any)
- Collision warnings (if any)
- Typecheck status
- Test run result (PASS/FAIL counts)

Done.
