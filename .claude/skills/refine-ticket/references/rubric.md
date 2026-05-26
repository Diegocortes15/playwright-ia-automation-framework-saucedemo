# Refinement Rubric — what "bulletproof" means

`/refine-ticket` scores the ticket against the checklist below. **Each unmet item is a "gap"** the workflow must close (auto-resolve from a source, or ask the user — see [`workflow.md`](workflow.md)). A ticket is **bulletproof when zero gaps remain open** — i.e. `/from-issue` would have nothing left to infer.

Score the **whole ticket** (Feature + every AC). Treat each AC independently for items 2–8.

## The checklist

1. **Feature** — a single snake_case slug is present (e.g. `Feature: login`). Drives `tests/<feature>/`. Gap → infer from the summary/subject and confirm with the user.
2. **One behavior per AC** — no compound "X and Y". Gap → split into separate ACs.
3. **Real user role** — each AC names the actor (e.g. `standard_user`, `locked_out_user`). Validate against `data/` users / `docs/app/users.md` when present. Gap → ask which user, or default and record the assumption.
4. **Explicit pass/fail signal** — each AC has an observable, deterministic outcome: a URL, an exact message string, or an element state. No "works", "looks good", "is correct". Gap → ask for the concrete signal; confirm real strings against the live app / Page Objects where possible.
5. **Location** — each AC says _where_ it happens ("on the inventory page", "in the cart"), mapping to an existing or scaffoldable Page Object. Gap → ask which surface.
6. **Concrete data** — literal values or a named scenario, not "some product". Gap → ask for values, or reference a `data/` scenario.
7. **Bucket coverage** — Positive / Negative / Edge considered for the feature; call out missing buckets (per [`../../from-issue/references/bucket-classification.md`](../../from-issue/references/bucket-classification.md)). Gap → propose the missing negative/edge AC for the user to accept or decline.
8. **Automatable** — flag manual-only ACs (visual aesthetics, subjective copy) per [`../../from-issue/references/qa-analysis.md`](../../from-issue/references/qa-analysis.md). Gap → recommend marking the AC out of automation scope.
9. **Coverage (lightweight flag)** — does the AC overlap something already automated? Heuristic match of the AC's behavior against existing test titles + `tests/<feature>/` files. This is a **flag, not a blocker** ("AC2 looks already covered by `tests/login/login.spec.ts` — drop or confirm"). Degrades gracefully: nothing automated → never fires. (`/from-issue` still dedupes at generation time per [ADR-0010](../../../../docs/adr/0010-from-issue-augment-mode.md); this surfaces it earlier, to the human.)

## Worked example

**Raw AC:** "User can log in and it works."

| Item | Gap?                                            |
| ---- | ----------------------------------------------- |
| 3    | No user named → which of the six users?         |
| 4    | "it works" has no signal → what proves success? |
| 5    | No location → which page confirms login?        |

**After resolution:** "AC: `standard_user` logging in with `secret_sauce` lands on the inventory page (URL `/inventory.html`)." — items 3/4/5 now satisfied; gap count for this AC → 0.

## What is NOT in the rubric (YAGNI)

- No semantic coverage matrix — item 9 is a heuristic flag only.
- No estimation, priority, or sprint fields — automation-readiness only.
