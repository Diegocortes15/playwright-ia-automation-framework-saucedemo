# `/refine-ticket` — Iterative Ticket-Refinement Skill — Design

**Status:** Approved (brainstorm) — pending implementation plan.
**Date:** 2026-05-26

## Goal

Add a new custom skill, **`/refine-ticket <KEY>`**, that iteratively hardens a Jira automation ticket until it is "bulletproof" — unambiguous enough that `/from-issue` has nothing left to guess. It grounds every refinement in **what already exists** (the automated suite, app docs, framework conventions, and — in a professional setting — Confluence and the live app), and it is **reusable on a greenfield project**: when a source doesn't exist, the user points the skill at one (a doc, a URL, the live app) rather than the skill failing.

This shifts ambiguity resolution **left** — from `/from-issue`'s post-generation PR Assumptions block (Phase F) to a pre-generation grooming step. The two are complementary: Phase F made `/from-issue` _tolerant_ of raw tickets; `/refine-ticket` _improves the input_ so the tolerance is rarely needed.

## Context

Phase F (ADR-0012) made `/from-issue` normalize any ticket format/quality and surface its inferences as a PR **Assumptions & open questions** block — the review gate is _after_ code exists. The user wants a way to remove the guessing _before_ generation, producing tickets that are "very sure what needs to be done." The project is a **reusable template** for future client work, so the skill must not be hardcoded to saucedemo and must work where `docs/app/` and an existing suite don't yet exist.

This is a **new custom skill** following the ADR-0008 layout (compact `SKILL.md` + verbose `references/`), composing existing tools (Atlassian MCP, `playwright-cli`, repo reads). It is the first skill in the project that **writes back to Jira** — a deliberate, scoped departure from ADR-0011's read-only stance.

## Decisions

1. **Standalone skill, verb-first name `/refine-ticket`.** Matches `/from-issue` / `/scaffold-page-object`. It does **not** replace or modify `/from-issue`. Intended professional flow: **`/refine-ticket <KEY>` → (human approval) → `/from-issue <KEY>`**. Built-in validation signal: after refinement, `/from-issue`'s Assumptions block should come out near-empty.

2. **Loop model — hybrid (auto-resolve + ask residuals + user-supplied sources).** Each pass:
   1. **Discover & consult** available ground truth.
   2. **Auto-resolve** every gap the sources can answer.
   3. **For each residual gap with no source**, ask the user, offering two response modes: **(a)** answer directly, or **(b)** point the skill at a source (Confluence page, URL, "check the live app", a doc path) which it ingests and re-resolves.
   4. **Terminate** at zero residual gaps (or explicit user "good enough").
      Greenfield behavior: with no docs, the skill leans entirely on the user + live-app exploration — the user teaches it where knowledge lives. Missing sources are an _input prompt_, never a failure.

3. **The "bulletproof" rubric (definition of done).** The skill scores the ticket against this checklist; **each unmet item is a gap** to resolve via the loop. Derived from `docs/jira-tickets.md`, `qa-analysis.md`, and the bucket/smoke conventions:
   1. **Feature** slug present, snake_case.
   2. Each **AC = exactly one behavior** (compound "X and Y" is split).
   3. Each AC names a **real user role** (validated against `data/` users / `docs/app/users.md` when those exist).
   4. Each AC has an **explicit, observable pass/fail signal** (URL, exact message text, element state), grounded in real selectors/strings where a source exists.
   5. Each AC names **where** it happens → maps to an existing or scaffoldable Page Object.
   6. **Data is concrete** — literal values or a named scenario.
   7. **Positive / Negative / Edge** coverage considered; missing buckets called out.
   8. **Automatable** — manual-only ACs flagged (per `qa-analysis.md` skip judgment).
   9. **(coverage)** Not already covered by existing automation — lightweight overlap flag.

4. **Sources consumed, by role:**
   - **The ticket** — Jira via the Atlassian MCP (raw input).
   - **The authoring contract** — `docs/jira-tickets.md` (what "good" looks like; mirrors the rubric).
   - **Existing automation = ground truth** — `src/pages/` (real Page Objects + methods), `tests/` (existing coverage), `data/` (real users/scenarios), fixtures.
   - **App domain knowledge** — `docs/app/` (`users.md`, `flows.md`, `overview.md`, `glossary.md`); optionally the **live app via `playwright-cli`** to confirm real selectors/error strings.
   - **Framework judgment** — `CLAUDE.md`, `bucket-classification.md`, `smoke-policy.md`, `qa-analysis.md`, ADR-0012 normalization.
   - **User-supplied (professional / greenfield)** — Confluence pages via the Atlassian MCP, arbitrary URLs, doc paths, or live-app instructions the user provides mid-loop.

5. **Coverage scope — ground-truth + lightweight coverage flag (not a coverage matrix).** The skill is already reading the suite for ground truth, so layering a heuristic "does this AC map to an existing test title/feature?" flag on top is cheap and directly serves "based on what we've automated." It is a _flag_ ("AC2 looks already covered by `tests/login/login.spec.ts` — drop or confirm"), not a semantic coverage engine. Degrades gracefully: nothing automated → never fires. (`/from-issue` already dedupes at generation time via ADR-0010 augment/duplicate-guard; this surfaces the same awareness earlier, to the human.)

6. **Write-back on approval — append an idempotent block to the description (ADR-0013).** After the user approves, the skill writes the hardened result into the **Jira description** as a clearly-delimited `## Refined Acceptance Criteria` block (plus a corrected `Feature:` line), **preserving the reporter's original text above it**. Re-running updates that block in place; it never clobbers the original. A one-line audit comment ("Refined by `/refine-ticket` on `<date>`") is posted for traceability. This requires a new **ADR-0013** that _scopes_ ADR-0011: `/from-issue` remains read-only; `/refine-ticket` is the **only** writer, and only on explicit human approval.

7. **Reusability — no hardcoded paths.** Sources are discovered by convention and supplemented by the user. The same skill drops into a fresh client repo on day one; absent sources prompt for input instead of erroring.

## Skill structure (ADR-0008)

- `.claude/skills/refine-ticket/SKILL.md` — frontmatter (name, description, `allowed-tools` incl. Atlassian read **and write** tools + `playwright-cli` + repo reads) + intro + pointer.
- `.claude/skills/refine-ticket/references/workflow.md` — the procedural loop (discover → score against rubric → resolve/ask → approve → write-back).
- `.claude/skills/refine-ticket/references/rubric.md` — the bulletproof rubric (Decision 3) with worked examples.
- `.claude/skills/refine-ticket/references/sources.md` — the source catalog + discovery order + the user-supplied-source protocol (Decision 4).
- `.claude/skills/refine-ticket/references/writeback-template.md` — the `## Refined Acceptance Criteria` block shape + idempotent-update rule (Decision 6).
- `docs/adr/0013-refine-ticket-jira-writeback.md` — scopes ADR-0011 (Decision 6).
- `docs/refine-ticket.md` — learning guide with a worked example.
- Companion fix: `docs/jira-tickets.md` — correct the stale `from-issue/SW-123-<feature>` branch shape (Phase F leftover) and add a pointer to `/refine-ticket` as the way to harden a ticket. CLAUDE.md "Custom skills" list gains a `/refine-ticket` bullet.

## Data flow

```
/refine-ticket SW-123
  → read ticket (Atlassian MCP getJiraIssue)
  → discover sources (suite, docs/app, conventions; ask for Confluence/URL/live-app as needed)
  → score ticket vs rubric → gap list
  → loop: auto-resolve from sources; for residual gaps ask user (answer | point-at-source)
  → present hardened ticket for approval
  → on approval: editJiraIssue (append/update ## Refined Acceptance Criteria block) + audit comment
  → suggest: now run /from-issue SW-123
```

## Error handling

- **Ticket not found / unreadable** → abort with the MCP error verbatim.
- **No sources available and user provides none** → the skill still scores the ticket and asks the user to answer each gap directly; it does not invent ground truth silently.
- **User declines write-back at the approval gate** → output the hardened ticket text locally (so it can be pasted manually) and stop; no Jira mutation.
- **Write-back fails (permission/MCP)** → report the error verbatim; the refinement result is preserved in the session output for manual application.
- **Live-app exploration** uses `playwright-cli` read-only (snapshot/DOM); never mutates app state.

## Alternatives considered

- **Bolt a `--refine` pre-step into `/from-issue`.** Rejected: user asked for a _new_ skill; also couples grooming with generation and bloats one workflow.
- **Non-interactive "ticket linter" (score + report, no loop).** Rejected: user explicitly wants the loop to continue "until we're very sure" — a one-shot report doesn't close gaps.
- **Propose-only / comment-only output (no description write-back).** Rejected by the user in favor of write-back-on-approval — the description is the system of record `/from-issue` reads. (Comment is retained only as the audit trail.)
- **Persisted project-context cache** (skill remembers discovered sources between runs). Deferred (YAGNI) — flagged as a future enhancement, not built now.
- **Full semantic coverage matrix.** Rejected as over-engineering; a heuristic overlap flag suffices.

## Scope / non-goals (YAGNI)

- No persisted context cache (future idea only).
- No semantic coverage matrix — lightweight overlap flag only.
- No auto-creation of new tickets, no status transitions, no field changes beyond the description block + audit comment.
- No test generation or code — that remains `/from-issue`'s job.
- No changes to `/from-issue` itself (it already handles raw tickets via Phase F).
- Write-back is the **only** Jira mutation, and only on human approval.

## Verification approach

Skill-documentation change (LLM workflow), verified behaviorally on `e2e-jira-from-issues` after merge:

1. **Vague ticket, sources exist** — refine a loose `SW` ticket; confirm the skill auto-resolves from `LoginPage`/app docs, asks only genuine residuals, and on approval writes a `## Refined Acceptance Criteria` block (original preserved) + audit comment. Then `/from-issue` on it → near-empty Assumptions block.
2. **Greenfield gap (no source)** — ask about a behavior with no doc/automation; confirm the skill prompts the user and accepts a **pointed-at source** (a URL or live-app instruction), ingests it, and re-resolves.
3. **Coverage overlap** — include an AC already covered by `tests/login/login.spec.ts`; confirm the lightweight overlap flag fires.
4. **Idempotency** — re-run `/refine-ticket` on the same ticket; confirm the block is updated in place, not duplicated, and the original reporter text is untouched.
5. **Decline write-back** — refuse at the approval gate; confirm no Jira mutation and the hardened text is emitted locally.
