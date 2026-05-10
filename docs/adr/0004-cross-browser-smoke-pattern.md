# 0004 — Cross-Browser Smoke Pattern (firefox + webkit on standard user only)

**Date:** 2026-05-10
**Status:** Accepted

## Context

The framework targets a multi-browser future, but a naive expansion of "every user × every browser" yields 5 × 3 = 15 Playwright projects. Most browser-specific bugs live in the framework's interaction code (locator strategies, keyboard/mouse simulation), NOT in saucedemo's per-user behaviors (those bugs are saucedemo's, not the browser's).

We needed a cross-browser strategy that catches real engine differences without paying for redundant coverage.

## Decision

**Smoke pattern.** chromium runs the full 5-user matrix as before. Add two new projects: `firefox-standard` and `webkit-standard`, both running ONLY the standard user's tests (the same grep as the chromium standard project).

Total: 7 chromium projects (`setup`, `no-auth`, 5 users) + 2 cross-browser smoke projects = **9 projects, 62 test instances**.

## Consequences

- Real browser engine differences (locator behavior, navigation timing, form interaction) are caught without re-running saucedemo's per-user bugs three times
- CI time stays reasonable (~3-5 min) instead of tripling
- Adding a new browser = add 1 new `<browser>-standard` project, not N×B
- A future "deeper cross-browser coverage" decision (e.g., cross-browser checkout regression) is additive — pin specific tests with new tags
- An AI agent that proposes "add `firefox-problem` and `webkit-error`" should be redirected to this ADR — those projects re-validate broken-by-design saucedemo behavior

## Alternatives considered

- **Full per-user × per-browser matrix (15 projects)** — rejected: 90%+ of those runs verify the same things; CI time triples for marginal coverage
- **Cross-browser only on a tiny `@smoke` tag (3-4 tests)** — rejected: smaller smoke set, less confidence; the standard-user grep already gives a balanced subset
- **No cross-browser** — rejected: leaves real engine differences uncaught until they manifest as production user reports
