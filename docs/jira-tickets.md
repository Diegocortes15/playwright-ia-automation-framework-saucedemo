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

## Don't want to hand-author all this?

Run `/refine-ticket SW-123` first — it scores the ticket against exactly these tips, fills the gaps with you (using what's already automated + app docs + anything you point it at), and writes the hardened acceptance criteria back to the ticket. Then run `/from-issue SW-123`. See [`refine-ticket.md`](refine-ticket.md).

## What happens next

The skill generates tests on branch `SW-123-<feature>` (key-first, per [ADR-0012](adr/0012-from-issue-conventions.md)), opens a GitHub PR, and the GitHub-for-Jira app links the PR onto the ticket. The PR is the review gate. Re-running a ticket that already contributed to a spec refuses (see [ADR-0010](adr/0010-from-issue-augment-mode.md)); the skill augments the existing spec when a _new_ ticket extends a feature.
