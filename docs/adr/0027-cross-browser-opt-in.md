# 0027 — Cross-browser is implemented, and opt-in (supersedes ADR-0004)

**Date:** 2026-09-08
**Status:** Superseded by [ADR-0029](0029-cross-browser-on-demand-in-ci.md) on the CI question only — its _"CI is unchanged and stays chromium"_ consequence is now false, because a manual dispatch may choose an engine. Everything else here stands, including the opt-in mechanism, the standard-user-only guardrail it inherited from ADR-0004, and the `argv` finding. Supersedes [ADR-0004](0004-cross-browser-smoke-pattern.md).
**Confidence:** High — the suite was run on both engines before this was written. What would change it: an engine difference that only a per-user matrix could catch, which would reopen the guardrail rather than this record.
**Review by:** — (no shelf life; the trigger below is an event, not a date)
**Enforced by:** `playwright.config.ts` — the Firefox and WebKit projects are absent from the project list unless `CROSS_BROWSER=1`, so a default run cannot include them, and `npx playwright test --list` proves it in one command.

## Context

ADR-0004 decided the cross-browser shape in May and was never implemented. It said _"Add two new projects: `firefox-standard` and `webkit-standard` … Total: 9 projects, 62 test instances."_ The repository has had **5 projects and no Firefox or WebKit** ever since, while `CLAUDE.md`, `docs/roadmap-post-oct-2026.md` and ADR-0014 all cite ADR-0004 as the reason cross-browser **stays out** — the opposite of what it decided.

Its `Enforced by:` line guarded the rejected alternative (no per-user × per-browser matrix) rather than the decision it made, so nothing ever noticed. It sat `Accepted` and false for four months, which is longer than the ADR-0005 episode this project's own ADR README tells as its cautionary tale.

Its Context is stale too: _"chromium runs the full 5-user matrix"_ describes a world ADR-0014 replaced with demand-driven growth. There are two users today.

## Decision

**Implement Firefox and WebKit, and make running them a choice rather than a default.**

- `npm test` stays **chromium only**. The default cost of a test run does not change.
- Four projects appear when `CROSS_BROWSER=1` is set: `firefox-no-auth`, `firefox-standard`, `webkit-no-auth`, `webkit-standard`. `npm run test:firefox`, `test:webkit` and `test:cross` set it.
- Any scope still applies: `npm run test:firefox -- --grep "@smoke"` runs nine tests in about eleven seconds.

**The guardrail ADR-0004 established survives and is the part everyone was actually citing:** only the standard user goes cross-browser. Engine differences live in _our_ interaction code — locators, keyboard and mouse simulation, navigation timing — not in saucedemo's per-user bugs, so re-running `problem_user` on three engines buys nothing. An agent proposing `firefox-problem` or `webkit-error` should still be turned away.

**Both of the standard user's contexts are mirrored**, which is where this departs from ADR-0004's naming. A Firefox smoke run that omitted `@no-auth` would omit logging in, and logging in is the single most valuable thing to check on another engine.

## Consequences

- The full standard + no-auth suite **passes on both engines**: 79 tests on Firefox in ~45s and 79 on WebKit in ~31s, against 83 on chromium in ~25s. That question was open for four months; it is now answered.
- **Its first real use immediately earned its keep**, which is the strongest argument in this record. One WebKit run in five failed `every product price is formatted with a leading dollar sign` against a short product list, while the same test passed in isolation every time. `InventoryPage.goto()` returned as soon as the document loaded, and ten tests in that feature read a list on the very next line; chromium had simply always won that race. The wait now lives in the Page Object, so readiness is a property of the page rather than a discipline each test remembers.
- **Every one of the seven Page Objects has that same shape** — `goto()` navigates and returns, waiting for nothing. Only `InventoryPage` is fixed here, because only it has actually failed, and the others have never run anywhere but chromium so "no flake yet" is weak evidence rather than none. `LoginPage` in particular must not gain a naive wait: its `goto(path)` variant is used by route-guard tests that _expect_ a redirect away from the target. The trigger is the next page that flakes.
- Honest about the proof: five clean WebKit runs after the fix do not demonstrate that a one-in-five flake is gone. The mechanism is identified and addressed, and that is what the confidence rests on.
- Firefox and WebKit must be installed (`npx playwright install firefox webkit`) — about 175 MB. A run without them fails with Playwright's own "Executable doesn't exist" message, which names the fix.
- CI is unchanged and stays chromium. Whether a project pays for another engine on every pull request is a project's call, and this framework is a template.
- **Trigger to revisit:** the first defect that escapes through an engine difference, or the day this framework points at a real application rather than a demo. Either makes the case for putting `test:cross` in CI.

## Alternatives considered

- **Always-on Firefox/WebKit projects (ADR-0004 as written)** — rejected. It doubles the default run for engines most changes never touch, and a cost paid on every run is a cost people route around. Opt-in keeps the capability without the tax.
- **Detecting `--project=firefox-…` from `process.argv` instead of an env var** — implemented, then removed after it failed at runtime. Playwright re-evaluates this config **inside every worker process**, and a worker's argv does not carry the parent's `--project`. The projects existed in the main process, listed correctly, began running, and then every test died with `Project "firefox-no-auth" not found in the worker process`. An env var propagates to workers; argv does not. The bare command now fails immediately instead, naming the available projects.
- **A per-user × per-browser matrix** — still rejected, for ADR-0004's original reason.
- **Editing ADR-0004 to say what is true** — rejected: this project supersedes rather than edits. ADR-0004 keeps its text and gains a `Superseded by` line.

## References

- [ADR-0004](0004-cross-browser-smoke-pattern.md) — superseded; its guardrail survives here
- [ADR-0002](0002-multi-user-via-projects-storage-state.md) / [ADR-0014](0014-from-issue-harness-growth.md) — the data-driven project matrix this extends
