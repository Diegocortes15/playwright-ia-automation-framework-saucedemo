# Architecture Decision Records

[Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions). Start from `0000-template.md`. Every record declares **`Enforced by:`** — the lint rule, test, config or script that makes it true, or `Nothing — prose only`. If a decision states something a machine can check, write the check (ADR-0023 exists because one didn't).

**Never edit an accepted ADR.** Reversing a decision means a new record that supersedes it; narrowing one means a record that scopes it.

## The budget, and how to count against it

`docs/roadmap-post-oct-2026.md` principle #4 says a mature framework has **10–20 ADRs in its whole life**. That number is a local convention — it is not from Nygard or any other source this repo cites — and taken literally it contradicts the same principle's "never edit, always supersede" rule, which manufactures records mechanically.

**So count only originating decisions against it.** Records that exist because the supersede rule demanded them are not discretionary and do not compete for the budget.

|                                   | Count  |
| --------------------------------- | ------ |
| Total records                     | **26** |
| Superseding / scoping / extending | 8      |
| **Originating decisions**         | **18** |

Eighteen is inside the range; twenty-six is not. Keep the table current when you add one — the point of writing the number down is that the next person can see it before they add the twenty-seventh, which is exactly what nobody could do before.

## Index

| #    | Decision                                                      | Relationship           |
| ---- | ------------------------------------------------------------- | ---------------------- |
| 0001 | Page Object Model by Component                                |                        |
| 0002 | Multi-user via Playwright Projects + storageState + role tags |                        |
| 0003 | Hybrid data layout with typed loaders                         |                        |
| 0004 | Cross-browser smoke pattern (deferred)                        |                        |
| 0005 | ESM import attributes for JSON                                | **Superseded by 0023** |
| 0006 | Playwright CLI for AI application inspection                  |                        |
| 0007 | gh CLI for GitHub operations (no GitHub MCP)                  |                        |
| 0008 | Custom project-specific skills pattern                        |                        |
| 0009 | Skill contracts live in `references/`, not code comments      |                        |
| 0010 | `/from-issue` augment mode                                    |                        |
| 0011 | Jira as the ticket source                                     |                        |
| 0012 | `/from-issue` branch / commit / PR conventions                |                        |
| 0013 | `/refine-ticket` writes refined ACs back to Jira              | scopes 0011            |
| 0014 | `/from-issue` grows the harness autonomously                  |                        |
| 0015 | Spec tags via Playwright's `{ tag }` option                   |                        |
| 0016 | Optional one-way TCMS mirror (Qase)                           |                        |
| 0017 | TCMS sync at merge, whole-suite                               | scopes 0016            |
| 0018 | Qase runs are opt-in; merge sync is catalog-only              | scopes 0017            |
| 0019 | Skills are portable artifacts                                 | scopes 0008            |
| 0020 | `/from-issue` never opens a red PR                            | scopes 0012            |
| 0021 | Runtime observations: record what nobody asserted on          |                        |
| 0022 | Every first-party skill reports the obstacles it hit          |                        |
| 0023 | JSON loads through a typed fs loader                          | **supersedes 0005**    |
| 0024 | A blocked test lands as `test.fail()`, on human approval      | extends 0020           |
| 0025 | Component signatures reconcile in both directions             | scopes 0008            |
| 0026 | A file-sourced run produces no artifacts                      | scopes 0016 / 0017     |
