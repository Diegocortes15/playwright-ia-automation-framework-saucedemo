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
