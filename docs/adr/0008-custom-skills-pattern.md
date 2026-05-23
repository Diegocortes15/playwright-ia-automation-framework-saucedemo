# 0008 — Custom Project-Specific Skills Pattern

**Date:** 2026-05-15
**Status:** Accepted

## Context

Phase B.2 vendored the `@playwright/cli` skill into `.claude/skills/playwright-cli/` — a third-party skill that gives Claude browser-control capabilities (see [ADR-0006](0006-playwright-cli.md)). Phase C.1 introduces the first **project-specific** custom skill: `/scaffold-page-object` — a higher-level intent that the framework itself cares about. Subsequent Phase C work (C.2 `/from-issue` orchestrator, C.3 catalog expansion) will add more such skills. We need to lock in a conventional file layout, naming, and `allowed-tools` pattern now so future skills follow predictable structure.

## Decision

**Custom project skills live under `.claude/skills/<skill-name>/` and follow this structure:**

- `SKILL.md` — compact frontmatter (`name`, `description`, `allowed-tools`) + brief intro + pointer to `references/`
- `references/workflow.md` — the detailed procedural steps the skill follows
- `references/<other>.md` — any additional reference docs (templates, lookup tables, detection signatures)

The `SKILL.md` body stays small (always-loaded for skill discovery) and points at on-demand reference files for verbose detail. Frontmatter `allowed-tools` enumerates exactly the tool families the skill needs. This mirrors the directory structure of the vendored `playwright-cli` skill from Phase B.2 (same `SKILL.md + references/` shape), while keeping the `SKILL.md` body compact — in contrast to the vendored skill's generated inline command reference.

## Consequences

- C.2/C.3 skills follow the same layout — predictable for both humans and AI extending the project
- Skill descriptions stay scannable in `/skills` output (compact `SKILL.md`)
- Verbose workflow content doesn't bloat skill-discovery context
- Each skill is self-contained in its own subdirectory — no cross-skill dependencies by convention
- The `allowed-tools` frontmatter caps each skill's surface area — explicit deny-by-default
- Adding a new skill = `mkdir .claude/skills/<name>/`, write `SKILL.md` + `references/workflow.md`, optionally add other reference docs

## Alternatives considered

- **Single `SKILL.md` with everything inline** — rejected: as workflows get longer (12+ steps), the always-loaded skill discovery context grows uncomfortably
- **Code-based skills (TypeScript or Python)** — rejected: procedural prose is simpler for AI to follow; matches Phase B.2's vendored skill pattern; no build step
- **Shared `references/` across skills** — rejected: each skill is independent; shared references create coupling without clear benefit at current scale

## Related

- [ADR-0009](0009-skill-contracts-in-references-not-comments.md) — mandates that skill behaviors live in `references/`, never in code comments
