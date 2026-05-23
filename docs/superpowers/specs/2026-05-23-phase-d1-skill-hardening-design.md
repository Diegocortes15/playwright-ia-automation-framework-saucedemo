# Phase D.1 — Skill Hardening (Design Spec)

**Date:** 2026-05-23
**Status:** Draft — awaiting review
**Phase:** D.1 (skill hardening, docs-only). Driven by Phase 1 of the `experiment-rebuild-from-scratch` empirical findings. D.2 (automatic refactoring) is a separate phase deferred for safety design.

## 1. Goal & Scope

### Goal

Make implicit and emergent behaviors of `/from-issue` and `/scaffold-page-object` EXPLICIT in reference documentation. Zero behavioral changes to skill output — the docs catch up to what the skills already do, plus codify three quality principles (F.I.R.S.T., Playwright best practices, senior QA SDET analysis) that should be applied during test generation.

The motivation came from running `/from-issue 7` on the `experiment-rebuild-from-scratch` branch (PR #8, closed): the skill handled gaps G1 (fixture registration) and G5 (no Page Name field) by leveraging undocumented capabilities — reading code comments as instructions, best-effort-parsing GWT scenarios, inferring pages from AC text. These behaviors WORKED but their reliance on accidental affordances (especially comments-as-instructions) is fragile.

### What this IS

- 3 NEW reference docs (`test-principles.md`, `playwright-conventions.md`, `qa-analysis.md`) that consolidate quality principles the skill applies during generation
- 5 modifications to existing skill files that document already-occurring behaviors and add registration of the new docs
- 1 new ADR-0009 with a narrow rule about where skill behavior must live (in references, not code comments)
- Verification by re-running the Phase 1 experiment after D.1 ships and confirming the comments-as-instructions risk is removed

### What this IS NOT

- **Not behavioral changes.** The skill's runtime output (generated tests, PR bodies, file edits) stays IDENTICAL. We document what it already does + give it more rules to consult.
- **Not automatic refactoring (item 8).** That's D.2 — significant capability with high blast radius (modifies multiple existing files atomically), needs its own brainstorm.
- **Not new validation checks.** No post-generation lint step. Reference-docs-only approach (per the doc-vs-check decision in brainstorming).
- **Not a re-spec of `/from-issue`.** Existing C.2.a/b/c decisions stand; we're filling in implicit gaps, not rewriting.
- **Not retroactive.** Existing committed tests stay valid; we don't regenerate them. Future generated tests benefit from the hardening.

## 2. Decision Log

1. **Fixture-update responsibility moves to `/scaffold-page-object`.** When a new Page Object is scaffolded, that skill (not `/from-issue`) registers it in `src/fixtures/test.ts`. Cleaner SRP: `/scaffold-page-object`'s job is "create a Page Object that's READY TO USE"; registration is part of being ready-to-use. `/from-issue` stays focused on test generation.

2. **`qa-analysis.md` is a new separate doc.** Different concern from bucket-classification (which is about test categorization) and smoke-policy (which is about marking critical tests). QA analysis is about deciding WHAT TESTS TO CREATE from the AC text. Different stage warrants different doc.

3. **ADR-0009 is narrow.** Specific rule: skill behaviors that the AI relies on MUST live in `.claude/skills/<name>/references/*.md`, NOT in code comments. The fixture comment fragility (discovered in Phase 1 experiment) is the cautionary tale. Future skill design moves any "instructive" comments into ref docs.

4. **Reference-docs-only approach (no post-generation checks).** Principles like F.I.R.S.T. / SOLID / QA judgment require LLM judgment, which is what the skill is already doing. Post-generation validation would add latency without solving "if the skill generated bad code, will it self-correct?" Defense in depth via reviewer in PR.

5. **QA analysis can skip/merge/split ACs autonomously.** Per brainstorming decision. The skill surfaces every merge/split/skip in the PR body's "What I understood" + AC coverage table. Reviewer pushes back if disagree (edit file in PR; same model as bucket/smoke).

6. **Playwright conventions lifted in-doc.** `playwright-conventions.md` cites https://playwright.dev/docs/best-practices but reproduces the rules in-doc so the skill doesn't need WebFetch at runtime.

7. **Anti-pattern galleries in every new doc.** Each of the 3 new docs has a "X violations and rewrites" section showing concrete saucedemo-flavored examples. LLMs learn from contrast better than rules alone (consistent with bucket-classification.md's worked-examples pattern).

8. **"Notes for reviewer" becomes a defined PR section.** `pr-description-template.md` gains an optional section between Verification and Collision warnings, used when the skill made side-effect changes or LLM-judgment calls the reviewer might disagree with. Skill emitted this ad-hoc in PR #8 — now codified.

9. **Cross-references between new docs.** `test-principles.md` and `playwright-conventions.md` cross-reference each other (overlap on "no waitForTimeout" etc.). All 3 new docs link back to the workflow Step where they're consulted.

10. **No new content in CLAUDE.md.** All 9 file touches stay within `.claude/skills/`, `docs/adr/`, and `docs/`. CLAUDE.md is already at 129 lines (under the 150 cap); D.1 doesn't grow it.

## 3. Architecture

### File touchpoints

| File                                                              | Change                                   | Why                                                                                                                                                                                                     |
| ----------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/skills/from-issue/references/test-principles.md`         | **NEW**                                  | F.I.R.S.T. principles (Fast, Isolated, Repeatable, Self-validating, Timely) with compliant + non-compliant examples. LLM consults during Step 7 (render test file). ~70-90 lines.                       |
| `.claude/skills/from-issue/references/playwright-conventions.md`  | **NEW**                                  | Playwright best practices lifted from playwright.dev/docs/best-practices: locator preference order, web-first assertions, isolation patterns, anti-patterns. LLM consults during Step 7. ~80-100 lines. |
| `.claude/skills/from-issue/references/qa-analysis.md`             | **NEW**                                  | Senior QA SDET judgment: when to MERGE / SPLIT / SKIP ACs. LLM consults during Step 4 (LLM normalization). ~70-90 lines.                                                                                |
| `.claude/skills/scaffold-page-object/references/workflow.md`      | Add Step 11.5, renumber existing 12 → 13 | Documents fixture-update side effect; moves from accidental-via-`/from-issue` to explicit.                                                                                                              |
| `.claude/skills/from-issue/references/workflow.md`                | Modify Step 4 (add 3 subsections)        | Documents fallback parsing (GWT, free-form), page inference, and wires `qa-analysis.md`.                                                                                                                |
| `.claude/skills/from-issue/references/pr-description-template.md` | Add defined "Notes for reviewer" section | Codifies the ad-hoc section the skill emitted in PR #8.                                                                                                                                                 |
| `.claude/skills/from-issue/SKILL.md`                              | Add 3 lines to References section        | Registers the 3 new docs.                                                                                                                                                                               |
| `docs/adr/0008-custom-skills-pattern.md`                          | Add 2-3 line cross-reference to ADR-0009 | Discoverability — ADR-0008 readers learn about the contracts-in-refs rule.                                                                                                                              |
| `docs/adr/0009-skill-contracts-in-references-not-comments.md`     | **NEW**                                  | Narrow ADR: skill behaviors live in `.claude/skills/<name>/references/`, not code comments. ~40-50 lines (Nygard template).                                                                             |

**Total: 3 new + 5 modifications + 1 new ADR = 9 file touches.** Comparable scope to C.2.b/c. Zero changes to `src/`, `tests/`, `playwright.config.ts`, `package.json`, env, CLAUDE.md, GitHub Issue Template.

### Content structure for the 3 new reference docs

#### `test-principles.md`

```
# Test Principles (F.I.R.S.T.) Reference

[Intro: what F.I.R.S.T. is, why generated tests should comply, link to workflow Step 7]

## Principles

### Fast
[Target <5s per test; favor API/setup over UI clicks when possible]

### Isolated
[Each test creates own state; no shared setup beyond fixtures; tests pass in any order]

### Repeatable
[No Math.random() without seed; no time-of-day assertions; no flaky waits]

### Self-validating
[Every test ends with expect(...); no manual interpretation; clear pass/fail]

### Timely
[For this skill: test specs ship in the same PR as the code change they verify]

## Anti-pattern gallery

[3-4 saucedemo-flavored examples of tests that VIOLATE F.I.R.S.T., with rewrites]

## When in doubt

[Prefer Isolated and Self-validating; the other 3 are less likely to be violated by AI generation]

## See also

- [`playwright-conventions.md`](playwright-conventions.md) — overlap on "no waitForTimeout"
```

#### `playwright-conventions.md`

```
# Playwright Conventions Reference

[Intro: link to playwright.dev/docs/best-practices, note rules are lifted in-doc for offline reference]

## Locator preference order

1. getByRole(...) with accessible name
2. getByLabel(...) / getByText(...)
3. [data-test="..."]
4. CSS / XPath (last resort)

[Each tier has rationale + when to use it]

## Assertion rules

- Always use web-first auto-retrying assertions
- No if (locator.isVisible()) — use await expect(...).toBeVisible()
- No await page.waitForTimeout(...) (already lint-enforced)

## Test structure

- Arrange / Act / Assert blocks
- One logical assertion per test
- Setup via fixtures, not beforeAll

## Anti-patterns

[3-4 examples: raw Locator in test, manual sleep, no assertion, testing 3rd-party site]

## Page Object rules

[Methods are verb phrases (clickLogin(), fillUsername()), not getters returning Locator]

## See also

- [`test-principles.md`](test-principles.md) — F.I.R.S.T. overlap
- [`bucket-classification.md`](bucket-classification.md) — categorization happens after these conventions
```

#### `qa-analysis.md`

```
# QA Analysis Reference

[Intro: drives Step 4 of /from-issue workflow. NOT bucket classification (bucket-classification.md). NOT smoke selection (smoke-policy.md). Upstream of both.]

## What QA analysis means here

[Senior QA SDET judgment = adaptive analysis of ACs that decides WHAT TESTS TO CREATE, not 1:1 with AC count]

## Three types of analysis decisions

### MERGE multiple ACs into one test

[When ACs share setup + flow but assert different outcomes → parameterized test]
[3-4 worked examples with rationale]

### SPLIT one AC into multiple tests

[When one AC contains compound behaviors → separate tests]
[3-4 worked examples with rationale]

### SKIP an AC

[When AC is non-automatable, out of scope, or already covered by another AC's test]
[3-4 worked examples with rationale]

## When in doubt

[Default = create one test per AC (the conservative path). Only merge/split/skip when the case is clear.]

## Reviewer override

[If reviewer disagrees, they edit the generated tests directly in the PR. Skill doesn't re-run on same issue.]

## PR surface

[Every merge/split/skip MUST surface in PR body's "What I understood" + AC coverage table]
```

### Cross-reference network after D.1

```
SKILL.md (from-issue)
   ├─→ workflow.md
   │      ├─→ test-template.md (Step 7)
   │      ├─→ pr-description-template.md (Step 12)
   │      ├─→ bucket-classification.md (Step 6)
   │      ├─→ smoke-policy.md (Step 6)
   │      ├─→ qa-analysis.md (Step 4) ← NEW
   │      ├─→ test-principles.md (Step 7) ← NEW
   │      └─→ playwright-conventions.md (Step 7) ← NEW
   └─→ (all 3 new docs listed in References section)

SKILL.md (scaffold-page-object)
   └─→ workflow.md
          ├─→ page-object-template.md (Step 9)
          ├─→ component-detection.md (Step 4)
          └─→ Step 11.5: register page in src/fixtures/test.ts (NEW behavior, documented inline)
```

## 4. Modifications to existing files (detailed)

### `.claude/skills/scaffold-page-object/references/workflow.md` — add Step 11.5

After existing Step 11 (Isolated typecheck), before Step 12 (Report what landed):

````markdown
### 11.5. Register the page in `src/fixtures/test.ts`

Edit `src/fixtures/test.ts` to register the newly-scaffolded Page Object as a fixture so tests can destructure it from the `test()` args.

1. Read `src/fixtures/test.ts`.
2. Verify the page isn't already registered (look for `<pageName>: <PageName>` in the `Pages` type or fixture map).
3. If unregistered:
   - Add `import { <PageName> } from '@pages/<PageName>';` to the imports
   - Add `<pageName>: <PageName>;` to the `Pages` type
   - Add to the `test.extend<Pages>({...})` block:
     ```ts
     <pageName>: async ({ page }, use) => { await use(new <PageName>(page)); },
     ```
4. If already registered: skip the edit and report it in Step 12.

Naming: `<pageName>` is the camelCase form of `<PageName>` (e.g., `LoginPage` → `loginPage`).

**If `src/fixtures/test.ts` doesn't exist** (early scaffolding scenarios): abort with: _"`src/fixtures/test.ts` not found. The framework's fixture file is required. Restore from git or run framework bootstrap first."_
````

Then renumber the existing Step 12 to Step 13.

### `.claude/skills/from-issue/references/workflow.md` Step 4 — add 3 subsections

After the existing Step 4 content (AC normalization), add:

```markdown
#### Free-form / GWT body handling

The Issue Template at `.github/ISSUE_TEMPLATE/to-be-automated.yml` produces a structured body with `### Feature`, `### User Story`, `### Acceptance Criteria`, etc. headings. If the issue body uses a non-template format (e.g., free-form Given/When/Then scenarios, no headings, or partial structure), the skill should best-effort parse:

- Extract the **Feature** field from any heading or first line that looks like a feature name
- Look for Acceptance Criteria in any list/bullet form, regardless of `### Acceptance Criteria` heading
- Recognize GWT-style scenarios (`Given... When... Then...`) as ACs, one scenario = one AC candidate
- If parsing fails entirely (no recognizable ACs anywhere), abort with: _"Couldn't extract ACs from issue body. Ask the reporter to refile using the `to-be-automated` template."_

#### Page inference from AC text

The Issue Template does NOT include a Page Name field (removed in commit `fcc39e9` to support multi-page features). Extract Page Names from AC text by:

- Scanning each AC for mentions of UI surfaces ("from the LoginPage", "on the cart page", "checkout overview", etc.)
- Mapping each mention to a PascalCase Page Object name (e.g., "login page" → `LoginPage`, "cart page" → `CartPage`)
- Building a set of unique Page Names referenced across all ACs

If zero pages can be inferred: abort with: _"Couldn't infer any Page Object references from the AC text. Ask the reporter to mention UI surfaces explicitly (e.g., 'from the LoginPage', 'on the checkout overview')."_

#### Wire QA analysis (NEW)

Before producing the per-test records (Step 6), apply senior QA SDET judgment to the extracted ACs per [`qa-analysis.md`](qa-analysis.md):

- Identify ACs to MERGE (shared setup + parameterized variants)
- Identify ACs to SPLIT (compound behaviors that should be separate tests)
- Identify ACs to SKIP (non-automatable, out of scope, redundant)

Each merge/split/skip decision must be surfaced in the PR body's "What I understood" + AC coverage table (per `pr-description-template.md`'s normalized AC list).
```

### `.claude/skills/from-issue/references/pr-description-template.md` — add "Notes for reviewer" section

Between the existing "Verification" and "Collision warnings" sections in the Template:

```markdown
## Notes for reviewer

(omit this section entirely if no notes)

- ⚠️ **Side effect:** the workflow modified `<file>` to make the generated test runnable. Verify the change is reasonable.
- 📝 **LLM judgment:** AC X and AC Y were MERGED into one parameterized test because both share the same setup + flow with different inputs. Reviewer: push back if you want them split.
- 📝 **LLM judgment:** AC Z was SKIPPED because it duplicates AC W's coverage. Reviewer: push back if you want both generated.
```

Add a Rule in the Rules section:

```markdown
- **Notes for reviewer**: include this section ONLY when the skill made side-effect file changes OR LLM-judgment calls (merge/split/skip per qa-analysis.md) that the reviewer might disagree with. Each note is a bullet starting with an emoji marker (⚠️ for side effects, 📝 for judgment calls). If the workflow produced no side effects and no merge/split/skip decisions, OMIT this section entirely.
```

### `.claude/skills/from-issue/SKILL.md` — add 3 References lines

After the existing `references/` entries:

```markdown
- [`references/test-principles.md`](references/test-principles.md) — F.I.R.S.T. principles for generated tests (D.1)
- [`references/playwright-conventions.md`](references/playwright-conventions.md) — Playwright best practices the skill follows (D.1)
- [`references/qa-analysis.md`](references/qa-analysis.md) — Senior QA SDET judgment: merge/split/skip ACs (D.1)
```

### `docs/adr/0008-custom-skills-pattern.md` — cross-reference ADR-0009

Add at the end (after existing content):

```markdown
## Related

- [ADR-0009](0009-skill-contracts-in-references-not-comments.md) — mandate that skill behaviors live in `references/`, not in code comments
```

### NEW `docs/adr/0009-skill-contracts-in-references-not-comments.md`

```markdown
# 0009 — Skill contracts must live in `references/`, not in code comments

**Status:** Accepted
**Date:** 2026-05-23

## Context

During Phase 1 of the `experiment-rebuild-from-scratch` empirical test (PR #8), the `/from-issue` skill correctly updated `src/fixtures/test.ts` to register a newly-scaffolded LoginPage as a fixture. This worked because `src/fixtures/test.ts` contained a comment intended for human developers:
```

// Pattern when adding a page (manual step today — see GAPS.md):
// 1. import { LoginPage } from '@pages/LoginPage';
// 2. add `loginPage: LoginPage` to the Pages type
// 3. add a fixture entry: loginPage: async ({ page }, use) => { ... };

```

The LLM read this comment as instructions and followed them. Functional success, but the skill's effective behavior is now implicit (driven by code comments) and fragile: if the comment is removed, refactored, or contradicts another rule, the skill's behavior changes silently.

## Decision

Skill behaviors that the AI relies on MUST live in `.claude/skills/<skill-name>/references/*.md`. Code comments in `src/`, `tests/`, `data/`, or any other application directory MUST NOT contain instructions intended for AI consumption.

If a code comment exists today that the AI relies on (the fixture comment is the known case), that behavior MUST be migrated into the appropriate skill reference doc. The code comment can then be removed without changing skill behavior.

## Consequences

**Positive:**
- Skill contract surface is well-defined: references/ is the source of truth
- Code comments stay focused on human readers
- Skill behavior changes happen via PR to the skill, not via PR to unrelated code
- Future skill maintainers know where to look

**Negative:**
- Slight duplication risk: a pattern explained in code comments AND in references/ can drift
- Migration cost: existing instructive comments need to be moved (small one-time cost)

## Verification

After D.1 ships, the `src/fixtures/test.ts` comment that drives `/scaffold-page-object`'s registration behavior MUST be REMOVED. Re-running `/from-issue` on a fresh blank-slate branch must still produce a working test — proving the behavior is now driven by `references/scaffold-page-object/workflow.md` Step 11.5, not the comment.

## Related

- [ADR-0008](0008-custom-skills-pattern.md) — custom skills pattern
- Phase D.1 spec — `docs/superpowers/specs/2026-05-23-phase-d1-skill-hardening-design.md`
```

## 5. Failure Modes & Edge Cases

### Failure modes for D.1 itself (docs-only phase, low surface area)

| Failure                                                                   | Behavior                                                                                                                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| New reference doc has a typo or broken link                               | Caught by `npm run format:check` (prettier) + manual review during PR.                                                                         |
| ADR-0009 cross-reference in ADR-0008 broken                               | Caught by reviewer during PR.                                                                                                                  |
| `/scaffold-page-object` Step 11.5 conflicts with existing fixture content | Step 11.5 documents the merge pattern (read first, check for existing registration, skip or append).                                           |
| `playwright-conventions.md` contradicts existing CLAUDE.md rule           | Resolved during PR review. CLAUDE.md wins (always-loaded source of truth); new doc updates to match.                                           |
| `qa-analysis.md` ambiguity rules conflict with `bucket-classification.md` | Resolved during PR review. QA analysis is upstream (Step 4); bucket classification is downstream (Step 6) — they shouldn't logically conflict. |

### Skill output stays identical

D.1 makes implicit behaviors explicit. No skill runtime changes. Existing committed tests stay valid. Re-running `/from-issue 7` after D.1 should produce IDENTICAL output to PR #8 (except for the explicit "Notes for reviewer" section appearing in the PR body when warranted).

### Critical verification step

The ADR-0009 verification clause is the load-bearing test: after D.1 ships, REMOVE the fixture comment from `src/fixtures/test.ts`. Run a fresh `/from-issue` invocation. The skill MUST still register the page in fixtures (driven by `/scaffold-page-object` Step 11.5, not the comment). If this works: hardening is validated. If it fails: ADR-0009's rule didn't get applied correctly — fix the gap.

## 6. Verification & Success Criteria

### Verify D.1 worked

1. **All 9 file touches landed correctly** — `npm run format:check` + manual review confirm
2. **Cross-references resolve** — every link in the 3 new docs + 5 modifications points at a real file/anchor
3. **Re-run Phase 1 experiment** on a fresh `experiment-rebuild-from-scratch-v2` branch (or same branch with the LoginPage + fixture changes reverted):
   - Did the skill produce the same quality of generated test as PR #8? ✅
   - With the fixture comment REMOVED from `src/fixtures/test.ts`, did the skill still register the page? ✅ (proves ADR-0009 is in effect)
   - Did the QA analysis decisions surface clearly in the PR body's "Notes for reviewer"? ✅
   - Did the generated tests visibly follow F.I.R.S.T. + Playwright conventions? ✅

All four ✅ = D.1 validated.

### Success metric

The implicit-behaviors-become-explicit test: re-running Phase 1 with the fixture comment removed produces equivalent output. This is the proof.

## 7. Deferred to Later Phases

| Concern                                                                                                               | Phase                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Automatic refactoring** (item 8: detect patterns across multiple pages, extract components, refactor existing code) | **D.2** — needs separate brainstorm focused on triggers, safety, blast radius                                                             |
| **`/refine-acs` skill** (pre-generation AC refinement)                                                                | Deferred pending experiment friction data (decision from earlier conversation)                                                            |
| **`/customize-for-new-app` bootstrap skill**                                                                          | Path B work — requirements being collected via REQ-XXX in GAPS.md on experiment branch                                                    |
| **`/scaffold-component` skill**                                                                                       | Surfaced as Phase 4 prediction; needs concrete trigger                                                                                    |
| **Post-generation validation checks**                                                                                 | Rejected for D.1 (reference-docs-only approach). Revisit if drift becomes systemic                                                        |
| **Multi-page refactor of /from-issue Steps 4-7**                                                                      | G5 deferred — skill already handles multi-page via emergent capability per PR #8 evidence. Revisit if multi-page issues consistently fail |
| **Post-D.1 health check script** (scan for instructive comments in src/, tests/)                                      | Could be a small D.1.5 follow-up if useful                                                                                                |

## 8. Open Questions (not blocking D.1; capture for paper trail)

1. **Should `test-principles.md` and `playwright-conventions.md` cross-reference each other on overlap?** F.I.R.S.T.'s "Fast" partly overlaps with Playwright's "no waitForTimeout" guidance. Plan to add a one-line "See also" link in both directions.
2. **Does `qa-analysis.md` need worked examples for EACH bucket type (Positive/Negative/Edge)?** Adds ~15 lines but improves classification consistency across bucket interactions. Probably yes for the initial doc.
3. **Should the post-D.1 health check be automated as a pre-commit hook?** Out of scope for D.1 itself.

---

## Summary

D.1 makes the implicit explicit. Three new reference docs codify quality principles (F.I.R.S.T., Playwright best practices, senior QA SDET judgment). Five modifications to existing skill files document already-occurring behaviors (fixture-update side effect, free-form/GWT parsing, page inference, "Notes for reviewer" PR section, references registration). One new ADR-0009 mandates that skill contracts live in `references/`, not code comments — with the Phase 1 fixture comment as the cautionary tale.

Zero behavioral changes. The skill output stays identical. The verification proof is removing the fixture comment and confirming the skill still works (driven by ADR-0009's `/scaffold-page-object` Step 11.5 contract).

D.2 (automatic refactoring) and other deferred items wait for separate brainstorms once D.1 is shipped and validated.
