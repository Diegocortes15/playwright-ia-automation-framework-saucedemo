# 0021 — Runtime observations: record what nobody asserted on

**Date:** 2026-09-04
**Status:** Accepted

## Context

A passing suite says only that the assertions held. It says nothing about what else the app did — console errors, 4xx/5xx responses, unexpected dialogs. Playwright already records all of it (`trace: 'on'`), and nobody ever reads it.

The gap is real and this framework demonstrates it: every navigation in the app under test returns **HTTP 404** with a `spa-github-pages` redirect shim, and the app then renders correctly via client-side routing. Fifty tests pass. Nobody would ever know. For monitoring, SEO, or any client that checks status codes, the app has a 100% error rate on deep links.

## Decision

- **Collect deterministically at runtime, report with the agent.** An auto-use fixture in `src/fixtures/test.ts` listens for console errors, uncaught page errors, 4xx/5xx responses, and dialogs. No LLM is in the detection path — it records facts and never judges them. This is the framework's authoring/runtime split applied to a new problem.
- **Fixture collects, reporter writes.** Tests run in parallel worker processes; several workers writing one file would corrupt it. The fixture attaches events to the test, and `ObservationsReporter` — a single writer in the main process — deduplicates and writes `.observations/<feature>.json`.
- **Deduplicate by signature; never filter.** Query strings are stripped so varying ids don't fork an entry, and identical occurrences collapse into one row with a count. Nothing is dropped, including third-party noise: in a real app a third-party 401 is often exactly what explains a failure. A `thirdParty` flag (request host vs. `baseURL` host — mechanical, not judged) keeps a 500 from your own API visually separate from a vendor's.
- **Never fail a test.** Every handler swallows its own errors and the reporter swallows its own I/O. An observation is a note, never a verdict. Making console errors fail tests is how a suite becomes flaky and resented; if that is ever wanted, it must be opt-in.
- **Triage is human and durable, and it buys quiet.** Each entry carries `status` (`new` → `triaged` / `ignored` / `filed:<KEY>`) and an optional `note`. Both survive re-runs; `grep '"status": "new"'` is the queue. Marking an entry `ignored` also stops it from annotating the Playwright report, so triage has a visible consequence instead of being bookkeeping. The record stays complete either way — only the annotation is suppressed.
- **Two artifacts, because one cannot serve both readers.** `.observations/<feature>.json` is a machine index — signatures, counts, triage state — built to deduplicate and to diff in git. `.observations/SUMMARY.md` is the same data as prose, regenerated every run, so "what did the app do?" is answered by reading a sentence instead of parsing a colon-delimited key. One template per kind, no LLM. The first version shipped only the JSON and called it human-readable; it was not.
- **Three layers of visibility, cheapest first.** The trace already carries raw console and network natively; the per-test attachment carries the full event list; report annotations carry a readable summary as chips under the test title, capped at five distinct entries with the rest collapsed into a "…and N more" line. Fifty tests each showing the same chip is wallpaper, which is what the `ignored` filter exists to prevent.
- **CI does not commit.** Scheduled runs upload the files and post a count to Slack. Committing is a human action, or `/from-issue` staging its own run's file — otherwise nightly runs would churn `main` with a commit per night.

## Consequences

- The first run against the app under test surfaced a real finding no test could have caught, which is the whole argument for the feature.
- The console listener skips `Failed to load resource` messages: the browser echoes every failed request there, and the response handler already records those with method, status and URL. Keeping both double-reported one event.
- Registering a dialog listener disables Playwright's automatic dismissal, so the handler dismisses the dialog itself to preserve default behavior. A test that wants to drive its own dialog registers its own handler; the fixture's dismissal is wrapped so whichever loses the race fails silently. No spec handles dialogs today.
- The fixture takes `page`, so it only observes the default page — a test driving a second context or popup is not covered. Acceptable now; revisit if multi-page tests appear.
- **Passing `--reporter=...` on the command line drops this reporter.** The flag replaces the config's reporter list, so the run produces no observations at all and the failure is silent. `/from-issue` Step 10 originally did exactly that. _(This corrects an earlier claim in this ADR that third-party requests resolving after a test ends were being missed — they are captured fine; the telemetry 401s were absent because the reporter had been overridden.)_
- `.observations/` is committed, so an observation showing up in a PR diff is a review signal on its own.

## Alternatives considered

- **Collect at scaffold time with `playwright-cli console` + `requests`.** Two commands, isolated in one skill, but `/scaffold-page-object` only runs when a Page Object is missing — as the framework matures it would almost never fire, and it would miss every scheduled regression run. Rejected.
- **Parse the Playwright traces after the run.** Same coverage as the fixture without touching `src/`, but the trace zip layout is not a public API and would break on Playwright upgrades. Rejected.
- **Fixture writes the file directly, no reporter.** Simpler, and wrong: parallel workers interleave writes. Rejected.
- **Allowlist third-party noise away.** The original proposal, rejected on the user's objection and rightly so: in a real app those records help explain failures. Deduplication plus a `thirdParty` flag solves the volume problem without hiding anything.
- **Fail tests on console errors.** Rejected as a default — it manufactures flakiness and trains people to ignore the signal.
- **File observations into Jira automatically.** Rejected: `/from-issue` deliberately does not write to Jira (ADR-0011), and auto-filing unverified findings is how an automation gets switched off.
