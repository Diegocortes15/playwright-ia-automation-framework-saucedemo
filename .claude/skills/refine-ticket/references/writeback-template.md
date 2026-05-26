# Write-back template — the `## Refined Acceptance Criteria` block

On approval (workflow Step 7), `/refine-ticket` writes the hardened result into the Jira **description** via `editJiraIssue`, then posts an audit comment via `addCommentToJiraIssue`. Per [ADR-0013](../../../../docs/adr/0013-refine-ticket-jira-writeback.md), this is the only Jira mutation and only on human approval.

> **No HTML-comment sentinels — Jira descriptions are ADF, not Markdown.** `<!-- ... -->` is stored as _visible literal text_, not a hidden marker (confirmed on a live write). The managed section is therefore bounded by a **visible `---` divider + `## Refined Acceptance Criteria` heading**, which renders cleanly in Jira and still gives a reliable anchor for idempotent re-runs.

## Description block

Append this block to the **end** of the existing description, **preserving all original text above the divider**. The `---` rule + heading start the `/refine-ticket`-managed section, which runs to the end of the description.

```markdown
---

## Refined Acceptance Criteria

_Refined by /refine-ticket on YYYY-MM-DD — managed section; the reporter's original request is preserved above the divider, and re-running replaces everything from the divider down._

Feature: <feature>

- AC 1: <one behavior, real user, explicit signal, location, concrete data>
- AC 2: ...
```

Keep the byline **plain** — no backticks / inline-code inside the italic; the Markdown→ADF round-trip mangles italic that wraps a code span.

## Idempotent-update rule

Before writing:

1. Search the current description for a `## Refined Acceptance Criteria` heading.
2. **If found** → the managed section runs from that heading (and the `---` divider immediately above it, if present) to the **end of the description**. Replace that whole span with the new block. Do not duplicate.
3. **If not found** → append `\n\n---\n\n` + the block to the end of the existing description.

Never modify text **above** the divider — that is the reporter's original content. (Anything below the divider is the managed section and is replaced on re-run; tell users to keep their edits above it.)

## Audit comment

After the description write succeeds, post one comment via `addCommentToJiraIssue`:

```
Refined by /refine-ticket on YYYY-MM-DD — N acceptance criteria hardened (see the "Refined Acceptance Criteria" section). Run /from-issue <KEY> to generate tests.
```

## If the user declines write-back

Do **not** call `editJiraIssue` or `addCommentToJiraIssue`. Emit the full block above in the session so the user can paste it manually. Report that no Jira changes were made.

## Dry-run

When invoked with `dry-run`, perform every step EXCEPT the two MCP writes; print the block and the audit-comment text that _would_ be posted.
