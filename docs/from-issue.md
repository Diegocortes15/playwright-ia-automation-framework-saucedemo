# from-issue — Learning Guide

The `/from-issue` skill turns a Jira ticket into a GitHub PR full of generated Playwright tests. This is the learning guide; for the procedural workflow Claude follows, see [`.claude/skills/from-issue/references/workflow.md`](../.claude/skills/from-issue/references/workflow.md). Jira is the ticket source as of [ADR-0011](adr/0011-jira-ticket-source.md).

## What is `/from-issue`

It's a Claude Code custom skill that takes:

- A Jira issue key (e.g., `SW-123`, project `SW`), read via the Atlassian MCP
- Optional: a `dry-run` flag to skip push/PR for experimentation; `--new-file` to force a new file instead of augmenting

…and produces:

- A new test file at `tests/<feature>/<feature>.spec.ts`
- A new branch `<KEY>-<feature>` (key-first, e.g. `SW-1-login`)
- A PR with a structured description (What I understood — incl. the source ticket + any assumptions / AC coverage table / Verification / Collision warnings)
- The **GitHub-for-Jira app** auto-links the PR onto the ticket (no comment is posted)

The skill is **fully autonomous** by default. The PR is the review gate — no interactive checkpoints during execution.

The skill normalizes any ticket format/quality (narrative, GWT, bullet ACs, prose, mixed); for thin tickets it generates best-effort and surfaces its inferences as an **Assumptions & open questions** block in the PR for review (per [ADR-0012](adr/0012-from-issue-conventions.md)).

**Test bucketing (since C.2.b):** Generated tests are grouped into up to three nested describe blocks — `Positive`, `Negative`, `Edge` — based on the LLM's classification of each test (rules in [`.claude/skills/from-issue/references/bucket-classification.md`](../.claude/skills/from-issue/references/bucket-classification.md)). Empty buckets are omitted. The PR description's AC coverage table includes a `Bucket` column so reviewers see the classification at a glance.

**Smoke tagging (since C.2.c):** A curated subset of generated tests receive the `@smoke` tag. Selection is LLM judgment per test against [`.claude/skills/from-issue/references/smoke-policy.md`](../.claude/skills/from-issue/references/smoke-policy.md) — default is NOT smoke. Smoke is orthogonal to bucket: a Negative test can be smoke (critical regression risk), a Positive test can be NOT-smoke (peripheral happy path). Run the smoke subset with `npm run test:smoke`. PR coverage table shows a `⚡` marker for smoke tests.

Distinction from `/scaffold-page-object`: **`/from-issue` is the orchestrator** that generates tests. When an AC references a Page that doesn't yet exist in `src/pages/`, `/from-issue` invokes `/scaffold-page-object` to create it first, then generates tests against the resulting Page Object.

## How it's wired in this project

- Skill files at `.claude/skills/from-issue/`
  - `SKILL.md` — frontmatter + intro + pointer (always loaded for skill discovery)
  - `references/workflow.md` — the procedural workflow (loaded when skill runs)
  - `references/test-template.md` — canonical test file template
  - `references/pr-description-template.md` — structured PR body template
- Jira ticket-authoring guide at [`docs/jira-tickets.md`](jira-tickets.md) — how reporters should write a ticket (Feature + ACs in the description) so the skill can parse it
- Reads tickets via the **Atlassian MCP** (OAuth, no token); `gh` opens the PR
- Generated tests land at `tests/<feature>/<feature>.spec.ts` (feature folder + filename both snake_case from the ticket's Feature line — see workflow Step 8 for the collision rule when a second ticket targets the same feature)
- Branch naming `<KEY>-<feature>` (key-first, e.g. `SW-1-login`) leads with the Jira key — which is also what the GitHub-for-Jira app matches to auto-link the PR onto the ticket (per [ADR-0012](adr/0012-from-issue-conventions.md))

## Verifying the setup

After the skill is installed, run this 3-step smoke test in a fresh Claude Code session.

### Step 1 — Skill discoverable

Open Claude Code in this repo. Type `/skills`. Expected: `from-issue` is listed alongside `playwright-cli` and `scaffold-page-object`.

### Step 2 — Ticket readable via the MCP

Confirm the Atlassian MCP is connected (OAuth). Create a ticket in project `SW` following [`docs/jira-tickets.md`](jira-tickets.md) (Feature + ACs in the description). Expected: the skill can read it — a get-issue call for the key returns the summary + description.

### Step 3 — End-to-end run against a real ticket

Create a ticket in Jira (project `SW`) with a description like:

> **Feature:** login
> **AC 1:** User can log in with `standard_user` / `secret_sauce` from the login page and lands on the inventory page.
> **AC 2:** Locked-out user sees an error message on the login page.

Note the issue key (e.g., `SW-1`). In Claude Code:

> Use the from-issue skill on SW-1.

Expected:

- Skill executes the workflow
- `LoginPage` doesn't exist yet → `/scaffold-page-object` is composed to create it (or, if it exists, reuse + collision warning)
- LLM analyzes 2 ACs → generates 2 tests
- Test file lands at `tests/login/login.spec.ts`
- Isolated typecheck PASS
- Test run PASS (both tests)
- PR opens with the structured description; `SW-1` in the branch + title
- The GitHub-for-Jira app links the PR onto ticket `SW-1`

After verifying: close the PR, delete the branch, close the ticket.

## Worked examples

### Generate tests for an existing page

Use this when the Page Object already exists in `src/pages/`.

> Use the from-issue skill on SW-57.

Result: skill detects the existing Page Object, reuses it, surfaces a collision warning in the PR body so reviewers can confirm the existing Page Object exposes the methods the new tests rely on.

### Generate tests AND scaffold a new page

Use this when an AC references a Page that doesn't yet exist.

> Use the from-issue skill on SW-58.

Result: skill invokes `/scaffold-page-object` to create the new Page Object first, then generates tests against it. The PR includes BOTH the new `src/pages/<Name>.ts` file AND the new test file.

### Augment an existing feature

Use this when a new ticket extends a feature that already has a generated spec.

> Use the from-issue skill on SW-25.

Result (per [ADR-0010](adr/0010-from-issue-augment-mode.md)): the skill detects `tests/login/login.spec.ts` already exists (from ticket `SW-7`), and **augments** it — inserts the new test(s) into the correct `Positive`/`Negative`/`Edge` bucket, appends any new `LoginPage` method/locator the tests need (or modifies an existing method, which then triggers a full-suite run), and adds a `// Augmented by: SW-25 (<date>)` line to the header. The PR diff shows exactly what was inserted.

Re-running a contributing ticket (here, `SW-7` or `SW-25`) refuses — the header contributor set is the guard. To force a separate file instead, pass `--new-file`:

> Use the from-issue skill on SW-25 with --new-file.

This writes `tests/login/login-SW-25.spec.ts` (the pre-D.2 behavior), for when the new ACs are a genuinely distinct sub-area.

### Experiment before committing (dry-run)

Use this to see what the skill produces without pushing or opening a PR.

> Use the from-issue skill on SW-1 with dry-run.

Result: local branch + test file + (if applicable) new Page Object are written. Steps 11–12 (push, PR) are skipped. Inspect the files locally; `git checkout main && git branch -D SW-1-<feature>` to discard.

### Inspect a generated file's comment block

Open any file the skill produced. The first ~5 lines must be:

```ts
// Generated by /from-issue on YYYY-MM-DD from Jira SW-1.
// Source: https://your-site.atlassian.net/browse/SW-1
// Title: <summary>
// Manual edits are welcome — this file is not regenerated automatically.
// Re-running /from-issue against a contributing issue will refuse to overwrite.
```

This block is mandatory per the skill's output template ([`.claude/skills/from-issue/references/test-template.md`](../.claude/skills/from-issue/references/test-template.md)). Future PR reviewers reading the file will know it was AI-generated, where the source ticket is, and that edits are expected.

### Inspect the generated file structure (C.2.b + C.2.c)

A generated file with mixed Positive + Negative tests + smoke selection looks like:

```ts
test.describe('login @no-auth', () => {
  test.describe('Positive', () => {
    test('@smoke standard_user logs in successfully and lands on inventory', async ({
      loginPage,
      page,
    }) => {
      /* ... */
    });
  });

  test.describe('Negative', () => {
    test('@smoke locked_out_user sees the lockout error', async ({ loginPage }) => {
      /* ... critical auth-rejection regression risk — selected as smoke */
    });
    test('invalid password shows generic error', async ({ loginPage }) => {
      /* ... secondary error path — NOT smoke */
    });
  });
  // Edge describe omitted — no edge tests for this ticket.
});
```

The auth-tag (`@no-auth`) lives **only** on the outer describe — never repeated in the test titles, where it would render as a duplicate tag chip in the Playwright report (the outer-describe tag and the Playwright project name already cover it). Bucket order is fixed (`Positive → Negative → Edge`); empty buckets are omitted entirely. Reviewers see the per-test bucket in the PR body's AC coverage table (`AC | Test | Bucket | Status`) and smoke tests are flagged with `⚡` in the Test column.

### Reviewer override: changing the smoke set on a PR

If you disagree with the LLM's smoke picks on a PR, edit the generated file directly in the same PR — add `@smoke ` at the start of the title of a test that should be smoke, or remove `@smoke ` from a test that shouldn't be. The orchestrator does NOT re-run on the same ticket. The PR is the curation gate; the LLM is just the first draft.

## When NOT to use it

- **Tickets the skill can't extract ACs from.** The LLM attempts best-effort parsing of the description but aborts if it can't find concrete ACs. Ask the reporter to follow [`docs/jira-tickets.md`](jira-tickets.md).
- **Regenerating over a ticket that already contributed.** The skill refuses (the header contributor set is the guard) — it augments a feature's spec when a _new_ ticket extends it, but won't re-run a contributing key. `rm` the tests or edit directly.
- **Production credential pages.** The skill picks up storageState files that include real sessions; treat them with the same care as a real browser session.

## Pointers

- [ADR-0011](adr/0011-jira-ticket-source.md) — Jira as the ticket source (read via the Atlassian MCP)
- [ADR-0010](adr/0010-from-issue-augment-mode.md) — augment mode (extend an existing spec)
- [ADR-0008](adr/0008-custom-skills-pattern.md) — custom skills pattern, why files are laid out this way
- [`from-issue` SKILL.md](../.claude/skills/from-issue/SKILL.md) — the skill itself
- [`references/workflow.md`](../.claude/skills/from-issue/references/workflow.md) — the procedural workflow
- [`docs/jira-tickets.md`](jira-tickets.md) — how to author a parseable ticket
- [`docs/scaffold-page-object.md`](scaffold-page-object.md) — the C.1 skill this orchestrator composes
