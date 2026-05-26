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
