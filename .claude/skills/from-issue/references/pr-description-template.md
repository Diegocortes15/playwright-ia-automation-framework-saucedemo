# PR Description Template

The `/from-issue` skill writes its PR body using this template. Section order is mandatory; reviewers expect to find each section in this position.

## Template

```markdown
## What I understood from the ticket

> Automated Playwright coverage for `<KEY>` (`<feature>`): <N> tests, all passing.

**Source ticket:** [<KEY>](<jira-issue-url>) — <issue-type>: "<summary>"
**Feature:** <feature>
**Requirement (as written):** <restatement shaped by `requirement_form` — restate the narrative if present; summarize the GWT scenarios; paraphrase prose into intent>

**Acceptance Criteria (normalized):**
- AC 1: <normalized text>
- AC 2: <normalized text>
- ...

**⚠️ Assumptions & open questions:** <render this block ONLY when `assumptions[]` is non-empty; omit entirely otherwise>

- <each inference/ambiguity, one per bullet, inviting reviewer confirmation — e.g. "Ticket didn't name a user → assumed `standard_user`. Reviewer: confirm.">

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
- 🗂️ **TCMS records:** `.tcms/records/<KEY>.json` written + committed (Qase syncs at merge — see [ADR-0017](../../../docs/adr/0017-tcms-sync-at-merge.md)).

## Notes for reviewer

(omit this section entirely if no notes)

- ⚠️ **Side effect:** the workflow modified `<file>` to make the generated test runnable. Verify the change is reasonable.
- ⚠️ **Side effect (externalized data):** per [`data-placement.md`](data-placement.md), N `<feature>` scenario(s) were externalized to `data/scenarios/<feature>/` + a loader in `data/fixtures.ts` (reused/large/named-scenario data). Reviewer: verify the loader + payloads. _(Omit when data stayed inline — the default for small, test-local parameterization.)_
- 🔁 **Augment:** this PR **augmented** an existing spec `tests/<feature>/<feature>.spec.ts` (prior contributors: `<KEY-list>`) rather than creating a new file. AC-coverage rows below are marked `added` or `skipped (already covered)`.
- ➕ **Page Object additions:** appended `<members>` to `<PageObject>` for the new tests (existing members untouched).
- ⚙️ **Harness grew:** wired the `<user>` project + auth setup (first ticket needing `<user>`) by appending to `tests/users.ts` `AUTH_USERS` (per [ADR-0014](../../../docs/adr/0014-from-issue-harness-growth.md)). Reviewer: confirm. _(Omit when no new user was wired.)_
- ⚠️ **Page Object modification:** modified existing method `<Method>` on `<PageObject>`. Because other specs may call it, the **full suite** ran locally (see Verification). Reviewer: confirm no dependent spec regressed.
- ⏭️ **Skipped (duplicate):** AC <id> maps to a test already present (`<existing test>`); not re-added. Reviewer: push back if the existing test doesn't actually cover it.
- _(Include only the augment notes that apply; omit this whole group for plain CREATE-NEW runs.)_
- 📝 **LLM judgment (MERGE):** AC X and AC Y were merged into one parameterized test because both share the same setup + flow with different inputs. Reviewer: push back if you want them split.
- 📝 **LLM judgment (SPLIT):** AC Z contained compound behaviors and was split into N tests. Reviewer: push back if you wanted one mega-test.
- 📝 **LLM judgment (SKIP):** AC W was skipped because <rationale per qa-analysis.md>. Reviewer: push back if you want it generated.

## Collision warnings

(omit this section entirely if no collisions)

- ⚠️ **Page Name collision** — `<PageName>` already exists at `<resolved-path>` (e.g., `src/pages/<PageName>.ts` or `src/pages/checkout/<PageName>.ts`). Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the ticket with a different Page Name.
```

## Rules

- **Section order is mandatory** — `What I understood` → `AC coverage` → `Verification` → `Notes for reviewer` (optional) → `Collision warnings` (optional). (No `## Source` footer — the `Source ticket:` line in "What I understood" already names + links the ticket.)
- **"What I understood" block** (adaptive, per [ADR-0012](../../../docs/adr/0012-from-issue-conventions.md)):
  - **Summary** lead (`> `) — one TL;DR line: `Automated Playwright coverage for <KEY> (<feature>): N tests, all passing.`
  - **`Source ticket:`** — mandatory: `[<KEY>](<jira-url>) — <issue-type>: "<summary>"`. This is the key the GitHub-for-Jira app matches in the PR body to link the PR onto the ticket — so no separate `## Source` footer is needed.
  - **`Feature:`** — the snake_case feature.
  - **`Requirement (as written):`** — restate the requirement in whatever form the ticket used (`requirement_restated` from Step 4): the narrative if present, a scenario summary for GWT, a paraphrase for prose. Never assert a fixed structure.
  - **`⚠️ Assumptions & open questions:`** — render ONLY when Step 4's `assumptions[]` is non-empty; one bullet per inference/ambiguity, each inviting reviewer confirmation. Omit the whole block when the ticket was fully explicit.
  - There is no `Page Name` or `User Story` line — the Page Object is covered by the Notes-for-reviewer scaffold/collision note, and the requirement is conveyed by `Requirement (as written)`.
- **AC coverage table**:
  - Truncate long AC text to ≤80 chars; reviewers can click through to the ticket for full text.
  - "Test" column: backtick-wrapped **prose** test title for generated ACs (titles no longer contain tags — tags live in the `{ tag }` option per [ADR-0015](../../../docs/adr/0015-spec-tags-via-tag-option.md)); em-dash `—` for skipped. Prepend `⚡ ` INSIDE the backticks for tests tagged `@smoke` (the test's `{ tag }`), e.g., `` `⚡ standard_user logs in and lands on inventory` ``. Non-smoke tests have no prefix.
  - "Bucket" column: exactly one of `Positive` / `Negative` / `Edge` for generated tests; em-dash `—` for skipped ACs. Classification follows [`bucket-classification.md`](bucket-classification.md).
  - "Status" column: `✅ generated` or `⚠️ skipped: <one-line rationale>`. **For AUGMENT runs:** use `✅ added` for tests inserted into an existing file, and `⏭️ skipped (already covered)` for duplicate-guard skips.
- **Verification — bucket warnings**: If workflow Step 6 emitted any "invalid bucket" soft warnings (per [`bucket-classification.md`](bucket-classification.md)), append them as additional bullets at the END of the Verification section, after the Test run list. Example: `- ⚠️ LLM emitted invalid bucket "Boundary" for test "<title>" — defaulted to Edge. Reviewer: verify classification.`
- **Verification — smoke warnings**: If workflow Step 6 emitted any "invalid smoke value" soft warnings (per [`smoke-policy.md`](smoke-policy.md)), append them as additional bullets at the END of the Verification section, after any bucket warnings. Example: `- ⚠️ LLM emitted invalid smoke value "maybe" for test "<title>" — defaulted to false. Reviewer: verify classification.`
- **Verification — full suite on PO modify**: when an AUGMENT run modified an existing Page Object method (workflow Step 10 `po_modified`), prefix the Test run list with `- **Full suite run** (existing Page Object method modified — see Notes for reviewer).` and list per-spec PASS/FAIL across the suite, not just the target spec.
- **Notes for reviewer**: include this section ONLY when the skill made side-effect file changes OR LLM-judgment calls (merge/split/skip per [`qa-analysis.md`](qa-analysis.md)) that the reviewer might disagree with. Each note is a bullet starting with an emoji marker (⚠️ for side effects, ⚙️ for harness growth per [`harness.md`](harness.md), 📝 for judgment calls). If the workflow produced no side effects and no merge/split/skip decisions, OMIT this section entirely. Position: between `Verification` and `Collision warnings` per the Section order rule.
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

## Example: 2-test PR with one collision

```markdown
## What I understood from the ticket

> Automated Playwright coverage for `SW-1` (`login`): 2 tests, all passing.

**Source ticket:** [SW-1](https://your-site.atlassian.net/browse/SW-1) — Story: "Login in Saucedemo App"
**Feature:** login
**Requirement (as written):** four Given/When/Then scenarios — successful login for the valid users, empty/missing-field validation, and invalid-credential rejection.

<!-- Assumptions block omitted: the ticket was fully explicit (no inferences). -->

**Acceptance Criteria (normalized):**
- AC 1: User can log in with standard_user / secret_sauce and lands on inventory page.
- AC 2: Locked-out user sees an error message.

## AC coverage

| AC | Test | Bucket | Status |
|----|------|--------|--------|
| AC 1: User can log in with standard_user / secret_sauce and lands... | `⚡ standard_user logs in successfully and lands on inventory` | Positive | ✅ generated |
| AC 2: Locked-out user sees an error message. | `⚡ locked_out_user sees the lockout error` | Negative | ✅ generated |

## Verification

- **Typecheck:** ✅ PASS
- **Test run:**
  - `standard_user logs in successfully and lands on inventory` — ✅ PASS
  - `locked_out_user sees the lockout error` — ✅ PASS

## Collision warnings

- ⚠️ **Page Name collision** — `LoginPage` already exists at `src/pages/LoginPage.ts`. Reused the existing Page Object; did NOT call `/scaffold-page-object`. Reviewer: verify the existing Page Object exposes the methods this PR's tests rely on, or refile the ticket with a different Page Name.
```
