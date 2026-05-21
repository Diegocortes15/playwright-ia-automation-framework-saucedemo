# PR Description Template

The `/from-issue` skill writes its PR body using this template. Section order is mandatory; reviewers expect to find each section in this position.

## Template

```markdown
## What I understood from the issue

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

## Collision warnings

(omit this section entirely if no collisions)

- ⚠️ **Page Name collision** — `<PageName>` already exists at `<resolved-path>` (e.g., `src/pages/<PageName>.ts` or `src/pages/checkout/<PageName>.ts`). Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the issue with a different Page Name.

## Source

Generated from #<issue-number> by `/from-issue` on YYYY-MM-DD.
```

## Rules

- **Section order is mandatory** — `What I understood` → `AC coverage` → `Verification` → `Collision warnings` (optional) → `Source`.
- **AC coverage table**:
  - Truncate long AC text to ≤80 chars; reviewers can click through to the issue for full text.
  - "Test" column: backtick-wrapped test title for generated ACs; em-dash `—` for skipped.
  - "Bucket" column: exactly one of `Positive` / `Negative` / `Edge` for generated tests; em-dash `—` for skipped ACs. Classification follows [`bucket-classification.md`](bucket-classification.md).
  - "Status" column: `✅ generated` or `⚠️ skipped: <one-line rationale>`.
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
- **Source line** — always include, always last. Use the issue number (auto-renders as a GitHub cross-reference link).

## Example: 2-test PR with one collision

```markdown
## What I understood from the issue

**Feature:** login
**Page Name:** LoginPage
**User Story:** (none provided)

**Acceptance Criteria (normalized):**
- AC 1: User can log in with standard_user / secret_sauce and lands on inventory page.
- AC 2: Locked-out user sees an error message.

## AC coverage

| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `@no-auth standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `@no-auth locked_out_user sees the lockout error` | Negative | ✅ generated |

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `@no-auth standard_user logs in successfully and lands on inventory` — ✅ PASS
  - `@no-auth locked_out_user sees the lockout error` — ✅ PASS

## Collision warnings

- ⚠️ **Page Name collision** — `LoginPage` already exists at `src/pages/LoginPage.ts`. Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the issue with a different Page Name.

## Source

Generated from #42 by `/from-issue` on 2026-05-18.
```
