# Phase F — Branch / Commit / PR Conventions + Requirement-Normalization Robustness — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-25

## Goal

Make `/from-issue` produce **senior-engineer-grade** branches, commits, and PRs, and make its ticket comprehension **robust to any requirement format or quality**. Two user requirements, "from now on":

1. Branches lead with the Jira key.
2. Commits and PRs follow professional conventions.

Plus a robustness requirement surfaced during design: the skill must analyze and translate **whatever a BA wrote** — formal user-story narrative, Given/When/Then scenarios, a bullet list, vague prose, partial/mixed structure, or a poorly-written trainee ticket — never assuming one shape.

## Context

The first real Jira run (SW-1 → PR #14) exposed two gaps: (a) the branch/commit/PR formats were minimal (`from-issue/SW-1-login`, `feat: add generated tests from SW-1`), and (b) the PR's "What I understood" asserted SW-1-specific structure ("captures the requirement as GWT scenarios, not a narrative") — an assumption that won't generalize across BA writing styles. Step 4 already does best-effort free-form/GWT parsing, so the comprehension foundation exists; this phase makes it explicitly format/quality-agnostic and makes the PR representation adaptive + transparent.

This is a **skill-documentation change** (no runtime code): edits to `workflow.md` (Steps 4, 11, 12), `pr-description-template.md`, `SKILL.md`/`docs/from-issue.md` examples, and a new **ADR-0012**.

## Decisions

1. **Branch naming — key-first, uppercase.** `<KEY>-<feature>` (exact Jira key, hyphen, feature slug) → `SW-1-login`. Drop the `from-issue/` prefix so the key leads. (The GitHub-for-Jira app matches the key case-insensitively; uppercase keeps it verbatim with the ticket. Augment/provenance keys off the file header, not the branch, so it's unaffected.)

2. **Commit message — Conventional Commits + scope + body + trailers**, built via repeated `-m` flags (NEVER shell here-strings, per phase-d1.5):

   ```
   feat(<feature>): automate <KEY> <feature> scenarios

   <1–3 sentences: what coverage was added + scenarios covered + any scaffold/side-effects>

   Refs: <KEY>
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

   - Type is **`feat`** (delivers a feature's test coverage; matches the approved PR-title examples). Easy to switch to `test` later if preferred.
   - Subject: imperative, ≤ ~72 chars.
   - Built as `git commit -m "<subject>" -m "<body>" -m "Refs: <KEY>" -m "Co-Authored-By: …"`.

3. **PR title — conventional, key inline.** `feat(<feature>): automate <KEY> <feature> scenarios` — mirrors the commit subject.

4. **PR base — the branch you branched from.** Capture the branch HEAD is on **when the skill is invoked**; `gh pr create --base <that-branch>`. So the PR targets wherever you started — `e2e-jira-from-issues` during the build-up, `main` in normal use. No hardcoded `main`, no extra flag. If that base branch isn't on the remote yet, push it first (`git push -u origin <base>`) before `gh pr create`.

5. **Requirement normalization (Step 4) — format- AND quality-agnostic.** The skill normalizes **any** ticket form into the AC records: a formal "As a / I want / so that" narrative, GWT scenarios, a bullet/numbered AC list, plain prose, structured fields, or partial/mixed. It extracts a user-story narrative **when one is present**, and for thin/ambiguous tickets it **infers reasonable ACs** rather than giving up. While normalizing it captures, per run:
   - `requirement_form` — narrative / gwt / prose / structured / mixed (drives the PR representation).
   - `requirement_restated` — a faithful restatement of what the ticket actually says.
   - `assumptions[]` — every inference or ambiguity resolution the skill made that is **not explicit** in the ticket (e.g. "user not specified → defaulted to standard_user"; "'works correctly' interpreted as lands on inventory").

6. **Vague / low-quality tickets — best-effort + flag, never silently guess.** Generate from a best-effort normalization and surface every inference in the PR's **Assumptions & open questions** block so the reviewer can correct it (the PR is the review gate). Abort **only** when nothing testable can be extracted (existing Step 4 backstop). Do not block on ticket hygiene; do not pause for interactive clarification (stays autonomous).

7. **Adaptive "What I understood" (PR).** Replace the rigid `Page Name` / `User Story` lines (and the phase-e.1 "omit User Story when absent" rule) with an adaptive block that reflects the actual ticket:
   - `> ` **Summary** lead line (TL;DR): _"Automated Playwright coverage for `<KEY>` (`<feature>`): N tests, all passing."_
   - **Source ticket:** `[<KEY>](<jira-url>) — <issue-type>: "<summary>"` (mandatory, from phase-e.1).
   - **Feature:** `<feature>`.
   - **Requirement (as written):** the restatement, shaped by `requirement_form` — restate the narrative if present; summarize the GWT scenarios; paraphrase prose into intent.
   - **Acceptance Criteria (normalized):** as today, with MERGE/SPLIT/SKIP annotations.
   - **⚠️ Assumptions & open questions:** rendered **only when `assumptions[]` is non-empty** — one bullet per inference/ambiguity, each inviting reviewer confirmation.

8. **ADR-0012** records the conventions: key-first uppercase branch; Conventional Commits (type+scope+body+`Refs`); conventional PR title; PR base = starting branch; adaptive/transparent requirement normalization.

9. **Docs** — update the branch/commit/PR examples in `docs/from-issue.md` and any in `SKILL.md` to the new shapes; note the format/quality-agnostic parsing + assumptions surfacing in the learning guide.

## Workflow changes

- **Step 4 — LLM normalization.** Add the format/quality-agnostic statement (Decision 5); capture `requirement_form`, `requirement_restated`, `assumptions[]`; keep the "abort only if nothing testable" backstop (Decision 6). The existing free-form/GWT subsection becomes one case of the general rule.
- **Step 11 — Branch/commit.** Branch `<KEY>-<feature>`. Capture the **starting branch** (current `git branch --show-current`) before `git checkout -b`. Commit via the repeated-`-m` Conventional-Commit form (Decision 2).
- **Step 12 — PR.** Title per Decision 3. `gh pr create --base <starting-branch> --body-file .pr-body.md` (push the base branch first if needed). Body rendered per the updated `pr-description-template.md`.

## PR description changes (`pr-description-template.md`)

Update the Template + Rules + Example for the adaptive "What I understood" block (Decision 7): Summary lead, Source ticket (kept), Feature, **Requirement (as written)**, normalized ACs, conditional **Assumptions & open questions**. Remove the phase-e.1 `User Story:` line (superseded by "Requirement (as written)").

## Scope / non-goals (YAGNI)

- No change to bucket/smoke/data-placement/augment logic (Steps 5–10).
- No Jira write-back (the GitHub-for-Jira app handles linking — validated on SW-1; separate decision).
- No interactive clarification; no ticket-hygiene gate.
- The structured PR body stays; we add the Summary + Assumptions, not a rewrite.
- No `--base` flag — base is inferred from the starting branch.

## Affected files (implementation surface)

- `.claude/skills/from-issue/references/workflow.md` — Steps 4, 11, 12.
- `.claude/skills/from-issue/references/pr-description-template.md` — adaptive "What I understood" + Assumptions block.
- `docs/adr/0012-from-issue-conventions.md` — new ADR.
- `docs/from-issue.md` — branch/commit/PR examples + parsing-robustness note.
- `.claude/skills/from-issue/SKILL.md` — any branch/usage examples.

## Verification approach

Skill-documentation change → verified by the next runs on `e2e-jira-from-issues`:

1. Re-run a well-structured ticket (e.g. a new `SW` ticket) → confirm branch `SW-<n>-<feature>`, conventional commit (subject+body+`Refs`), conventional PR title, PR base = `e2e-jira-from-issues`, Summary lead, no Assumptions block (nothing inferred).
2. Run a deliberately **vague** `SW` ticket → confirm best-effort generation + a populated **Assumptions & open questions** block in the PR, no abort.
3. Run a ticket with a formal **user-story narrative** → confirm "Requirement (as written)" restates the narrative.
