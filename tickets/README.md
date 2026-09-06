# Local ticket files

Input for `/from-issue --from-file <path>`. **Jira remains the real ticket source**
(ADR-0011); these exist so the pipeline can be exercised without a live Atlassian
connection, and so changes to `/from-issue` can be tested without burning a real ticket.

## Format

Front matter carries the two fields Jira would supply as `key` and `summary`. Everything
after it is the **description, verbatim** — exactly what you would paste into Jira, following
`docs/jira-tickets.md`. So a file here doubles as a draft of a ticket not yet created.

```markdown
---
key: SW-901
summary: [SW][QA][Inventory] Cart badge reflects items added
---

Feature: inventory

Scenario 1: ...
```

## What a file-sourced run does differently

Exactly three things (workflow Step 2); everything else is identical:

1. The generated spec's `// Source:` line names this file, never a Jira URL.
2. `.tcms/records` gets `"jira": []` — there is no ticket to link.
3. The PR body says it came from a local file, and the GitHub-for-Jira link won't appear.

## The fixtures here

| File                             | Exercises                                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SW-901-inventory-cart-badge.md` | The happy path: a clean, automatable AC                                                                                                                                            |
| `SW-902-problem-user-sort.md`    | The **app-versus-AC** branch of ADR-0020 — its AC contradicts documented app behaviour, so a correct run must stop and report a defect rather than weaken the test until it passes |

`SW-902` is expected to **fail on purpose**. A run that produces a green PR for it is a bug
in the gate, not a success. Keys are in the 900 range so they cannot collide with real
project tickets.
