# 0017 — TCMS sync at merge, whole-suite, hybrid linkage (scopes ADR-0016)

**Date:** 2026-05-29
**Status:** Accepted. Extends [ADR-0016](0016-tcms-mirror.md): the mirror becomes whole-suite and authoritative **at merge**, not per-ticket at PR creation.

## Context

ADR-0016 pushed one ticket's tests from `/from-issue` at PR-creation time. That mutates Qase before review — a **rejected PR leaves Qase drifted** (phantom creates/updates/deprecations). It also never covered the pre-existing suite, delete/archive, regression grouping, the automated flag, or multi-project results.

## Decision

- **Mutate at merge.** `/from-issue` writes a committed `.tcms/records/<KEY>.json` artifact (no Qase calls). A merge-only, gated, fail-safe CI step runs `npm run tcms:sync`, which does the authoritative create/update/archive. A rejected/closed-unmerged PR never touches Qase.
- **Whole-suite, records-driven.** One Qase case per logical test under `Regression › feature › context › bucket`, marked automated, deduped across projects (passed iff every project passed), expected = the record's AC text.
- **Hybrid linkage.** Find-or-create by suite-path + title (no hand-pasted IDs, so a dangling-ID blank run cannot happen), with an auto-written `qase-map.json` (test → case id) as the lookup/audit/delete index. (Rejected: the official Qase reporter — pinned mode recreates manual-ID tedium and does not write IDs back; auto-create is fragile and lacks the lifecycle features.)
- **Archive, not delete (best effort).** Orphaned cases are removed via `DELETE /case/{code}/{id}` — the only removal mechanism Qase's REST API exposes (no non-destructive deprecate/archive flag on a case was found during the live probe). The map drops the entry. If Qase later exposes an archive flag, switch to it.

## Consequences

- Qase always reflects merged code; PR rejection is a no-op for Qase.
- Rich AC-text expected results survive the at-merge model via the records artifact.
- Needs `QASE_API_TOKEN` + `QASE_PROJECT_CODE` as GitHub Actions secrets (the sync self-skips until added). The committed `qase-map.json` is the authoritative link index.
- Out of scope (later phases): PR-time read-only audit + preview + run link (L2); Jira comment with PR + run links (L3); optional `qase.id` pinning.

## Alternatives considered

- **PR-time push (ADR-0016 model):** mutates Qase on rejected PRs; no whole-suite coverage; no archive/dedup lifecycle. Superseded by this ADR.
- **Official Qase reporter:** pinned mode recreates manual-ID tedium and does not write IDs back; auto-create is fragile and lacks lifecycle features (archive, dedup across projects). Rejected.
- **No committed map (pure find-or-create):** every sync pays a full suite scan; no audit/delete index; can't detect orphans. Rejected.
