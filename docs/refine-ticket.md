# refine-ticket — Learning Guide

`/refine-ticket SW-123` hardens a Jira ticket _before_ you generate tests, so `/from-issue` has nothing left to guess. This is the learning guide; for the procedural workflow Claude follows, see [`.claude/skills/refine-ticket/references/workflow.md`](../.claude/skills/refine-ticket/references/workflow.md).

## What it does

It reads the ticket (Atlassian MCP), scores it against a [rubric](../.claude/skills/refine-ticket/references/rubric.md) (real user? explicit pass/fail signal? concrete data? one behavior per AC? already covered?), and **loops** — closing each gap from what's already automated, from app docs, or by asking you — until the ticket is unambiguous. On your approval it writes a `## Refined Acceptance Criteria` block back to the ticket (the reporter's original text is preserved) and posts an audit comment. See [ADR-0013](adr/0013-refine-ticket-jira-writeback.md).

## Why it exists

Phase F made `/from-issue` _tolerant_ of vague tickets — it generates best-effort and lists its guesses in the PR. `/refine-ticket` shifts that left: fix the input, so there are fewer guesses to review. The flow is **`/refine-ticket SW-123` → approve → `/from-issue SW-123`**; a good refinement makes `/from-issue`'s PR Assumptions block come out near-empty.

## Sources it uses

It grounds refinements in **what exists** — `src/pages/`, `tests/`, `data/`, `docs/app/`, framework conventions, and (in a real org) Confluence. It does **not** inspect a running app: refinement is shift-left, so it works even when the feature isn't built yet — exact selectors/strings are `/from-issue`'s job at generation time. When something isn't anywhere, it asks you, and you can either answer or **point it at a source** ("it's in Confluence page X", a URL, a doc path). On a brand-new project with no docs, this is how you teach it the domain. See [sources.md](../.claude/skills/refine-ticket/references/sources.md).

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
