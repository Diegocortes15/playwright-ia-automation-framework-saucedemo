# PR Description Template

The `/from-issue` skill writes its PR body using this template. Section order is mandatory; reviewers expect to find each section in this position.

## Template

```markdown
## What I understood from the ticket

**Feature:** <feature>
**Page Name:** <page-name>
**User Story:** <user-story-text or "(none provided)">

**Acceptance Criteria (normalized):**
- AC 1: <normalized text>
- AC 2: <normalized text>
- ...

## AC coverage

| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: <truncated text> | `<test title>` | Positive | ✅ generated |
| AC 2: <truncated text> | `<test title>` | Negative | ✅ generated |
| AC 3: <truncated text> | — | — | ⚠️ skipped: <LLM rationale> |

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `<test title 1>` — ✅ PASS
  - `<test title 2>` — ✅ PASS

## Notes for reviewer

(omit this section entirely if no notes)

- ⚠️ **Side effect:** the workflow modified `<file>` to make the generated test runnable. Verify the change is reasonable.
- ⚠️ **Side effect (externalized data):** per [`data-placement.md`](data-placement.md), N `<feature>` scenario(s) were externalized to `data/scenarios/<feature>/` + a loader in `data/fixtures.ts` (reused/large/named-scenario data). Reviewer: verify the loader + payloads. _(Omit when data stayed inline — the default for small, test-local parameterization.)_
- 🔁 **Augment:** this PR **augmented** an existing spec `tests/<feature>/<feature>.spec.ts` (prior contributors: `<KEY-list>`) rather than creating a new file. AC-coverage rows below are marked `added` or `skipped (already covered)`.
- ➕ **Page Object additions:** appended `<members>` to `<PageObject>` for the new tests (existing members untouched).
- ⚠️ **Page Object modification:** modified existing method `<Method>` on `<PageObject>`. Because other specs may call it, the **full suite** ran locally (see Verification). Reviewer: confirm no dependent spec regressed.
- ⏭️ **Skipped (duplicate):** AC <id> maps to a test already present (`<existing test>`); not re-added. Reviewer: push back if the existing test doesn't actually cover it.
- _(Include only the augment notes that apply; omit this whole group for plain CREATE-NEW runs.)_
- 📝 **LLM judgment (MERGE):** AC X and AC Y were merged into one parameterized test because both share the same setup + flow with different inputs. Reviewer: push back if you want them split.
- 📝 **LLM judgment (SPLIT):** AC Z contained compound behaviors and was split into N tests. Reviewer: push back if you wanted one mega-test.
- 📝 **LLM judgment (SKIP):** AC W was skipped because <rationale per qa-analysis.md>. Reviewer: push back if you want it generated.

## Collision warnings

(omit this section entirely if no collisions)

- ⚠️ **Page Name collision** — `<PageName>` already exists at `<resolved-path>` (e.g., `src/pages/<PageName>.ts` or `src/pages/checkout/<PageName>.ts`). Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the ticket with a different Page Name.

## Source

Generated from <KEY> by `/from-issue` on YYYY-MM-DD.
```

## Rules

- **Section order is mandatory** — `What I understood` → `AC coverage` → `Verification` → `Notes for reviewer` (optional) → `Collision warnings` (optional) → `Source`.
- **AC coverage table**:
  - Truncate long AC text to ≤80 chars; reviewers can click through to the ticket for full text.
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped. Prepend `⚡ ` INSIDE the backticks for smoke tests (those with `@smoke` in the title), e.g., `` `⚡ @no-auth @smoke standard_user logs in...` ``. Non-smoke tests have no prefix.
  - "Bucket" column: exactly one of `Positive` / `Negative` / `Edge` for generated tests; em-dash `—` for skipped ACs. Classification follows [`bucket-classification.md`](bucket-classification.md).
  - "Status" column: `✅ generated` or `⚠️ skipped: <one-line rationale>`. **For AUGMENT runs:** use `✅ added` for tests inserted into an existing file, and `⏭️ skipped (already covered)` for duplicate-guard skips.
- **Verification — bucket warnings**: If workflow Step 6 emitted any "invalid bucket" soft warnings (per [`bucket-classification.md`](bucket-classification.md)), append them as additional bullets at the END of the Verification section, after the Test run list. Example: `- ⚠️ LLM emitted invalid bucket "Boundary" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`
- **Verification — smoke warnings**: If workflow Step 6 emitted any "invalid smoke value" soft warnings (per [`smoke-policy.md`](smoke-policy.md)), append them as additional bullets at the END of the Verification section, after any bucket warnings. Example: `- ⚠️ LLM emitted invalid smoke value "maybe" for test "<title>" — defaulted to false. Reviewer: verify classification.`
- **Verification — full suite on PO modify**: when an AUGMENT run modified an existing Page Object method (workflow Step 10 `po_modified`), prefix the Test run list with `- **Full suite run** (existing Page Object method modified — see Notes for reviewer).` and list per-spec PASS/FAIL across the suite, not just the target spec.
- **Notes for reviewer**: include this section ONLY when the skill made side-effect file changes OR LLM-judgment calls (merge/split/skip per [`qa-analysis.md`](qa-analysis.md)) that the reviewer might disagree with. Each note is a bullet starting with an emoji marker (⚠️ for side effects, 📝 for judgment calls). If the workflow produced no side effects and no merge/split/skip decisions, OMIT this section entirely. Position: between `Verification` and `Collision warnings` per the Section order rule.
- **Verification on failure**:
  - Typecheck FAIL → use `❌ FAIL` and include a fenced code block with the verbatim typecheck errors.
  - Test FAIL → use `❌ FAIL: <one-line message>` and include a `<details>` block with the verbatim failure output:

    ```markdown
    - `<test title>` — ❌ FAIL: assertion error

      <details>
      <summary>Failure output</summary>

      \`\`\`
      <verbatim test failure output>
      \`\`\`

      </details>
    ```

- **Collision warnings section is omitted entirely when no collisions occur** — don't render an empty header.
- **Source line** — always include, always last. Use the Jira key `<KEY>` (the GitHub-for-Jira app matches it in the PR body to link the PR onto the ticket).

## Example: 2-test PR with one collision

```markdown
## What I understood from the ticket

**Feature:** login
**Page Name:** LoginPage
**User Story:** (none provided)

**Acceptance Criteria (normalized):**
- AC 1: User can log in with standard_user / secret_sauce and lands on inventory page.
- AC 2: Locked-out user sees an error message.

## AC coverage

| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `⚡ @no-auth @smoke standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `⚡ @no-auth @smoke locked_out_user sees the lockout error` | Negative | ✅ generated |

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `@no-auth standard_user logs in successfully and lands on inventory` — ✅ PASS
  - `@no-auth locked_out_user sees the lockout error` — ✅ PASS

## Collision warnings

- ⚠️ **Page Name collision** — `LoginPage` already exists at `src/pages/LoginPage.ts`. Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the ticket with a different Page Name.

## Source

Generated from SW-42 by `/from-issue` on 2026-05-18.
```
