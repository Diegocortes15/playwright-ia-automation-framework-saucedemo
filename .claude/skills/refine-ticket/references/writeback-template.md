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
