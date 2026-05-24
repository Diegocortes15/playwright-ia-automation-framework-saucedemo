# Phase E — Jira as the Ticket Source for `/from-issue` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retarget `/from-issue` to read its source ticket from Jira (project key `SW`, invoked `/from-issue SW-123`) via the Atlassian MCP, with the GitHub-for-Jira app auto-linking the PR — fully replacing the GitHub-Issues source.

**Architecture:** Pure skill-documentation edits — no runtime code. Only the _ends_ of the workflow change (fetch + write-back); the analysis/rendering middle (Steps 4–10) and the D.2 augment logic are reused verbatim. Reads via the Atlassian MCP (OAuth, no secrets); PR via `gh`; PR↔ticket link via the GitHub-for-Jira app (key in branch + PR title). No Jira write access.

**Tech Stack:** Markdown skill references; Atlassian MCP (read); `gh`/`git` (PR); Prettier (format gate); Playwright (the eventual real run).

**Spec:** [`docs/superpowers/specs/2026-05-24-phase-e-jira-ticket-source-design.md`](../specs/2026-05-24-phase-e-jira-ticket-source-design.md)

**Branch:** `phase-e-jira-ticket-source` (spec already committed).

**TDD note:** Documentation edits — no per-task unit tests. Each task's gate is `npx prettier --check <file>` + a consistency read against the spec. **Task 8 is the behavioral test**, gated on the user connecting the Atlassian MCP and creating ticket `SW-1`.

**Deferred binding — the exact MCP tool name.** The Atlassian MCP is not connected yet, so its exact get-issue tool id is unknown. The workflow text refers to it generically ("the Atlassian MCP's get-issue tool"); the concrete tool id is bound at connection time (Task 8 prerequisite), which is also when `SKILL.md`'s `allowed-tools` gains the MCP entry. This is a documented deferred binding, not a placeholder.

---

## File Structure

| File                                                                                 | Responsibility                                               | Task |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---- |
| `docs/adr/0011-jira-ticket-source.md` (new) + `docs/adr/0007-*` (amend)              | Record Jira-as-source via MCP; scope ADR-0007                | 1    |
| `.claude/skills/from-issue/references/workflow.md` (Inputs, Steps 1–3, Step 4 intro) | Fetch side: Jira key validate, MCP fetch, drop gate          | 2    |
| `.claude/skills/from-issue/references/workflow.md` (Steps 11–13)                     | Write side: key in branch/PR, drop comment-back, keep report | 3    |
| `.claude/skills/from-issue/references/test-template.md`                              | Provenance header keyed by Jira key                          | 4    |
| `.claude/skills/from-issue/SKILL.md`                                                 | Intro + usage → Jira keys (allowed-tools MCP entry deferred) | 5    |
| `docs/jira-tickets.md` (new) + delete `.github/ISSUE_TEMPLATE/to-be-automated.yml`   | Jira ticket-authoring guide replaces the GitHub form         | 6    |
| `docs/from-issue.md` + `CLAUDE.md`                                                   | Learning guide + project-rules reframe                       | 7    |
| (experiment branch)                                                                  | Behavioral verification                                      | 8    |

Tasks 2 and 3 both edit `workflow.md` (disjoint sections); run sequentially.

---

## Task 1: ADR-0011 + amend ADR-0007

**Files:**

- Create: `docs/adr/0011-jira-ticket-source.md`
- Modify: `docs/adr/0007-gh-cli-not-github-mcp.md` (status line only)

- [ ] **Step 1: Create ADR-0011**

```markdown
# 0011 — Jira as the ticket source for /from-issue (read via the Atlassian MCP)

**Date:** 2026-05-24
**Status:** Accepted

## Context

`/from-issue` originally read GitHub Issues (the project's ticketing premise: "GitHub Issues, no Jira access"). The user created a Jira project (`SW`), and real QA orgs drive automation from Jira — so the template should too. The skill's analysis pipeline (workflow Steps 4–10) is already source-agnostic; only the fetch + write-back ends are GitHub-specific.

## Decision

Jira fully replaces GitHub Issues as the ticket source for `/from-issue` (invoked `/from-issue SW-123`). The skill READS the ticket through the **Atlassian MCP** (OAuth, no token/env vars), parses Feature + Acceptance Criteria from the ticket summary + description, and opens a PR on GitHub via `gh`. There is **no Jira write-back**: the **GitHub-for-Jira app** auto-links the PR to the ticket from the issue key in the branch name + PR title. The readiness gate (the old `to-be-automated` label check) is dropped — explicit invocation is the intent signal.

## Consequences

- The template now mirrors a real Jira-driven QA workflow.
- Zero Jira secrets in the repo or local env (MCP OAuth + app-based linking).
- A new external dependency: the Atlassian MCP must be connected, and the GitHub-for-Jira app must link this repo's org to the Jira site.
- If the app isn't connected, the PR won't appear on the ticket; fallback is a comment-back via the MCP (added only if needed).
- GitHub Issues are no longer a supported source; the issue-form template is retired.

## Alternatives considered

- **REST API + API token in `.env`.** Rejected: requires local secret management; the user prefers no env-var setup, and MCP OAuth is token-free.
- **Keep both GitHub Issues + Jira.** Rejected: a real org runs one system; dual support adds a source-abstraction layer and two doc sets for no real benefit.
- **Jira write-back (comment / status transition) via API.** Rejected: needs write scope + workflow config; the GitHub-for-Jira app already provides the PR↔ticket link for free.

## Relationship to ADR-0007

This **scopes**, not reverses, [ADR-0007](0007-gh-cli-not-github-mcp.md): `gh` CLI remains the choice for GitHub; the Atlassian MCP is adopted _only_ for Jira, justified by token-free OAuth and the absence of a first-class Jira CLI as ubiquitous as `gh`. ADR-0007 is marked "amended by ADR-0011".

## Related

- [ADR-0010](0010-from-issue-augment-mode.md) — augment mode; its provenance/contributor model now keys on Jira issue keys.
```

- [ ] **Step 2: Amend ADR-0007 status line**

In `docs/adr/0007-gh-cli-not-github-mcp.md`, find the status line (near the top, format `**Status:** Accepted`) and change it to:

```markdown
**Status:** Accepted (amended by [ADR-0011](0011-jira-ticket-source.md) — Atlassian MCP adopted for Jira; gh CLI retained for GitHub)
```

(If the exact current status string differs, match it by reading the file first; change only the status line, nothing else.)

- [ ] **Step 3: Format + commit**

Run: `npx prettier --check docs/adr/0011-jira-ticket-source.md docs/adr/0007-gh-cli-not-github-mcp.md` (write+recheck if needed).

```bash
git add docs/adr/0011-jira-ticket-source.md docs/adr/0007-gh-cli-not-github-mcp.md
git commit -m "docs(e): ADR-0011 Jira ticket source via Atlassian MCP; amend ADR-0007" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: workflow.md — fetch side (Inputs, Steps 1–3, Step 4 intro)

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`

- [ ] **Step 1: Retitle the intro line** (line 3)

Replace:

```markdown
The 13-step procedural workflow Claude follows when the `from-issue` skill is invoked.
```

with:

```markdown
The procedural workflow Claude follows when the `from-issue` skill is invoked. The source ticket is a **Jira** issue (project `SW`), read via the Atlassian MCP — see [ADR-0011](../../../../docs/adr/0011-jira-ticket-source.md). (Originally 13 GitHub-Issue steps; Step 3 was dropped and Step 13's Jira write-back removed in Phase E.)
```

- [ ] **Step 2: Replace the Inputs section**

Replace:

```markdown
- **Issue number** (required, positional) — e.g., `/from-issue 42`
- **`dry-run`** (optional flag) — skip steps 11–13 (push, PR, issue comment). Files written and tests run locally only.
```

with:

```markdown
- **Jira issue key** (required, positional) — e.g., `/from-issue SW-123` (project key `SW`).
- **`--new-file`** (optional flag) — force CREATE-NEW instead of augmenting an existing feature spec (per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md), Step 8).
- **`dry-run`** (optional flag) — skip steps 11–12 (branch, push, PR). Files written and tests run locally only.
```

- [ ] **Step 3: Replace Step 1 (Validate inputs)**

Replace:

```markdown
Check that an issue number is present and is a positive integer. If missing or malformed, ask the user — don't guess.

Check `gh auth status` exits 0. If not, abort with: _"`gh` is not authenticated. Run `gh auth login` and re-run."_
```

with:

```markdown
Check that a Jira issue **key** is present and matches `^[A-Z][A-Z0-9]+-\d+$` (e.g. `SW-123`). If missing or malformed, ask the user — don't guess.

Confirm the **Atlassian MCP** is connected (the skill reads tickets through it). If no Atlassian MCP tool is available, abort with: _"The Atlassian MCP isn't connected. Connect it in Claude Code (OAuth), then re-run."_

Check `gh auth status` exits 0 (needed for the PR in Step 12). If not, abort with: _"`gh` is not authenticated. Run `gh auth login` and re-run."_
```

- [ ] **Step 4: Replace Step 2 (Fetch)**

Replace:

````markdown
### 2. Fetch issue

```bash
gh issue view <num> --json title,body,labels,number,url
```

If the issue doesn't exist or you lack access, abort with the `gh` error verbatim.

Parse the JSON. Capture: `title`, `body`, `labels[].name`, `number`, `url`.
````

with:

```markdown
### 2. Fetch the Jira ticket

Read the ticket via the **Atlassian MCP's get-issue tool** for the key (e.g. `SW-123`), requesting the rendered/text form of the description.

> The connected Atlassian MCP server exposes a get-issue tool; confirm its exact name from the available tool list once the MCP is connected (commonly `getJiraIssue` / `jira_get_issue`). Until connected, refer to it generically.

Capture: `<KEY>` (the issue key), `summary` (the title), and `description` (rendered text). If the ticket doesn't exist or you lack access, abort with the MCP error verbatim.
```

- [ ] **Step 5: Replace Step 3 (drop the gate)**

Replace:

```markdown
### 3. Verify `to-be-automated` label present

If `to-be-automated` is NOT in `labels[].name`, abort with:

> _"Issue #N is missing the `to-be-automated` label. Add the label and re-run."_

Do NOT add the label autonomously.
```

with:

```markdown
### 3. (Removed in Phase E — no readiness gate)

There is no label/status gate. Explicitly invoking `/from-issue <KEY>` is the intent signal; the Step 4 "no ACs worth automating → abort" backstop fails safe if pointed at a non-spec ticket.
```

- [ ] **Step 6: Retarget the Step 4 intro paragraph**

Replace:

```markdown
The issue body should follow the GitHub Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml`. Extract:
```

with:

```markdown
The ticket's **summary + description** should follow [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md) (Feature + one AC per line; GWT acceptable). Extract from the description (and summary):
```

- [ ] **Step 7: Format, consistency check, commit**

Run: `npx prettier --check .claude/skills/from-issue/references/workflow.md` (passes).
Consistency: confirm Steps 1–2 read Jira via MCP, Step 3 is marked removed, no remaining `gh issue view` / `labels[].name` references in Steps 1–4. Run `grep -n "gh issue view\|labels\[\].name\|to-be-automated" .claude/skills/from-issue/references/workflow.md` — expect no matches in Steps 1–4 (a mention inside Step 4's skip-examples is fine).

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(e): workflow fetch side — Jira key + MCP fetch, drop label gate" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: workflow.md — write side (Steps 11–13)

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`

- [ ] **Step 1: Update Step 11 dry-run + branch + commit to use the Jira key**

Replace:

```markdown
**Dry-run check:** If `dry-run` was passed, SKIP this step and Steps 12–13. Report the local file path and verification status only.
```

with:

```markdown
**Dry-run check:** If `dry-run` was passed, SKIP this step and Step 12. Report the local file path and verification status only.
```

Replace:

````markdown
```bash
git checkout -b from-issue/<num>-<feature>
```

The branch is named `from-issue/<num>-<feature>` (e.g., `from-issue/7-login`). The `<num>` keeps branches unique across issues that target the same feature.

If the branch already exists, abort with: _"Branch `from-issue/<num>-<feature>` exists — delete it and re-run."_ No PR.
````

with:

````markdown
```bash
git checkout -b from-issue/<KEY>-<feature>
```

The branch is named `from-issue/<KEY>-<feature>` (e.g., `from-issue/SW-123-login`). The Jira key keeps branches unique and — critically — is what the **GitHub-for-Jira app** matches to auto-link this PR onto ticket `<KEY>`.

If the branch already exists, abort with: _"Branch `from-issue/<KEY>-<feature>` exists — delete it and re-run."_ No PR.
````

Replace the commit line:

```bash
git commit -m "feat: add generated tests from #<num>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin from-issue/<num>-<feature>
```

with:

```bash
git commit -m "feat: add generated tests from <KEY>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin from-issue/<KEY>-<feature>
```

- [ ] **Step 2: Update Step 12 PR title/body to carry the Jira key**

Replace:

````markdown
```bash
# Title: "feat: tests from #<num> — <issue-title>"; truncate the title portion to ≤ 60 chars (break on a word boundary if possible).
gh pr create --title "feat: tests from #<num> — <truncated-title>" --body-file .pr-body.md
```
````

with:

````markdown
```bash
# Title: "feat: tests from <KEY> — <summary>"; truncate the summary so the title stays ≤ ~60 chars after the key.
gh pr create --title "feat: tests from <KEY> — <truncated-summary>" --body-file .pr-body.md
```

The PR body MUST reference the Jira key `<KEY>` (the GitHub-for-Jira app matches the key in the branch + title + body to link the PR onto the ticket).
````

- [ ] **Step 3: Rework Step 13 — drop the Jira comment-back, keep the report**

Replace:

````markdown
### 13. Comment on source issue + report to user

```bash
gh issue comment <num> --body "🤖 /from-issue opened <pr-url> with generated tests for review."
```

Then report to the user:
````

with:

```markdown
### 13. Report to user

No Jira write-back is performed: the **GitHub-for-Jira app** auto-links the PR to ticket `<KEY>` from the key in the branch + PR title/body. _(If the link doesn't appear on the ticket, the app isn't connected to this repo's org — post a comment-back via the Atlassian MCP as a fallback.)_

Report to the user:
```

- [ ] **Step 4: Format, consistency check, commit**

Run: `npx prettier --check .claude/skills/from-issue/references/workflow.md`.
Consistency: `grep -n "<num>" .claude/skills/from-issue/references/workflow.md` — expect no matches in Steps 11–13 (all replaced with `<KEY>`). Confirm `gh issue comment` is gone.

```bash
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(e): workflow write side — Jira key in branch/PR, app auto-link, drop comment-back" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: test-template.md — provenance keyed by Jira key

**Files:** Modify `.claude/skills/from-issue/references/test-template.md`

- [ ] **Step 1: Update the Template block header line**

Replace:

```ts
// Generated by /from-issue on YYYY-MM-DD from GitHub Issue #N.
// Source: <issue-url>
```

with:

```ts
// Generated by /from-issue on YYYY-MM-DD from Jira <KEY>.
// Source: <jira-issue-url>
```

- [ ] **Step 2: Update the "Comment block at top" rule**

In the Rules section, the header-block bullet currently shows `from GitHub Issue #N` with `N`, `<issue-url>`, `<issue-title>` substitutions and an `Augmented by: #25 (...)` example. Replace those tokens:

- `from GitHub Issue #N.` → `from Jira <KEY>.`
- `<issue-url>` → `<jira-issue-url>`, `<issue-title>` → `<summary>`
- the `// Augmented by: #25 (2026-05-26), #31 (2026-06-02)` example → `// Augmented by: SW-456 (2026-05-26), SW-789 (2026-06-02)`
- the contributor-set sentence "origin `#N` on line 1 ∪ every `#<num>`" → "origin `<KEY>` on line 1 ∪ every key on the `Augmented by:` line"

Read the current bullet first to match exactly, then apply these substitutions; change nothing else.

- [ ] **Step 3: Update the worked Example header**

In the `## Example` block, replace its header lines the same way:

```ts
// Generated by /from-issue on 2026-05-18 from GitHub Issue #42.
// Source: https://github.com/your-org/playwright-ia-framework/issues/42
// Title: Login coverage for standard and locked-out users
```

with:

```ts
// Generated by /from-issue on 2026-05-18 from Jira SW-42.
// Source: https://your-site.atlassian.net/browse/SW-42
// Title: Login coverage for standard and locked-out users
```

- [ ] **Step 4: Format, consistency check, commit**

Run: `npx prettier --check .claude/skills/from-issue/references/test-template.md`.
Consistency: `grep -n "GitHub Issue #\|/issues/" .claude/skills/from-issue/references/test-template.md` — expect no matches.

```bash
git add .claude/skills/from-issue/references/test-template.md
git commit -m "feat(e): test-template provenance header keyed by Jira key" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: SKILL.md — intro + usage → Jira

**Files:** Modify `.claude/skills/from-issue/SKILL.md`

- [ ] **Step 1: Reframe the description + intro**

Replace the frontmatter `description:` value:

```yaml
description: Generate Playwright tests from a `to-be-automated`-labeled GitHub Issue, composing /scaffold-page-object when a target Page Object doesn't yet exist, and open a PR with the generated tests for review.
```

with:

```yaml
description: Generate Playwright tests from a Jira ticket (read via the Atlassian MCP), composing /scaffold-page-object when a target Page Object doesn't yet exist, and open a GitHub PR with the generated tests for review.
```

Replace the intro paragraph:

```markdown
Given a GitHub Issue number, this skill reads the issue (which must carry the `to-be-automated` label), analyzes its Acceptance Criteria, generates a set of Playwright tests, runs them locally, and opens a PR with a structured description. The PR is the review gate.
```

with:

```markdown
Given a Jira issue key (e.g. `SW-123`), this skill reads the ticket via the Atlassian MCP, analyzes its Acceptance Criteria, generates a set of Playwright tests, runs them locally, and opens a GitHub PR with a structured description. The PR is the review gate, and the GitHub-for-Jira app auto-links it onto the ticket. See [ADR-0011](../../../docs/adr/0011-jira-ticket-source.md).
```

- [ ] **Step 2: Update the "How to use it" examples**

Replace the GitHub-issue invocation example block (`> Use the from-issue skill on issue #42.` and the dry-run example) so both use a Jira key — e.g. `> Use the from-issue skill on SW-123.` and `> Use the from-issue skill on SW-123 with dry-run.` Read the current block first; keep the surrounding augment/`--new-file` note (added in D.2) intact, updating any `#42`/`issue` wording to `SW-123`/`ticket`.

- [ ] **Step 3: allowed-tools — note the deferred MCP binding**

Do NOT guess an MCP tool id. Leave `allowed-tools` as-is for now and add this line to the `## See also` section (or just above `## Workflow`):

```markdown
> **Setup note:** the Atlassian MCP must be connected (OAuth) for Step 2's ticket read. Once connected, add its get-issue tool id to this skill's `allowed-tools` frontmatter so reads don't prompt each run.
```

- [ ] **Step 4: Format + commit**

Run: `npx prettier --check .claude/skills/from-issue/SKILL.md`.

```bash
git add .claude/skills/from-issue/SKILL.md
git commit -m "docs(e): SKILL.md intro/usage → Jira key + MCP read; note allowed-tools binding" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: docs/jira-tickets.md (new) + retire GitHub issue template

**Files:**

- Create: `docs/jira-tickets.md`
- Delete: `.github/ISSUE_TEMPLATE/to-be-automated.yml`

- [ ] **Step 1: Create the authoring guide**

````markdown
# Authoring Jira tickets for `/from-issue`

`/from-issue SW-123` reads a Jira ticket (project `SW`) via the Atlassian MCP and turns its Acceptance Criteria into Playwright tests. Write the ticket so the skill can parse it.

## What to put where

- **Summary** — short and behavior-focused (becomes context, and the PR title).
- **Description** — the real input. Include:
  - A **Feature** line (snake_case slug): `Feature: login`. Drives `tests/<feature>/`.
  - **Acceptance Criteria** — one per line (a list or Given/When/Then scenarios both work). One behavior per AC.

## Example description

```
Feature: login

Scenario 1: Successful login
Given a valid standard_user
When they submit correct credentials
Then they land on the inventory page

Scenario 2: Missing password
Given only a username is entered
When they submit
Then "Epic sadface: Password is required" is shown
```

## Tips (same judgment the skill applies)

- Each AC = ONE behavior (split "X and Y").
- State the user role (`standard_user`, `locked_out_user`, …).
- Give each AC a clear pass/fail criterion (no "looks good").
- Mention WHERE in the app it happens ("on the inventory page", "in the cart") so the skill can infer which Page Objects are needed.
- Consider Negative + Edge cases — the skill buckets tests into Positive / Negative / Edge.

## What happens next

The skill generates tests on branch `from-issue/SW-123-<feature>`, opens a GitHub PR, and the GitHub-for-Jira app links the PR onto the ticket. The PR is the review gate. Re-running a ticket that already contributed to a spec refuses (see [ADR-0010](adr/0010-from-issue-augment-mode.md)); the skill augments the existing spec when a _new_ ticket extends a feature.
````

- [ ] **Step 2: Delete the GitHub issue-form template**

```bash
git rm .github/ISSUE_TEMPLATE/to-be-automated.yml
```

- [ ] **Step 3: Format + commit**

Run: `npx prettier --check docs/jira-tickets.md`.

```bash
git add docs/jira-tickets.md
git commit -m "docs(e): add Jira ticket-authoring guide; retire GitHub issue template" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: docs/from-issue.md + CLAUDE.md reframe

**Files:** Modify `docs/from-issue.md` and `CLAUDE.md`

- [ ] **Step 1: docs/from-issue.md — reframe to Jira**

Read the file. Apply these substitutions throughout (match exact text per occurrence):

- "takes: A GitHub Issue number (e.g., `42`) that carries the `to-be-automated` label" → "takes: A Jira issue key (e.g., `SW-123`), read via the Atlassian MCP".
- Any `/from-issue` invocation example using `#N` / "issue #42" → `SW-123` / "ticket SW-123".
- The "How it's wired" + "Verifying the setup" sections that reference the GitHub Issue Template / `gh` issue fetch / the `to-be-automated` label → describe instead: read via Atlassian MCP, ticket authored per [`docs/jira-tickets.md`](jira-tickets.md), PR auto-linked by the GitHub-for-Jira app. Remove the "Step 2 — Issue template usable" GitHub-form check; replace with "ticket readable via the MCP".
- "comment on the source issue with the PR link" → "the GitHub-for-Jira app links the PR onto the ticket (no comment posted)".

Keep the bucket/smoke/augment sections intact (those are source-agnostic). Add a one-line pointer to [ADR-0011](adr/0011-jira-ticket-source.md) near the top.

- [ ] **Step 2: CLAUDE.md — update the ticket-source + GitHub-operations rules**

Read `CLAUDE.md`. Make these targeted edits:

- In the `/from-issue` bullet under "Custom skills", change "from a `to-be-automated`-labeled GitHub Issue" → "from a Jira ticket (read via the Atlassian MCP)".
- In the "GitHub operations" section, add a sentence: "Ticket reads come from **Jira via the Atlassian MCP** (see [ADR-0011](docs/adr/0011-jira-ticket-source.md)); `gh` is for PRs/releases/workflow runs, not issue reads." Do not remove the existing `gh` PR guidance.

Keep CLAUDE.md under its 150-line limit (these are small edits; verify with a line count after).

- [ ] **Step 3: Format, line-count, commit**

Run: `npx prettier --check docs/from-issue.md CLAUDE.md`. Run `wc -l CLAUDE.md` — confirm ≤ 150 (per CLAUDE.md's own rule); if over, tighten the edits.

```bash
git add docs/from-issue.md CLAUDE.md
git commit -m "docs(e): from-issue guide + CLAUDE.md reframed to Jira ticket source" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Behavioral verification (gated on MCP + SW-1, user-driven)

Runs only after the user (a) connects the Atlassian MCP and (b) creates ticket `SW-1`. **Before this task, bind the deferred MCP tool id:** confirm the connected MCP's get-issue tool name and add it to `SKILL.md`'s `allowed-tools` (small follow-up commit), and adjust Step 2's generic reference if the tool name differs from the examples.

- [ ] **Step 1: Prep the blank slate** — on a fresh branch off `main` (after Tasks 1–7 merge), tear down saucedemo (`git rm -r data src/components src/pages tests`), stub `src/fixtures/test.ts` to an empty registry and `playwright.config.ts` to a single `no-auth` project, commit, confirm `npx playwright test --list` → 0 tests. (Or reuse `e2e-from-issues`.)
- [ ] **Step 2: Origin run** — `/from-issue SW-1`. Expected: MCP fetch returns the ticket; Feature + ACs parse; `tests/login/login.spec.ts` generated with `test.step` in the Page Object; branch `from-issue/SW-1-login`; PR title `feat: tests from SW-1 — <summary>`; header `// Generated by /from-issue on <date> from Jira SW-1.`
- [ ] **Step 3: Confirm the auto-link** — open ticket `SW-1` in Jira; verify the PR appears in its Development panel. If not, the GitHub-for-Jira app isn't wired to this repo's org → add the MCP comment-back fallback (new finding `E-OBS-001`).
- [ ] **Step 4: Augment run** — create a second `SW` ticket extending login; `/from-issue SW-2` → confirm it augments `login.spec.ts` and the header gains `// Augmented by: SW-2 (<date>)`.
- [ ] **Step 5: Idempotency** — re-run `/from-issue SW-1` → REFUSE (contributor set).
- [ ] **Step 6: Record findings** as `E-OBS-NNN` and report pass/fail to the user.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (Jira replaces GitHub) → Tasks 2,3,5,6,7. Decision 2 (keep /from-issue) → all (no rename). Decision 3 (no gate) → Task 2 Step 5. Decision 4 (MCP read) → Tasks 1,2,5,8. Decision 5 (no write-back, app link) → Tasks 1,3,8. Decision 6 (provenance keyed by key) → Task 4. ADR-0011 + scope ADR-0007 → Task 1. Docs/cleanup (jira-tickets, retire template, CLAUDE.md, from-issue.md) → Tasks 6,7. Verification → Task 8. No gaps.

**Placeholder scan:** No "TBD/handle edge cases". The only deferred item — the exact MCP tool id — is explicitly documented as a connection-time binding (Task 5 Step 3, Task 8 preamble), with concrete instructions for when/how to bind it. Every doc edit has exact old/new text + a `prettier --check` gate.

**Consistency:** `<KEY>` replaces `<num>` uniformly across Tasks 2–4 (branch `from-issue/<KEY>-<feature>`, header `from Jira <KEY>`, commit `from <KEY>`). The relative ADR link depth `../../../../docs/adr/...` from `references/` matches the phase-d1.x/D.2 convention (4 `..`); from `SKILL.md` it's `../../../docs/adr/...` (3 `..`); from `docs/*.md` it's `adr/...`. Step 13 keeps the "report to user" list (only the comment-back is removed).
