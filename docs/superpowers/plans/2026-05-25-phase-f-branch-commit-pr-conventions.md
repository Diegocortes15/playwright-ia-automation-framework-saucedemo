# Phase F — Branch / Commit / PR Conventions + Requirement-Normalization Robustness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/from-issue` emit senior-grade branches/commits/PRs (key-first branch, Conventional Commits, conventional PR title, PR base = the branch you started from) and comprehend any ticket format/quality (narrative / GWT / bullets / prose / mixed), surfacing every inference as PR assumptions.

**Architecture:** Pure skill-documentation edits — the skill is an LLM workflow defined by `.claude/skills/from-issue/` references. Change behavior by editing those Markdown contracts + a new ADR + the learning guide.

**Tech Stack:** Markdown skill references; Prettier (format gate); Playwright (the post-merge behavioral runs).

**Spec:** [`docs/superpowers/specs/2026-05-25-phase-f-branch-commit-pr-conventions-design.md`](../specs/2026-05-25-phase-f-branch-commit-pr-conventions-design.md)

**Branch:** `phase-f-conventions` (spec already committed).

**TDD note:** Documentation edits — no per-task unit tests. Each task's gate is `npx prettier --check <file>` + a consistency read against the spec. **Task 7 is the behavioral test** — post-merge runs on `e2e-jira-from-issues` (well-structured, vague, and narrative tickets), user-driven.

---

## File Structure

| File                                                              | Responsibility                                                                                    | Task |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---- |
| `docs/adr/0012-from-issue-conventions.md` (new)                   | Record the branch/commit/PR + normalization conventions                                           | 1    |
| `.claude/skills/from-issue/references/workflow.md` (Step 11)      | Key-first branch + capture base branch + Conventional Commit                                      | 2    |
| `.claude/skills/from-issue/references/workflow.md` (Step 12)      | Conventional PR title + `--base <starting-branch>`                                                | 3    |
| `.claude/skills/from-issue/references/workflow.md` (Step 4)       | Format/quality-agnostic normalization + `requirement_form`/`requirement_restated`/`assumptions[]` | 4    |
| `.claude/skills/from-issue/references/pr-description-template.md` | Adaptive "What I understood" (Summary, Requirement-as-written, Assumptions)                       | 5    |
| `docs/from-issue.md` + `.claude/skills/from-issue/SKILL.md`       | Update branch/commit/PR examples + parsing-robustness note                                        | 6    |
| (experiment branch)                                               | Behavioral verification                                                                           | 7    |

Tasks 2–4 all edit `workflow.md` (disjoint sections: Step 11 / Step 12 / Step 4); run sequentially.

---

## Task 1: ADR-0012 — record the conventions

**Files:** Create `docs/adr/0012-from-issue-conventions.md`

- [ ] **Step 1: Create the ADR** (Nygard format per `docs/adr/0000-template.md`, < 80 lines)

```markdown
# 0012 — /from-issue branch / commit / PR conventions + format-agnostic ticket normalization

**Date:** 2026-05-25
**Status:** Accepted

## Context

The first real Jira run (SW-1 → PR #14) used minimal formats — branch `from-issue/SW-1-login`, commit `feat: add generated tests from SW-1` — and the PR's "What I understood" asserted SW-1-specific structure ("captures the requirement as GWT scenarios, not a narrative"), an assumption that won't generalize across BA writing styles. We want senior-grade outputs and ticket comprehension that adapts to any requirement form/quality.

## Decision

`/from-issue` adopts these conventions:

- **Branch:** `<KEY>-<feature>` — exact uppercase Jira key first, hyphen, feature slug (e.g. `SW-1-login`). No `from-issue/` prefix.
- **Commit:** Conventional Commits — `feat(<feature>): automate <KEY> <feature> scenarios`, a body explaining what+why, a `Refs: <KEY>` trailer, and the `Co-Authored-By` trailer. Built via repeated `-m` flags (never shell here-strings, per phase-d1.5).
- **PR title:** `feat(<feature>): automate <KEY> <feature> scenarios` (mirrors the commit).
- **PR base:** the branch HEAD was on when the skill was invoked (not hardcoded `main`) — the integration branch during a build-up, `main` in normal use.
- **Ticket normalization:** format- AND quality-agnostic — narrative / GWT / bullet ACs / prose / mixed all normalize into AC records; a user-story narrative is extracted when present; vague tickets get a best-effort normalization with every inference surfaced as PR **Assumptions & open questions** (abort only when nothing testable can be extracted). The PR's "What I understood" represents the requirement in whatever form it arrived.

## Consequences

- Branches/commits/PRs read like a senior engineer's; the Jira key threads through branch + commit trailer + PR title/body.
- Reviewers see exactly what the skill inferred from a thin ticket and can correct it in the PR.
- The PR base rule makes the skill correct both for normal use (PR → main) and the e2e build-up (PR → integration branch).
- `feat` is used as the type for test-coverage delivery (consistent with the approved PR-title examples); switch to `test` later if preferred.

## Alternatives considered

- **`feature/<KEY>-<desc>` (type-prefixed branch).** Rejected: doesn't "start with the key" per the requirement; key-first `SW-1-login` chosen.
- **Lowercased key (`sw-1-login`).** Rejected: the uppercase key matches the ticket verbatim; the app links case-insensitively either way.
- **Abort / interactively clarify vague tickets.** Rejected: breaks the autonomous PR-as-review-gate model; best-effort + surfaced assumptions keeps it unattended while transparent.

## Related

- [ADR-0011](0011-jira-ticket-source.md) — Jira ticket source; [ADR-0010](0010-from-issue-augment-mode.md) — augment mode; phase-d1.5 — repeated-`-m` commit rule.
```

- [ ] **Step 2: Format + commit**

```bash
npx prettier --check docs/adr/0012-from-issue-conventions.md
git add docs/adr/0012-from-issue-conventions.md
git commit -m "docs(f): ADR-0012 — /from-issue branch/commit/PR + normalization conventions" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: workflow.md Step 11 — key-first branch + base capture + Conventional Commit

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`

- [ ] **Step 1: Replace the branch block**

Find:

````markdown
```bash
git checkout -b from-issue/<KEY>-<feature>
```

The branch is named `from-issue/<KEY>-<feature>` (e.g., `from-issue/SW-123-login`). The Jira key keeps branches unique and — critically — is what the **GitHub-for-Jira app** matches to auto-link this PR onto ticket `<KEY>`.

If the branch already exists, abort with: _"Branch `from-issue/<KEY>-<feature>` exists — delete it and re-run."_ No PR.
````

Replace with:

````markdown
First record the branch you're on — the PR will target it (Step 12):

```bash
git branch --show-current   # capture as <base-branch> (e.g. e2e-jira-from-issues, or main)
git checkout -b <KEY>-<feature>
```

The branch is named **`<KEY>-<feature>`** — the exact uppercase Jira key first, then the feature slug (e.g., `SW-1-login`). Key-first per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md); the GitHub-for-Jira app matches the key (case-insensitively) to auto-link the PR onto ticket `<KEY>`.

If the branch already exists, abort with: _"Branch `<KEY>-<feature>` exists — delete it and re-run."_ No PR.
````

- [ ] **Step 2: Replace the commit + push block**

Find:

````markdown
git commit -m "feat: add generated tests from <KEY>" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin from-issue/<KEY>-<feature>

```

```
````

Replace with:

````markdown
git commit \
 -m "feat(<feature>): automate <KEY> <feature> scenarios" \
 -m "<body: 1–3 sentences — coverage added (N tests across buckets), the scenarios/ACs covered, and any scaffold/side-effects (new Page Object, fixture registration, externalized data, augment)>" \
 -m "Refs: <KEY>" \
 -m "Co-Authored-By: Claude <noreply@anthropic.com>"
git push -u origin <KEY>-<feature>

```

**Conventional Commit (per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md)):** subject `feat(<feature>): automate <KEY> <feature> scenarios` — imperative, ≤ ~72 chars; `<feature>` is the scope. Body explains what + why. `Refs: <KEY>` trailer ties the commit to the ticket. Each block is a **separate `-m`** — never a shell here-string (wrong-shell heredocs leak stray characters into the subject; see phase-d1.5).
```
````

- [ ] **Step 3: Update the dry-run discard hint** — find `git branch -D from-issue/<KEY>-<feature>` references in Step 11 (if present) and any other `from-issue/<KEY>` branch mentions in Step 11 and change to `<KEY>-<feature>`. Run `grep -n "from-issue/<KEY>" .claude/skills/from-issue/references/workflow.md` and fix each occurrence in Step 11's region.

- [ ] **Step 4: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/workflow.md
grep -n "from-issue/<KEY>" .claude/skills/from-issue/references/workflow.md   # expect: none in Steps 11–13
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(f): workflow Step 11 — key-first branch + Conventional Commit + base capture" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: workflow.md Step 12 — conventional PR title + base = starting branch

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`

- [ ] **Step 1: Replace the `gh pr create` block**

Find:

````markdown
```bash
# Title: "feat: tests from <KEY> — <summary>"; truncate the summary so the title stays ≤ ~60 chars after the key.
gh pr create --title "feat: tests from <KEY> — <truncated-summary>" --body-file .pr-body.md
```

The PR body MUST reference the Jira key `<KEY>` (the GitHub-for-Jira app matches the key in the branch + title + body to link the PR onto the ticket).
````

Replace with:

````markdown
```bash
# If <base-branch> (captured in Step 11) isn't on the remote yet, push it first so the PR can target it:
#   git push -u origin <base-branch>
gh pr create --base <base-branch> \
  --title "feat(<feature>): automate <KEY> <feature> scenarios" \
  --body-file .pr-body.md
```

- **`--base <base-branch>`** = the branch recorded in Step 11 (the one you branched from) — the integration branch during a build-up, `main` in normal use. Never hardcode `main`.
- **Title** is the Conventional-Commit form (matches the commit subject), per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md). The PR body MUST also reference `<KEY>` so the GitHub-for-Jira app links it.
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/workflow.md
grep -n "feat: tests from" .claude/skills/from-issue/references/workflow.md   # expect: none
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(f): workflow Step 12 — conventional PR title + base = starting branch" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: workflow.md Step 4 — format/quality-agnostic normalization

**Files:** Modify `.claude/skills/from-issue/references/workflow.md`

- [ ] **Step 1: Replace the Step 4 intro + extract list**

Find:

```markdown
The ticket's **summary + description** should follow [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md) (Feature + one AC per line; GWT acceptable). Extract from the description (and summary):

- **Feature** (single-line) — drives `tests/<feature>/`
- **User Story** (optional) — context only
- **Acceptance Criteria** (multi-line, one AC per line)
- **Notes** (optional) — context only

(Note: a `Page Name` field used to exist in the template but was removed in commit `fcc39e9`. Page Object names are now inferred from AC text — see "Page inference from AC text" subsection below.)
```

Replace with:

```markdown
Tickets are authored many ways and at any quality (trainee → senior BA). **Normalize whatever the ticket contains — format- AND quality-agnostic** (per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md)): a formal "As a / I want / so that" narrative, Given/When/Then scenarios, a bullet/numbered AC list, plain prose, structured fields, or a partial/mixed blob all reduce to the same internal AC records. Extract from the summary + description:

- **Feature** (single-line slug) — drives `tests/<feature>/`. If not stated, infer it from the summary/subject (and record the inference as an assumption, below).
- **Acceptance Criteria** — one behavior each, derived from whatever form the ticket used.
- **Notes** (optional) — context only.

While normalizing, also capture (used by the PR's "What I understood", Step 7 / `pr-description-template.md`):

- **`requirement_form`** — one of `narrative` / `gwt` / `bullets` / `prose` / `structured` / `mixed`.
- **`requirement_restated`** — a faithful restatement of what the ticket actually says (the narrative if one is present; a scenario summary for GWT; a paraphrase for prose).
- **`assumptions[]`** — every inference or ambiguity resolution **not explicit** in the ticket (e.g. "user unspecified → defaulted to `standard_user`"; "'works correctly' interpreted as lands on inventory"). Empty when the ticket was fully explicit.

(Page Object names are inferred from AC text — see "Page inference from AC text" below.)
```

- [ ] **Step 2: Replace the free-form abort + add the vague-ticket rule**

Find:

```markdown
**If the ticket description is free-form (no clear structure)**, attempt best-effort parse. If no ACs can be extracted, abort with:

> _"Couldn't extract ACs from ticket `<KEY>`. Ask the reporter to follow [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md)."_
```

Replace with:

```markdown
**Vague / low-quality tickets** (per [ADR-0012](../../../../docs/adr/0012-from-issue-conventions.md)): do NOT abort and do NOT pause to ask. Produce a **best-effort** normalization, record every inference in `assumptions[]`, and let the PR's **⚠️ Assumptions & open questions** block surface them for the reviewer (the PR is the review gate). Abort **only** when nothing testable can be extracted at all:

> _"Couldn't extract any testable behavior from ticket `<KEY>`. Ask the reporter to follow [`docs/jira-tickets.md`](../../../../docs/jira-tickets.md)."_
```

- [ ] **Step 3: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/workflow.md
grep -n "requirement_form\|requirement_restated\|assumptions\[\]" .claude/skills/from-issue/references/workflow.md   # expect: present
git add .claude/skills/from-issue/references/workflow.md
git commit -m "feat(f): workflow Step 4 — format/quality-agnostic normalization + assumptions capture" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: pr-description-template.md — adaptive "What I understood"

**Files:** Modify `.claude/skills/from-issue/references/pr-description-template.md`

- [ ] **Step 1: Replace the "What I understood" Template block**

Find (the current Template top, post phase-e.1):

```markdown
## What I understood from the ticket

**Source ticket:** [<KEY>](jira-issue-url) — <issue-type>: "<summary>"
**Feature:** <feature>
**Page Name:** <page-name>
**User Story:** <narrative, ONLY if the ticket has an "As a / I want / so that" statement — omit this line entirely when absent; never write "(none provided)">
```

Replace with:

```markdown
## What I understood from the ticket

> Automated Playwright coverage for `<KEY>` (`<feature>`): <N> tests, all passing.

**Source ticket:** [<KEY>](jira-issue-url) — <issue-type>: "<summary>"
**Feature:** <feature>
**Requirement (as written):** <restatement shaped by `requirement_form` — restate the narrative if present; summarize the GWT scenarios; paraphrase prose into intent>
```

- [ ] **Step 2: Add the conditional Assumptions block** — immediately after the `**Acceptance Criteria (normalized):**` list in the Template (find the AC list block and add this after it):

```markdown
**⚠️ Assumptions & open questions:** <render this block ONLY when `assumptions[]` is non-empty; omit entirely otherwise>

- <each inference/ambiguity, one per bullet, inviting reviewer confirmation — e.g. "Ticket didn't name a user → assumed `standard_user`. Reviewer: confirm.">
```

- [ ] **Step 3: Update the Rules** — replace the phase-e.1 "What I understood block" rule:

Find:

```markdown
- **"What I understood" block** — the `Source ticket:` line is **mandatory**: `[<KEY>](<jira-url>) — <issue-type>: "<summary>"` (names the source Story/Task and links the PR to the ticket). The `User Story:` line is **optional**: include it only when the ticket carries an explicit "As a / I want / so that" narrative; **omit the line entirely** when the requirement is expressed as ACs/scenarios — never render "(none provided)" (a Story-type ticket whose body is GWT scenarios still _is_ the user story; the `Source ticket:` line already conveys that).
```

Replace with:

```markdown
- **"What I understood" block** (adaptive, per [ADR-0012](../../../docs/adr/0012-from-issue-conventions.md)):
  - **Summary** lead (`> `) — one TL;DR line: `Automated Playwright coverage for <KEY> (<feature>): N tests, all passing.`
  - **`Source ticket:`** — mandatory: `[<KEY>](<jira-url>) — <issue-type>: "<summary>"`.
  - **`Feature:`** — the snake_case feature.
  - **`Requirement (as written):`** — restate the requirement in whatever form the ticket used (`requirement_restated` from Step 4): the narrative if present, a scenario summary for GWT, a paraphrase for prose. Never assert a fixed structure.
  - **`⚠️ Assumptions & open questions:`** — render ONLY when Step 4's `assumptions[]` is non-empty; one bullet per inference/ambiguity, each inviting reviewer confirmation. Omit the whole block when the ticket was fully explicit.
  - There is no `Page Name` or `User Story` line — the Page Object is covered by the Notes-for-reviewer scaffold/collision note, and the requirement is conveyed by `Requirement (as written)`.
```

- [ ] **Step 4: Update the Example** — find the example "What I understood" block (the 2-test login example) and bring it to the new shape: add the Summary lead, keep Source ticket + Feature, replace the `User Story`/`Page Name` lines with a `Requirement (as written):` line, and (since the login example is fully explicit) omit the Assumptions block with an HTML comment noting why.

Example target:

```markdown
## What I understood from the ticket

> Automated Playwright coverage for `SW-1` (`login`): 9 tests, all passing.

**Source ticket:** [SW-1](https://your-site.atlassian.net/browse/SW-1) — Story: "Login in Saucedemo App"
**Feature:** login
**Requirement (as written):** four Given/When/Then scenarios — successful login for the valid users, empty/missing-field validation, and invalid-credential rejection.

<!-- Assumptions block omitted: the ticket was fully explicit (no inferences). -->
```

- [ ] **Step 5: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/from-issue/references/pr-description-template.md
grep -n "User Story\|Page Name\|none provided" .claude/skills/from-issue/references/pr-description-template.md   # expect: none
git add .claude/skills/from-issue/references/pr-description-template.md
git commit -m "feat(f): PR template — adaptive What-I-understood (Summary, Requirement-as-written, Assumptions)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: docs/from-issue.md + SKILL.md — examples + parsing-robustness note

**Files:** Modify `docs/from-issue.md` and `.claude/skills/from-issue/SKILL.md`

- [ ] **Step 1: Update branch/commit/PR examples in `docs/from-issue.md`** — read the file and update every concrete example to the new shapes:
  - Branch: `from-issue/<KEY>-<feature>` / `from-issue/SW-1-login` → `<KEY>-<feature>` / `SW-1-login` (and the dry-run discard line `git branch -D from-issue/SW-1-<feature>` → `git branch -D SW-1-<feature>`).
  - Any "What I understood" / provenance example wording → mention the adaptive block (Requirement-as-written + Assumptions).
  - Add one sentence to the "What is /from-issue" or "How it's wired" section: _"The skill normalizes any ticket format/quality (narrative, GWT, bullet ACs, prose, mixed); for thin tickets it generates best-effort and surfaces its inferences as an **Assumptions & open questions** block in the PR for review (per [ADR-0012](adr/0012-from-issue-conventions.md))."_

- [ ] **Step 2: Update `SKILL.md`** — read it; update any branch example (`from-issue/...`) to `SW-1-login`; if the intro mentions analysis, add a short clause that the skill reads any ticket format/quality.

- [ ] **Step 3: Format, consistency, commit**

```bash
npx prettier --check docs/from-issue.md .claude/skills/from-issue/SKILL.md
grep -rn "from-issue/<KEY>\|from-issue/SW-1\|feat: tests from" docs/from-issue.md .claude/skills/from-issue/SKILL.md   # expect: none
git add docs/from-issue.md .claude/skills/from-issue/SKILL.md
git commit -m "docs(f): update from-issue guide + SKILL examples to new branch/commit/PR shapes" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Behavioral verification (post-merge, user-driven on `e2e-jira-from-issues`)

Runs after Tasks 1–6 merge to `main` and `e2e-jira-from-issues` is rebased/updated to include them. The user drives each `/from-issue` invocation.

- [ ] **Step 1: Well-structured ticket** — create/run an `SW` ticket with clean Feature + ACs. Expect: branch `SW-<n>-<feature>`; commit `feat(<feature>): automate SW-<n> <feature> scenarios` with a body + `Refs:` trailer; PR title in the conventional form; PR **base = `e2e-jira-from-issues`**; Summary lead present; **no** Assumptions block (nothing inferred).
- [ ] **Step 2: Deliberately vague ticket** — create/run an `SW` ticket with loose prose (no explicit user, fuzzy "works" wording). Expect: best-effort tests generated (no abort) + a populated **⚠️ Assumptions & open questions** block listing the inferences.
- [ ] **Step 3: Narrative-style ticket** — create/run an `SW` ticket written as "As a … I want … so that …". Expect: **Requirement (as written)** restates the narrative.
- [ ] **Step 4: Record findings** as `F-OBS-NNN` and report pass/fail of each expectation.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (branch) → Task 2. Decision 2 (commit) → Task 2. Decision 3 (PR title) → Task 3. Decision 4 (PR base) → Tasks 2 (capture) + 3 (use). Decision 5 (format/quality-agnostic normalization + requirement_form/restated/assumptions) → Task 4. Decision 6 (vague tickets best-effort + flag) → Task 4. Decision 7 (adaptive What-I-understood) → Task 5. Decision 8 (ADR-0012) → Task 1. Decision 9 (docs) → Task 6. Verification approach → Task 7. No gaps.

**Placeholder scan:** No "TBD/handle edge cases". Every edit has exact find/replace text + a `prettier --check` and a `grep` consistency gate. The `<body: …>` and `<restatement …>` angle-bracket placeholders are intentional skill-template tokens (the skill fills them per run), not plan gaps.

**Consistency:** `<base-branch>` captured in Task 2 Step 1 and consumed in Task 3 Step 1 (same name). Branch shape `<KEY>-<feature>` and commit/PR subject `feat(<feature>): automate <KEY> <feature> scenarios` are identical across Tasks 2, 3, 5, 6, and ADR-0012. `requirement_form`/`requirement_restated`/`assumptions[]` defined in Task 4 and consumed in Task 5. The phase-e.1 `User Story:`/`Page Name:` lines are removed in Task 5 (Template + Rules + Example) — grep confirms none remain.
