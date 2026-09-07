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

## What goes in a ticket, and what stays in the repo

The skills write into tickets in two places — `/refine-ticket`'s acceptance-criteria block, and a
bug-report draft a person files after a blocked run. Both are read by people who may have no
access to this repository, so the line is about the reader, not about secrecy.

**Name the tooling. Gloss it once.** A ticket should say which skill produced an artifact, because
that changes how the reader weighs it: repro steps extracted from a test's own `test.step` names
are not the same evidence as steps somebody performed by hand, and a reader who does not know
which they are reading will mis-attribute a repro that fails. Write it so it explains itself —
`drafted by the suite's bug-report tooling (/report-bug)`, not a bare `/report-bug`.

**Never cite an ADR in a ticket.** `Per ADR-0024` means nothing to a developer without this repo,
and it is internal governance rather than product information. When an ADR's consequence matters
to the reader, state the consequence in product language and drop the citation. The one that
comes up most often:

> ~~Per ADR-0024, the blocked test lands annotated `test.fail()`.~~
>
> An automated regression test for this defect is already committed, currently marked as an
> expected failure. **When you fix this, remove that mark in the same pull request.**

That is a definition-of-done item the person fixing the defect genuinely needs; the ADR number is
not.

**The asymmetry is deliberate.** References from the repo _into_ a ticket are load-bearing — a
spec's `// Source:` header, a `.tcms/records/` entry's `jira` array, a branch named key-first —
because that traceability is the point. References from a ticket _out_ to an ADR pay nothing back.

## What happens next

The skill generates tests on branch `SW-123-<feature>` (key-first, per [ADR-0012](adr/0012-from-issue-conventions.md)), opens a GitHub PR, and the GitHub-for-Jira app links the PR onto the ticket. The PR is the review gate. Re-running a ticket that already contributed to a spec refuses (see [ADR-0010](adr/0010-from-issue-augment-mode.md)); the skill augments the existing spec when a _new_ ticket extends a feature.

## Drafting without Jira

The same description can live in a file and be fed straight to the skill:

```bash
/from-issue --from-file tickets/SW-901-inventory-cart-badge.md
```

The file's front matter carries `key` and `summary`; everything after it is the description
in exactly the form documented above. That makes a file both a way to run the pipeline
without a live Atlassian connection and a place to draft a ticket before creating it. See
`tickets/README.md` — and note that a file-sourced run deliberately produces no Jira link,
because there is no ticket to link to.
