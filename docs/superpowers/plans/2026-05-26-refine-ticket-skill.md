# `/refine-ticket` Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new `/refine-ticket <KEY>` custom skill that iteratively hardens a Jira automation ticket against a "bulletproof" rubric — grounded in existing automation, app docs, and user-supplied sources — and, on human approval, writes the refined ACs back to the Jira ticket.

**Architecture:** Pure skill-documentation — the skill is an LLM workflow defined by Markdown contracts under `.claude/skills/refine-ticket/` (compact `SKILL.md` + verbose `references/`, per ADR-0008), plus a new ADR-0013, a learning guide, and two companion doc fixes. No runtime code.

**Tech Stack:** Markdown skill references; Atlassian MCP (Jira read + write, Confluence read); `playwright-cli` (live-app read-only); Prettier (format gate).

**Spec:** [`docs/superpowers/specs/2026-05-26-refine-ticket-skill-design.md`](../specs/2026-05-26-refine-ticket-skill-design.md)

**Branch:** `phase-g-refine-ticket` (off `main`; spec already committed).

**TDD note:** Documentation edits — no per-task unit tests. Each task's gate is `npx prettier --check <file>` run **bare** (NEVER piped to `tail`/`head` — the pipe masks prettier's non-zero exit) + a `grep` consistency read. Commits use **repeated `-m` flags**, never shell here-strings. **Behavioral verification** is the spec's 5 scenarios — post-merge, user-driven on `e2e-jira-from-issues`.

---

## File Structure

| File                                                                  | Responsibility                                                              | Task |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---- |
| `docs/adr/0013-refine-ticket-jira-writeback.md` (new)                 | Record the single-writer Jira write-back decision; scope ADR-0011           | 1    |
| `.claude/skills/refine-ticket/references/rubric.md` (new)             | The 9-item "bulletproof" rubric + worked examples                           | 2    |
| `.claude/skills/refine-ticket/references/sources.md` (new)            | Source catalog + discovery order + user-supplied-source protocol            | 3    |
| `.claude/skills/refine-ticket/references/writeback-template.md` (new) | The `## Refined Acceptance Criteria` block + idempotent-update rule         | 4    |
| `.claude/skills/refine-ticket/references/workflow.md` (new)           | The procedural loop tying rubric + sources + writeback together             | 5    |
| `.claude/skills/refine-ticket/SKILL.md` (new)                         | Frontmatter (`allowed-tools`) + intro + pointers                            | 6    |
| `docs/refine-ticket.md` (new)                                         | Learning guide with a worked example                                        | 7    |
| `docs/jira-tickets.md` + `CLAUDE.md` (modify)                         | Companion fixes: stale branch line + `/refine-ticket` pointer + skills list | 8    |

**Ordering rationale:** ADR first (it's referenced by the rest). `rubric.md` / `sources.md` / `writeback-template.md` are leaf references with no dependence on each other; build them before `workflow.md`, which links all three. `SKILL.md` points at every reference, so it comes after them. The learning guide and companion fixes come last.

**Relative-path key (verified against the `from-issue` skill):**

- From a file in `references/` → repo `docs/`: `../../../../docs/...` (4 levels: `references/` → `refine-ticket/` → `skills/` → `.claude/` → root).
- From `SKILL.md` → repo `docs/`: `../../../docs/...` (3 levels).
- From `docs/refine-ticket.md` → a skill file: `../.claude/skills/refine-ticket/...`; → an ADR: `adr/0013-...`.

---

## Task 1: ADR-0013 — Jira write-back (scopes ADR-0011)

**Files:** Create `docs/adr/0013-refine-ticket-jira-writeback.md`

- [ ] **Step 1: Create the ADR** (Nygard format per `docs/adr/0000-template.md`, < 80 lines)

```markdown
# 0013 — /refine-ticket writes refined ACs back to Jira (scopes ADR-0011)

**Date:** 2026-05-26
**Status:** Accepted

## Context

Phase F (ADR-0012) made `/from-issue` tolerant of any ticket quality, but its guessing only surfaces _after_ generation, in the PR's Assumptions block. The new `/refine-ticket` skill hardens a ticket _before_ generation. To make the hardened result the team's system of record — the version `/from-issue` then reads — it must live on the ticket. ADR-0011 deliberately made `/from-issue` read-only against Jira.

## Decision

`/refine-ticket` is the **only** skill in this project that writes to Jira, and it writes **only on explicit human approval**. On approval it:

- appends (or idempotently updates) a delimited `## Refined Acceptance Criteria` block in the ticket **description** via `editJiraIssue`, **preserving the reporter's original text** above the block; and
- posts a one-line audit comment via `addCommentToJiraIssue`.

It performs **no** status transitions and changes **no** other fields. `/from-issue` remains read-only (ADR-0011 unchanged for it).

## Consequences

- The ticket becomes a single bulletproof source of truth that `/from-issue` reads — guessing is removed at the source.
- A clear single-writer boundary: only `/refine-ticket`, only the description block + audit comment, only on approval.
- Requires Jira **write** scope through the Atlassian MCP OAuth grant (no tokens/env vars).
- The delimited block (HTML-comment sentinels) makes re-runs idempotent and never clobbers the reporter's words.
- If the user declines at the approval gate, nothing is written — the hardened text is emitted in-session for manual use.

## Alternatives considered

- **Comment-only (don't touch the description).** Rejected: `/from-issue` parses the description, not comments; a comment wouldn't feed generation. (Kept only as the audit trail.)
- **Overwrite the whole description.** Rejected: destroys the reporter's original intent and context.
- **A dedicated custom field.** Rejected: not portable across Jira projects / a fresh client site; the description block works everywhere.
- **No write-back / propose-only.** Rejected by the user in favor of write-back-on-approval — see the design.

## Relationship to ADR-0011

This **scopes**, not reverses, [ADR-0011](0011-jira-ticket-source.md): "no Jira write-back" remains true for `/from-issue`; `/refine-ticket` is the sanctioned, approval-gated writer. ADR-0011's status gains the note "scoped by ADR-0013".

## Related

- [ADR-0012](0012-from-issue-conventions.md) — `/from-issue` conventions + ticket normalization; [ADR-0008](0008-custom-skills-pattern.md) — custom-skill layout.
```

- [ ] **Step 2: Note the scoping on ADR-0011** — append `; scoped by ADR-0013` to ADR-0011's status reference. Open `docs/adr/0011-jira-ticket-source.md`, find the "Relationship to ADR-0007" section's last sentence, and after it add a new line:

```markdown
**Scoped by:** [ADR-0013](0013-refine-ticket-jira-writeback.md) — `/refine-ticket` may write refined ACs back to the ticket on approval; `/from-issue` itself stays read-only.
```

Insert this line immediately before the `## Supersedes` heading in `docs/adr/0011-jira-ticket-source.md`.

- [ ] **Step 3: Format, consistency, commit**

```bash
npx prettier --check docs/adr/0013-refine-ticket-jira-writeback.md docs/adr/0011-jira-ticket-source.md
grep -n "scoped by ADR-0013\|Scoped by" docs/adr/0011-jira-ticket-source.md   # expect: present
grep -n "only on explicit human approval\|only skill" docs/adr/0013-refine-ticket-jira-writeback.md   # expect: present
git add docs/adr/0013-refine-ticket-jira-writeback.md docs/adr/0011-jira-ticket-source.md
git commit -m "docs(g): ADR-0013 — /refine-ticket Jira write-back (scopes ADR-0011)" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `references/rubric.md` — the bulletproof rubric

**Files:** Create `.claude/skills/refine-ticket/references/rubric.md`

- [ ] **Step 1: Write the rubric reference**

```markdown
# Refinement Rubric — what "bulletproof" means

`/refine-ticket` scores the ticket against the checklist below. **Each unmet item is a "gap"** the workflow must close (auto-resolve from a source, or ask the user — see [`workflow.md`](workflow.md)). A ticket is **bulletproof when zero gaps remain open** — i.e. `/from-issue` would have nothing left to infer.

Score the **whole ticket** (Feature + every AC). Treat each AC independently for items 2–8.

## The checklist

1. **Feature** — a single snake_case slug is present (e.g. `Feature: login`). Drives `tests/<feature>/`. Gap → infer from the summary/subject and confirm with the user.
2. **One behavior per AC** — no compound "X and Y". Gap → split into separate ACs.
3. **Real user role** — each AC names the actor (e.g. `standard_user`, `locked_out_user`). Validate against `data/` users / `docs/app/users.md` when present. Gap → ask which user, or default and record the assumption.
4. **Explicit pass/fail signal** — each AC has an observable, deterministic outcome: a URL, an exact message string, or an element state. No "works", "looks good", "is correct". Gap → ask for the concrete signal; confirm real strings against the live app / Page Objects where possible.
5. **Location** — each AC says _where_ it happens ("on the inventory page", "in the cart"), mapping to an existing or scaffoldable Page Object. Gap → ask which surface.
6. **Concrete data** — literal values or a named scenario, not "some product". Gap → ask for values, or reference a `data/` scenario.
7. **Bucket coverage** — Positive / Negative / Edge considered for the feature; call out missing buckets (per [`../../from-issue/references/bucket-classification.md`](../../from-issue/references/bucket-classification.md)). Gap → propose the missing negative/edge AC for the user to accept or decline.
8. **Automatable** — flag manual-only ACs (visual aesthetics, subjective copy) per [`../../from-issue/references/qa-analysis.md`](../../from-issue/references/qa-analysis.md). Gap → recommend marking the AC out of automation scope.
9. **Coverage (lightweight flag)** — does the AC overlap something already automated? Heuristic match of the AC's behavior against existing test titles + `tests/<feature>/` files. This is a **flag, not a blocker** ("AC2 looks already covered by `tests/login/login.spec.ts` — drop or confirm"). Degrades gracefully: nothing automated → never fires. (`/from-issue` still dedupes at generation time per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md); this surfaces it earlier, to the human.)

## Worked example

**Raw AC:** "User can log in and it works."

| Item | Gap?                                            |
| ---- | ----------------------------------------------- |
| 3    | No user named → which of the six users?         |
| 4    | "it works" has no signal → what proves success? |
| 5    | No location → which page confirms login?        |

**After resolution:** "AC: `standard_user` logging in with `secret_sauce` lands on the inventory page (URL `/inventory.html`)." — items 3/4/5 now satisfied; gap count for this AC → 0.

## What is NOT in the rubric (YAGNI)

- No semantic coverage matrix — item 9 is a heuristic flag only.
- No estimation, priority, or sprint fields — automation-readiness only.
```

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/refine-ticket/references/rubric.md
grep -nE "^[0-9]\. \*\*" .claude/skills/refine-ticket/references/rubric.md   # expect: 9 numbered rubric items
git add .claude/skills/refine-ticket/references/rubric.md
git commit -m "feat(g): refine-ticket rubric reference — bulletproof checklist" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: `references/sources.md` — source catalog + user-supplied protocol

**Files:** Create `.claude/skills/refine-ticket/references/sources.md`

- [ ] **Step 1: Write the sources reference**

```markdown
# Sources — where refinement evidence comes from

`/refine-ticket` resolves gaps (see [`rubric.md`](rubric.md)) from **ground truth**, not invention. It consults sources in the cheap-to-expensive order below, then asks the user for anything still unresolved. **A missing source is never a failure — it is a prompt for input.** This is what makes the skill reusable on a greenfield repo with no docs.

## Discovery order (cheap → expensive)

1. **The ticket** — already read in workflow Step 2 (Atlassian MCP `getJiraIssue`).
2. **The authoring contract** — [`../../../../docs/jira-tickets.md`](../../../../docs/jira-tickets.md): what a good ticket looks like (mirrors the rubric).
3. **Existing automation (ground truth)** — read the repo:
   - `src/pages/` — real Page Objects + their action methods (confirms locations + capabilities).
   - `tests/` — existing specs (feeds the rubric's coverage flag).
   - `data/` — real users + named scenarios (confirms roles + data).
   - `src/fixtures/`, `src/components/` — what's wired.
4. **App domain knowledge** — `docs/app/` when present: `users.md` (the real users), `flows.md`, `overview.md`, `glossary.md`.
5. **Framework judgment** — `CLAUDE.md`, [`../../from-issue/references/bucket-classification.md`](../../from-issue/references/bucket-classification.md), [`../../from-issue/references/smoke-policy.md`](../../from-issue/references/smoke-policy.md), [`../../from-issue/references/qa-analysis.md`](../../from-issue/references/qa-analysis.md).
6. **The live app** — when a real selector or error string must be confirmed and isn't in code/docs, use `playwright-cli` **read-only** (snapshot / DOM read). Never mutate app state.
7. **User-supplied** — anything the user points at mid-loop (next section).

## User-supplied-source protocol

When a gap cannot be closed from sources 1–6, ask the user a **targeted** question and offer two response modes:

- **(a) Answer directly** — the user states the fact ("use `standard_user`"; "the error is `Epic sadface: ...`").
- **(b) Point at a source** — the user names where the knowledge lives. Ingest it, then re-resolve the gap:
  - **Confluence page** → fetch via `getConfluencePage` (or locate via `searchConfluenceUsingCql`).
  - **A URL** → fetch and read it.
  - **"Check the live app" / a path** → drive `playwright-cli` read-only, or `Read` the given file.
  - **A repo path not yet read** → `Read`/`Grep` it.

Ask one cluster of related gaps at a time; do not interrogate one field per message. Record every assumption made when the user says "default it / your call" so it can be shown at the approval gate.

## Greenfield behavior

On a repo with no `docs/app/` and an empty suite, sources 3–4 yield little; the skill leans on 5–7. It still scores the ticket against the rubric and closes gaps via user input — it does **not** abort for lack of docs, and it does **not** invent ground truth silently.
```

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/refine-ticket/references/sources.md
grep -nE "getConfluencePage|playwright-cli|User-supplied-source protocol" .claude/skills/refine-ticket/references/sources.md   # expect: present
git add .claude/skills/refine-ticket/references/sources.md
git commit -m "feat(g): refine-ticket sources reference — catalog + user-supplied protocol" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: `references/writeback-template.md` — the write-back block

**Files:** Create `.claude/skills/refine-ticket/references/writeback-template.md`

- [ ] **Step 1: Write the write-back template reference**

````markdown
# Write-back template — the `## Refined Acceptance Criteria` block

On approval (workflow Step 7), `/refine-ticket` writes the hardened result into the Jira **description** via `editJiraIssue`, then posts an audit comment via `addCommentToJiraIssue`. Per [ADR-0013](../../../../docs/adr/0013-refine-ticket-jira-writeback.md), this is the only Jira mutation and only on human approval.

## Description block

Append this block to the **end** of the existing description, **preserving all original text above it**. The HTML-comment sentinels make re-runs idempotent.

```markdown
<!-- refine-ticket:start — generated block; edit ACs here or re-run /refine-ticket -->

## Refined Acceptance Criteria

_Refined by `/refine-ticket` on YYYY-MM-DD. Original request preserved above._

Feature: <feature>

- AC 1: <one behavior, real user, explicit signal, location, concrete data>
- AC 2: ...

<!-- refine-ticket:end -->
```

## Idempotent-update rule

Before writing:

1. Search the current description for `<!-- refine-ticket:start -->` … `<!-- refine-ticket:end -->`.
2. **If found** → replace everything between (and including) the sentinels with the new block. Do not duplicate.
3. **If not found** → append the new block after the existing description (one blank line separator).

Never modify text **outside** the sentinels — that is the reporter's original content.

## Audit comment

After the description write succeeds, post one comment via `addCommentToJiraIssue`:

```
Refined by /refine-ticket on YYYY-MM-DD — N acceptance criteria hardened (see the "Refined Acceptance Criteria" section). Run /from-issue <KEY> to generate tests.
```

## If the user declines write-back

Do **not** call `editJiraIssue` or `addCommentToJiraIssue`. Emit the full block above in the session so the user can paste it manually. Report that no Jira changes were made.

## Dry-run

When invoked with `dry-run`, perform every step EXCEPT the two MCP writes; print the block and the audit-comment text that _would_ be posted.
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/refine-ticket/references/writeback-template.md
grep -nE "refine-ticket:start|refine-ticket:end|Idempotent-update rule" .claude/skills/refine-ticket/references/writeback-template.md   # expect: present
git add .claude/skills/refine-ticket/references/writeback-template.md
git commit -m "feat(g): refine-ticket write-back template — idempotent description block" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: `references/workflow.md` — the procedural loop

**Files:** Create `.claude/skills/refine-ticket/references/workflow.md`

- [ ] **Step 1: Write the workflow reference**

````markdown
# /refine-ticket — procedural workflow

Read this file before executing the skill. The skill hardens a Jira ticket against the rubric, looping until no gaps remain, then writes the refined ACs back to the ticket on approval. It does NOT generate tests — that is `/from-issue`'s job.

## 1. Parse arguments

- Required: a Jira issue key `<KEY>` (e.g. `SW-123`).
- Optional: `dry-run` — do everything except the Jira writes (see [`writeback-template.md`](writeback-template.md)).

## 2. Read the ticket

```bash
# Resolve the Atlassian cloudId, then fetch the issue.
```

Call `getAccessibleAtlassianResources` (cloudId), then `getJiraIssue` for `<KEY>`. Capture the summary + description (the raw requirement). **If the ticket can't be read**, abort with the MCP error verbatim.

## 3. Discover sources

Per [`sources.md`](sources.md), consult sources in cheap→expensive order (repo reads → app docs → conventions). Do not yet ask the user — gather what ground truth exists first.

## 4. Score against the rubric

Apply every item in [`rubric.md`](rubric.md) to the Feature + each AC. Produce a **gap list**: each unmet item, tagged with which AC it belongs to. Also build the `assumptions[]` running list (every inference made from a source rather than the ticket).

## 5. Refinement loop

Repeat until the gap list is empty (or the user says "good enough"):

1. **Auto-resolve** every gap a source can answer; record each as an assumption.
2. **For residual gaps with no source**, ask the user a targeted, clustered question — offering **(a) answer directly** or **(b) point at a source** (Confluence / URL / live app / path), per [`sources.md`](sources.md). Ingest any provided source.
3. **Re-score** (Step 4) with the new information.

**Never** silently guess a residual gap; either a source closes it or the user does. Abort ONLY if the ticket has no extractable behavior at all and the user provides nothing: _"Nothing testable in `<KEY>` and no source provided — cannot refine."_

## 6. Present for approval

Show the user, in one message:

- **Before → After** of the ACs (the hardened set).
- **Resolved assumptions** — the `assumptions[]` list (what was inferred and from where).
- **Coverage flags** — any rubric item-9 overlaps ("AC2 looks already covered by …").
- The exact `## Refined Acceptance Criteria` block (from [`writeback-template.md`](writeback-template.md)) that will be written.

Ask: **"Write this back to `<KEY>`? (yes / edit / no)"**

## 7. Write back (on approval)

- **yes** → apply the idempotent description update via `editJiraIssue`, then the audit comment via `addCommentToJiraIssue` (per [`writeback-template.md`](writeback-template.md)). Per [ADR-0013](../../../../docs/adr/0013-refine-ticket-jira-writeback.md). If a write fails, report the MCP error verbatim and emit the block locally so nothing is lost.
- **edit** → apply the user's tweaks, return to Step 6.
- **no** → emit the block in-session for manual paste; make NO Jira calls.
- **dry-run mode** → never write; print what would be written.

## 8. Hand off

Suggest the next step: _"`<KEY>` is refined. Run `/from-issue <KEY>` to generate tests — its Assumptions block should now be near-empty."_

## Error handling (summary)

- Ticket unreadable → abort with MCP error verbatim.
- No sources + user provides none → still score + ask per gap; never invent ground truth.
- Decline at approval → no mutation; emit locally.
- Write fails → report verbatim; result preserved in-session.
- Live-app exploration via `playwright-cli` is read-only; never mutate app state.
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/refine-ticket/references/workflow.md
grep -nE "Refinement loop|Write back \(on approval\)|getJiraIssue|editJiraIssue" .claude/skills/refine-ticket/references/workflow.md   # expect: present
git add .claude/skills/refine-ticket/references/workflow.md
git commit -m "feat(g): refine-ticket workflow reference — discover/score/loop/writeback" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: `SKILL.md` — frontmatter + pointers

**Files:** Create `.claude/skills/refine-ticket/SKILL.md`

- [ ] **Step 1: Write SKILL.md**

```markdown
---
name: refine-ticket
description: Iteratively harden a Jira automation ticket against a "bulletproof" rubric — grounded in existing automation, app docs, and user-supplied sources — then write the refined acceptance criteria back to the ticket on approval, so /from-issue has nothing left to guess.
allowed-tools: Read Glob Grep Bash(playwright-cli:*) Bash(npx:*) mcp__atlassian__getAccessibleAtlassianResources mcp__atlassian__getJiraIssue mcp__atlassian__editJiraIssue mcp__atlassian__addCommentToJiraIssue mcp__atlassian__getConfluencePage mcp__atlassian__searchConfluenceUsingCql
---

# refine-ticket

Given a Jira issue key (e.g. `SW-123`), this skill reads the ticket via the Atlassian MCP, scores it against the refinement rubric, and loops — auto-resolving gaps from existing automation + docs and asking you (or a source you point it at) for the rest — until the ticket is unambiguous. On your approval it writes a `## Refined Acceptance Criteria` block back to the ticket. It does NOT generate tests; run `/from-issue` after. See [ADR-0013](../../../docs/adr/0013-refine-ticket-jira-writeback.md).

## How to use it

Tell Claude what you want:

> Use the refine-ticket skill on SW-123.

Or to preview without writing to Jira:

> Use the refine-ticket skill on SW-123 with dry-run.

During the loop, when asked about a gap you can either answer directly or point the skill at a source ("it's in Confluence page X", a URL, "check the live app"). The skill ingests it and continues. It stops when the ticket has no open gaps, then asks before writing anything back.

## Workflow

The full procedural workflow is in [`references/workflow.md`](references/workflow.md). Read that file before executing the skill.

> **Setup note:** the Atlassian MCP must be connected (OAuth) with **write** scope for the Step 7 description update — defined at project scope in [`.mcp.json`](../../../.mcp.json). Its read + write tools are pre-authorized in `allowed-tools` above so the loop doesn't prompt each call. Write-back happens only on your explicit approval (per [ADR-0013](../../../docs/adr/0013-refine-ticket-jira-writeback.md)).

## References

- [`references/workflow.md`](references/workflow.md) — the procedural loop
- [`references/rubric.md`](references/rubric.md) — the "bulletproof" checklist (definition of done)
- [`references/sources.md`](references/sources.md) — source catalog + user-supplied-source protocol
- [`references/writeback-template.md`](references/writeback-template.md) — the `## Refined Acceptance Criteria` block + idempotent-update rule

## Composition

This skill pairs with [`/from-issue`](../from-issue/SKILL.md): refine first, then generate. It reuses `/from-issue`'s [`bucket-classification.md`](../from-issue/references/bucket-classification.md) and [`qa-analysis.md`](../from-issue/references/qa-analysis.md) for the rubric's coverage/automatable judgment.

## See also

- [`docs/refine-ticket.md`](../../../docs/refine-ticket.md) — learning guide with a worked example
- [`docs/adr/0008-custom-skills-pattern.md`](../../../docs/adr/0008-custom-skills-pattern.md) — why custom skills follow this layout
```

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check .claude/skills/refine-ticket/SKILL.md
grep -nE "editJiraIssue|addCommentToJiraIssue|name: refine-ticket" .claude/skills/refine-ticket/SKILL.md   # expect: present
git add .claude/skills/refine-ticket/SKILL.md
git commit -m "feat(g): refine-ticket SKILL.md — frontmatter, allowed-tools, pointers" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: `docs/refine-ticket.md` — learning guide

**Files:** Create `docs/refine-ticket.md`

- [ ] **Step 1: Write the learning guide**

````markdown
# refine-ticket — Learning Guide

`/refine-ticket SW-123` hardens a Jira ticket _before_ you generate tests, so `/from-issue` has nothing left to guess. This is the learning guide; for the procedural workflow Claude follows, see [`.claude/skills/refine-ticket/references/workflow.md`](../.claude/skills/refine-ticket/references/workflow.md).

## What it does

It reads the ticket (Atlassian MCP), scores it against a [rubric](../.claude/skills/refine-ticket/references/rubric.md) (real user? explicit pass/fail signal? concrete data? one behavior per AC? already covered?), and **loops** — closing each gap from what's already automated, from app docs, or by asking you — until the ticket is unambiguous. On your approval it writes a `## Refined Acceptance Criteria` block back to the ticket (the reporter's original text is preserved) and posts an audit comment. See [ADR-0013](adr/0013-refine-ticket-jira-writeback.md).

## Why it exists

Phase F made `/from-issue` _tolerant_ of vague tickets — it generates best-effort and lists its guesses in the PR. `/refine-ticket` shifts that left: fix the input, so there are fewer guesses to review. The flow is **`/refine-ticket SW-123` → approve → `/from-issue SW-123`**; a good refinement makes `/from-issue`'s PR Assumptions block come out near-empty.

## Sources it uses

It grounds refinements in **what exists** — `src/pages/`, `tests/`, `data/`, `docs/app/`, framework conventions, and (in a real org) Confluence and the live app. When something isn't anywhere, it asks you, and you can either answer or **point it at a source** ("it's in Confluence page X", a URL, "check the live app"). On a brand-new project with no docs, this is how you teach it the domain. See [sources.md](../.claude/skills/refine-ticket/references/sources.md).

## Worked example

**Raw ticket SW-7** — Summary: "Login". Description: "User can log in and it should work."

The skill scores it and finds gaps: no Feature line, no user role, no success signal, no location. It auto-resolves what it can (`LoginPage` exists → location = login page; `data/` has the six users), then asks: _"Which user(s), and what proves success?"_ You answer: "standard_user; lands on inventory." It re-scores → zero gaps and presents:

```
Feature: login
- AC 1: standard_user logging in with secret_sauce lands on the inventory page (/inventory.html).
```

You approve; it writes the block to SW-7 and suggests `/from-issue SW-7`.

## Dry-run

`Use the refine-ticket skill on SW-123 with dry-run.` — does everything except the Jira writes; prints the block it _would_ post. Useful for trying the skill without mutating a ticket.

## See also

- [`refine-ticket` SKILL.md](../.claude/skills/refine-ticket/SKILL.md)
- [`docs/from-issue.md`](from-issue.md) — the generation step that consumes the refined ticket
- [`docs/jira-tickets.md`](jira-tickets.md) — how to author a ticket by hand (the rubric, as a guide)
````

- [ ] **Step 2: Format, consistency, commit**

```bash
npx prettier --check docs/refine-ticket.md
grep -nE "Worked example|adr/0013|from-issue SW-7" docs/refine-ticket.md   # expect: present
git add docs/refine-ticket.md
git commit -m "docs(g): refine-ticket learning guide with worked example" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Companion fixes — `docs/jira-tickets.md` + `CLAUDE.md`

**Files:** Modify `docs/jira-tickets.md`, `CLAUDE.md`

- [ ] **Step 1: Fix the stale branch line in `docs/jira-tickets.md`**

Find:

```markdown
The skill generates tests on branch `from-issue/SW-123-<feature>`, opens a GitHub PR, and the GitHub-for-Jira app links the PR onto the ticket.
```

Replace with:

```markdown
The skill generates tests on branch `SW-123-<feature>` (key-first, per [ADR-0012](adr/0012-from-issue-conventions.md)), opens a GitHub PR, and the GitHub-for-Jira app links the PR onto the ticket.
```

- [ ] **Step 2: Add a `/refine-ticket` pointer to `docs/jira-tickets.md`** — immediately after the `## Tips (same judgment the skill applies)` list (before `## What happens next`), insert:

```markdown
## Don't want to hand-author all this?

Run `/refine-ticket SW-123` first — it scores the ticket against exactly these tips, fills the gaps with you (using what's already automated + app docs + anything you point it at), and writes the hardened acceptance criteria back to the ticket. Then run `/from-issue SW-123`. See [`refine-ticket.md`](refine-ticket.md).
```

- [ ] **Step 3: Add `/refine-ticket` to the Custom skills list in `CLAUDE.md`**

Find:

```markdown
- **`/from-issue`** — generate a set of Playwright tests from a Jira ticket (read via the Atlassian MCP) and open a GitHub PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist. Full guide: [`docs/from-issue.md`](docs/from-issue.md).
```

Replace with:

```markdown
- **`/from-issue`** — generate a set of Playwright tests from a Jira ticket (read via the Atlassian MCP) and open a GitHub PR with the result. Composes `/scaffold-page-object` when a target Page Object doesn't yet exist. Full guide: [`docs/from-issue.md`](docs/from-issue.md).
- **`/refine-ticket`** — iteratively harden a Jira ticket against a "bulletproof" rubric (grounded in existing automation + docs + sources you point it at) and write the refined acceptance criteria back to the ticket on approval, so `/from-issue` has nothing left to guess. Writes to Jira ([ADR-0013](docs/adr/0013-refine-ticket-jira-writeback.md)) — the only skill that does. Full guide: [`docs/refine-ticket.md`](docs/refine-ticket.md).
```

- [ ] **Step 4: Format, consistency, commit**

```bash
npx prettier --check docs/jira-tickets.md CLAUDE.md
grep -n "from-issue/SW-123" docs/jira-tickets.md   # expect: none (stale line fixed)
grep -n "refine-ticket" docs/jira-tickets.md CLAUDE.md   # expect: present in both
git add docs/jira-tickets.md CLAUDE.md
git commit -m "docs(g): point jira-tickets + CLAUDE skills list at /refine-ticket; fix stale branch shape" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Final review + behavioral verification handoff

- [ ] **Step 1: Whole-branch consistency sweep**

```bash
npx prettier --check .claude/skills/refine-ticket/SKILL.md .claude/skills/refine-ticket/references/*.md docs/adr/0013-refine-ticket-jira-writeback.md docs/refine-ticket.md docs/jira-tickets.md CLAUDE.md
# Cross-file consistency:
grep -rn "refine-ticket:start" .claude/skills/refine-ticket/references/   # block sentinel defined + referenced
grep -rn "ADR-0013\|0013-refine-ticket" .claude/skills/refine-ticket/ docs/   # ADR threaded through
git status --short   # expect: clean
git log --oneline main..phase-g-refine-ticket   # expect: spec + 8 task commits
```

- [ ] **Step 2: Pause for the user** — Tasks 1–8 are the build; the spec's 5 behavioral scenarios are **post-merge, user-driven on `e2e-jira-from-issues`**. Hand back to the user to: merge `phase-g-refine-ticket` → `main` (local `--no-ff`, mirroring Phase F), then merge `main` → `e2e-jira-from-issues`, then run the scenarios:
  1. **Vague ticket, sources exist** → auto-resolves + asks residuals + writes the block; `/from-issue` Assumptions then near-empty.
  2. **Greenfield gap** → prompts, accepts a pointed-at source, re-resolves.
  3. **Coverage overlap** → rubric item-9 flag fires.
  4. **Idempotency** → re-run updates the block in place, original preserved.
  5. **Decline write-back** → no Jira mutation, block emitted locally.

---

## Self-Review (completed by plan author)

**Spec coverage:** Decision 1 (standalone `/refine-ticket`, flow, validation signal) → Tasks 6 + 7. Decision 2 (hybrid loop + user-supplied sources) → Task 5 (Step 5) + Task 3. Decision 3 (9-item rubric) → Task 2. Decision 4 (sources by role) → Task 3. Decision 5 (ground-truth + lightweight coverage flag) → Task 2 item 9. Decision 6 (write-back on approval, idempotent block, ADR-0013) → Tasks 1 + 4 + 5 (Step 7). Decision 7 (reusability / no hardcoded paths) → Task 3 (greenfield section) + Task 5. Skill-structure file list → Tasks 1–8. Error handling → Task 5. Companion fixes → Task 8. Verification approach → Task 9. No gaps.

**Placeholder scan:** No "TBD/handle edge cases". Every task has complete file content + a bare `prettier --check` and a `grep` gate. Angle-bracket tokens (`<KEY>`, `<feature>`, `YYYY-MM-DD`, AC text) are intentional skill-template placeholders the skill fills per run, not plan gaps.

**Consistency:** The skill name `refine-ticket`, the block sentinels `<!-- refine-ticket:start -->` / `<!-- refine-ticket:end -->`, the `## Refined Acceptance Criteria` heading, and the MCP tool names (`getJiraIssue`, `editJiraIssue`, `addCommentToJiraIssue`, `getConfluencePage`, `searchConfluenceUsingCql`) are identical across Tasks 1, 4, 5, 6. The 9-item rubric is defined once (Task 2) and referenced (not redefined) by workflow/SKILL/guide. Relative paths follow the verified key in the File Structure section. `allowed-tools` (Task 6) lists exactly the tools the workflow (Task 5) calls.
