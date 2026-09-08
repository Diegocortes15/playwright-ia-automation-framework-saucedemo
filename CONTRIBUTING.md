# Contributing

Conventions for pull requests in this repository. They are written down so they travel — the point is that the next project starts with them instead of discovering them.

> This file was a placeholder until 2026-09-08, and it named its own trigger: _"when the project formalizes a PR/code-review process beyond the current AI workflow."_ That is what this is.

---

## Why the title matters here specifically

This repository **squash-merges**, so a pull request's title becomes the permanent commit message on `main`:

```
d7b97db docs(roadmap): discard the flake hunt — the system already announces one (#77)
89e787f fix(tcms): a flaky test was recorded as a failure (#76)
```

A vague title is not a review-time inconvenience. It is the history.

## Title format — Conventional Commits

Follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>
```

The spec defines `feat` and `fix` and recommends the rest from the Angular convention. Types used here, counted across the first 62 merged pull requests:

| Type       | Used | For                                      |
| ---------- | ---- | ---------------------------------------- |
| `feat`     | 26   | a new capability                         |
| `docs`     | 13   | documentation only                       |
| `fix`      | 10   | a defect corrected                       |
| `ci`       | 5    | workflows, gates                         |
| `chore`    | 3    | housekeeping with no behaviour change    |
| `test`     | 3    | tests added or changed, no source change |
| `refactor` | 1    | behaviour unchanged, structure improved  |
| `style`    | 1    | formatting only                          |

A scope is optional and **must be a noun naming a part of the codebase** — `fix(tcms):`, `feat(cross-browser):`. Breaking changes take a `!` (`feat(api)!:`) or a `BREAKING CHANGE:` footer.

**Audited 2026-09-08: 62 of 62 merged pull requests already comply.** This section records a practice that exists; it does not introduce one.

## Branch names

Two shapes, and only one of them is a preference.

**`<type>/<short-slug>`** — for anything a person starts. Same type vocabulary as the title:

```
fix/observations-absence-signal
docs/readme-tldr-and-mcp-rationale
```

**`SW-<n>-<feature>`** — for anything `/from-issue` generates, and this one is **load-bearing, not style**. The GitHub-for-Jira app builds the pull-request ↔ ticket link from the issue key in the branch name. Rename it and the ticket loses its link.

## The rule no standard covers

**Name the change, not its position in a plan.**

A branch called `docs/bloque-e` was renamed to `docs/readme-tldr-and-mcp-rationale` mid-review, because "Bloque E" means something only inside this repository's roadmap — and nothing at all to a reader six months later, or to anyone else. The same applies to titles: `close Bloque C` sits on `main` permanently and explains nothing on its own.

If a title or branch needs a second document to be understood, it is the wrong title.

Renaming a branch on GitHub **closes its open pull request** rather than retargeting it, so this is cheaper to get right the first time than to fix.

## Why there is no CI gate on this

There are actions that reject a non-conforming title, and this repository deliberately runs none.

62 of 62 already comply with **zero enforcement**. A gate here would guard something that has never failed, which is the same reasoning that rejected a CI gate for skill portability ([ADR-0019](docs/adr/0019-skill-portability.md)) and dropped a flaky-test reporter that would have reported nothing 200 times.

**The trigger to add one:** a second regular contributor. Conventions that survive on one person's habit stop surviving the moment there are two.
