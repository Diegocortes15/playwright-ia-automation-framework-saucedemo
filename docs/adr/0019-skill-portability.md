# 0019 — Skills are portable artifacts (scopes ADR-0008)

**Date:** 2026-09-04
**Status:** Accepted. Scopes [ADR-0008](0008-custom-skills-pattern.md): the compact-`SKILL.md` + verbose-`references/` layout stands, but a skill directory must now be **self-contained** — no markdown link may resolve outside it.

## Context

ADR-0008 assumed skills were project-scoped, so they cross-linked freely to `docs/adr/`, `docs/`, `.mcp.json`, `src/`, and to each other — 56 such links across the three first-party skills. That coupling makes a skill unusable when lifted out of this repo, which conflicts with the framework's goal of being a reusable template: someone should be able to take the scaffolding and bootstrap automation for a different app. Four of those links were also simply broken (three `../` where four were needed), silently degrading the agent when it tried to follow them.

## Decision

- **No outbound relative links.** A skill directory is the portability boundary. Every markdown link inside it must resolve within it.
- **ADR citations become plain text.** `[ADR-0012](../../../../docs/adr/0012-…md)` → `ADR-0012`. The constraint each ADR imposes was already stated inline at every call site; the link only carried provenance for a human reader. One absolute link to the origin repo's ADR index in each `SKILL.md` `## See also` preserves that in a single hop, and is the only outbound reference that remains.
- **Repo paths become backticked prose.** `docs/…`, `src/…` and `.mcp.json` are referenced as literal paths, not links — with the `## See also` anchor stating they are relative to the origin repo.
- **Cross-skill references become prose, never links, and never copies.** `/refine-ticket` still reuses `/from-issue`'s `references/bucket-classification.md`, `references/qa-analysis.md` and `references/smoke-policy.md`; it now names the path instead of linking it. Duplicating them was rejected — they encode the project's QA judgment and are the worst possible place for two versions to drift.
- **A skill is invoked by name, not by path.** `/scaffold-page-object`, never `../scaffold-page-object/SKILL.md`.

## Consequences

- The three first-party skills pass `skill-validator` clean; `/playwright-cli` (vendored) already did.
- Four broken ADR links disappeared as a side effect of the plain-text conversion.
- Provenance survives at one hop instead of zero. A reader inside the repo loses click-through to ADRs from skill files — accepted, since the rule is always stated inline anyway.
- Renaming the repo now touches 3 links instead of 45.
- `/refine-ticket` still cannot be lifted alone and function fully: it names files that live in `/from-issue`. The skills are portable as a set, and the prose reference makes that dependency explicit rather than structural.
- New skill content must not reintroduce outbound links. `skill-validator` catches it; it is run manually, not as a CI gate (see below).

## Alternatives considered

- **Absolute GitHub URLs for all ~45 doc links:** keeps click-through and is portable, but couples every skill file to the repo name (a rename is on the roadmap) and needs network access. Rejected in favor of plain text plus a single anchor.
- **Duplicate the shared references into `/refine-ticket`:** the only option that makes each skill independently liftable, but forks the QA-judgment criteria into two copies that will drift. Rejected.
- **Extract a fourth shared skill for the QA criteria:** has a genuine second consumer, so it does not violate YAGNI — but the consuming skills would still need an outbound reference, so it does not solve the portability problem it would be introduced for. Rejected.
- **Declare the three skills a bundle and keep the relative links:** zero work and reflects how they are actually used, but leaves the portability goal unmet and keeps the validator red. Rejected.
- **A CI gate enforcing this (skill-audit / skill-validator on every PR):** evaluated and rejected. Across ~4,200 lines of skill content the tooling surfaced four real defects — all broken links, all findable with `grep`. At this scale (one author, four skills, changing a few times a year) a gate is compliance theater. `skill-validator` is kept as a manual pre-handoff check; its token accounting is the part that earns its keep.
