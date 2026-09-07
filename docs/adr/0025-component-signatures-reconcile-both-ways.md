# 0025 — Component signatures reconcile in both directions, and nesting is declared

**Date:** 2026-09-06
**Status:** Accepted. Scopes [ADR-0008](0008-custom-skills-pattern.md) (a skill's `references/` are a contract, so a stale one is a defect, not documentation drift) and applies [ADR-0023](0023-json-via-typed-fs-loader.md)'s rule to a skill: the invariant is machine-checkable, so a machine checks it.
**Enforced by:** `.claude/skills/scaffold-page-object/scripts/check-component-signatures.sh`, called by that skill's workflow Step 4. It exits 1 on either direction of mismatch and prints the offending file or row. Both of its failure modes are verified against injected mismatches, not assumed.

## Context

`/scaffold-page-object` Step 4 compared two sources by eye: the canonical component list (`src/components/*.ts`) and the signature table in the skill's `references/component-detection.md`. It aborted when a component file had no row. Two things went wrong with that, and neither was noticed for months because the skill was never executed in between.

**`BurgerMenu.ts` landed 2026-06-03** (`1ca64a9`, SW-11) and no row was ever added. Step 4 runs _before_ the page is opened, so the comparison is page-independent: the skill aborted on **every invocation, against any URL**, for three months. The `references/` file was even edited in that window — 2026-09-04's portability refactor (`83ede0c`) — and the missing row still went unseen, because the check that would have caught it was a sentence telling a human to compare two lists.

**`ProductCard` and `SortDropdown` rows outlived their files.** Both components were deleted 2026-05-24 (`63fae8e`, `755b4a9`) during the blank-slate experiments; their rows stayed. The comparison was one-directional, so nothing looked for a row without a file. Worse, the doc's own prose cited one as real — _"The `ProductCard` row above is for exactly this case"_ — and a run that detected `[data-test="inventory-item"]` would have composed `@components/ProductCard` and emitted a Page Object that does not compile.

Underneath both: **the rule contradicted the architecture.** `BurgerMenu` and `CartBadge` are both composed by `Header` at nesting depth 2 (ADR-0001 rule #11) and neither is ever detected standalone. `CartBadge` passed only because someone happened to give it a row plus a prose aside. There was no way to say "this component is real but is not part of the detection set", so the honest answer for a nested component was indistinguishable from an omission.

## Decision

- **Reconcile in both directions.** A component file with no row is an error; a row with no component file is an error. Both abort Step 4 before the page is opened.
- **Nesting is declared, not implied.** A nested component keeps a row — that is what makes its omission detectable — and writes `Nested` in the Root signature column instead of a selector. The script reports it as `nested:` and holds it out of the detection set that Step 7 searches for. A Page Object composes the parent; never a nested component directly.
- **A script does the reconciling, not prose.** Step 4 calls `check-component-signatures.sh` and reads its exit code. The script's stdout _is_ the detection set, so Step 7 consumes a computed list rather than re-deriving one.

## Consequences

- The skill can run again. It could not, for three months.
- Deleting a component now forces the row to go with it, or the next scaffold run fails loudly at the cheapest possible moment — before a browser is launched.
- The detection set is data flowing between steps instead of a judgment repeated at each one.
- The script reads a repo path (`src/components/`) from inside a skill directory. That does not violate [ADR-0019](0019-skill-portability.md), which constrains markdown links, not runtime paths — and `from-issue/scripts/typecheck-spec.sh` already reads the repo's `tsconfig.json`. A skill lifted into another repo needs its own `src/components/` either way.
- This is not a CI gate, consistent with the Bloque A decision to drop skill linting from CI. It runs at the moment of use, which is strictly better for this invariant: CI would only catch it when the skill files change, and the `BurgerMenu` break came from a change to `src/components/` instead.

## Alternatives considered

- **Give `BurgerMenu` a real signature row.** Rejected: its root selector is `#react-burger-menu-btn`, the same selector `Header`'s signature already keys on, and `Header`'s row already lists the burger menu among the elements to skip. It would be detected twice and composed at the wrong level.
- **Drop the nested components from the table entirely and exempt them in prose.** Rejected — that is the `CartBadge` treatment, and it is what made `BurgerMenu`'s omission invisible. An exemption that lives in prose cannot be distinguished from a mistake.
- **Leave Step 4 as a prose instruction and just fix the three rows.** Rejected. The rows were wrong for three months _with_ the prose instruction in place. CLAUDE.md requires an `Enforced by:` that is real, and ADR-0023 exists precisely because a decision with no check drifted for three and a half months.
- **Make it a CI gate on `.claude/skills/**`.** Rejected: a path filter on the skill directory would not have fired, because the breaking change was adding a file to `src/components/`. See the Bloque A alternatives in `docs/roadmap-post-oct-2026.md` for why skill gates in CI were dropped at this scale.
