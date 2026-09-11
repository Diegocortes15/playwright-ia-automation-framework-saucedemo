# 0029 — Cross-browser is reachable in CI, on demand only (supersedes ADR-0027)

**Date:** 2026-09-10
**Status:** Accepted. Supersedes [ADR-0027](0027-cross-browser-opt-in.md).
**Confidence:** High for the mechanism, which was measured end to end before this was written. Lower for the cadence question this record deliberately leaves open: whether a manual lever is enough, or whether an engine deserves a schedule of its own, is a question only a real escape can answer.
**Review by:** — (no shelf life; the trigger below is an event, not a date)
**Enforced by:** `scripts/run-suite.sh` — a run whose `GITHUB_EVENT_NAME` is `schedule` and whose browser is not `chromium` exits **66** and runs nothing, so the cadences cannot drift onto other engines even if the workflow is edited. `playwright.config.ts` still hides the Firefox and WebKit projects unless `CROSS_BROWSER=1`, which ADR-0027 established and this record keeps.

## Context

ADR-0027 implemented cross-browser and made it opt-in, then recorded as a consequence: _"CI is unchanged and stays chromium."_ That sentence was true when written and is now false. Leaving it standing is the exact failure [ADR-0023](0023-adrs-need-enforcement.md) exists to prevent, so it is superseded rather than quietly outgrown.

What changed is not the evidence, and this record should not pretend otherwise. **ADR-0027's trigger has not fired.** No defect has escaped through an engine difference, and the framework still points at a demo. The change is a request: a QA needs to run the suite on Firefox or WebKit after a hotfix, or at the end of a sprint, without a local checkout and without waiting for someone with the repository cloned. That is a workflow gap, not new evidence about engines, and naming it honestly is the point of writing this down.

## Decision

The scheduled cadences stay chromium. A **manual dispatch** of `regression.yml` may choose `chromium`, `firefox`, `webkit` or `all`, combined with either suite, and the result reports to Slack the same way every other run does.

Two things make "scheduled runs stay chromium" true rather than merely intended. The workflow's gate job resolves the engine in an explicit branch instead of leaning on a schedule's empty input, and `scripts/run-suite.sh` refuses the combination outright with exit 66. The second is the one that holds if someone edits the first.

## Consequences

- **The engine → project mapping lives in one script**, `scripts/run-suite.sh`, which both CI and a local QA call with the same two arguments. A mapping duplicated between a workflow and an npm script is a mapping that drifts, and the `qase:smoke` / `qase:regression` scripts now delegate to it rather than restating it.
- **`all` means every project, 239 tests against chromium's 83.** It passes no `--project` filter, which is how it picks up the chromium per-user projects alongside the four cross-browser ones. The job's timeout scales with the choice: 20 minutes for chromium, 40 for one other engine, 60 for `all`.
- **Chromium is installed even for a WebKit run.** The `setup-<user>` projects declare no `use`, so they authenticate on Playwright's default engine, and `firefox-standard` depends on `setup-standard`. A run that installed only WebKit dies in its own dependency. This was not obvious and is the kind of thing a later reader will otherwise rediscover the hard way.
- **The browser cache key includes the engine selection.** With a single key, the first chromium-only run populates the cache and every later Firefox run gets a cache hit and then downloads Firefox anyway, forever, because `actions/cache` only saves on a miss.
- **"Regression on Firefox" is not the whole regression**, and the wording in the dispatch UI cannot fix that. Cross-browser is standard-user-only by ADR-0027's guardrail, inherited from ADR-0004, so an engine covers its `-no-auth` and `-standard` projects and nothing else. The `problem_user` and `error_user` contexts stay chromium. Anyone reading "REGRESSION (webkit) passed" in Slack should read it as "the standard and no-auth contexts passed on WebKit".
- **A latent defect surfaced and is fixed here.** `formatEnvironmentLine` hardcoded `Chromium`, so the environment line reported the Chromium version to Slack, to the Qase run description and to the HTML report header regardless of what ran. A WebKit run would have claimed Chromium 147 in the one place a reader goes to find out what executed. The line now names the engines it was given, and a unit test pins it. The feature did not cause that bug; it made it reachable, which is the usual way this kind of thing is found.
- **The report's engine chips say what the run _could_ use, not what `--project` filtered to.** The config must not read `argv` — ADR-0027's own rejected alternative explains why, at length — so a cross-browser run lists all three engines in the header. Claiming more precision than that would be a lie no worker process could back up.
- **Qase run titles gain the engine** (`REGRESSION · WEBKIT`), and artifact names gain it too, so a WebKit report cannot overwrite a chromium one. Chromium stays unsuffixed, which leaves every existing run title and every label already in Qase intact.
- **A partial run writes false `absentSince` marks into `.observations/observations.json`**, and this record makes partial runs easy to ask for. The absence signal's guard is feature-granular (ADR-0021), so a nine-test smoke run on WebKit marks observations from the features it touched as absent when they were merely not exercised. Measured while verifying this change: a local `npm run suite -- smoke webkit` dirtied that tracked file with seventeen such marks. CI is unaffected, because it uploads the file rather than committing it. Locally, discard the change after a partial run; do not commit it. Narrowing the guard to the specific tests a run executed is the fix, and it belongs to ADR-0021, not here.
- **Trigger to revisit:** the first defect that escapes through an engine difference. That still argues for a _scheduled_ cross-browser cadence, which this record does not create. A manual lever answers "let me check" and does not answer "tell me when it breaks".

## Alternatives considered

- **A separate workflow per engine** — rejected. Three files that differ in one word share a gate, a Slack step, a cache strategy and every future fix to any of them. One dispatch input carries the same information.
- **Adding the engine as a second scheduled cadence** — rejected for now, on ADR-0027's reasoning, which is untouched by this change: the cadences exist to catch regressions in the application, and re-running them on three engines triples the minutes to re-check the same application. The trigger above is what would change it.
- **Six npm scripts (`qase:smoke:firefox` and friends)** — rejected. The matrix is suite × engine and grows by multiplication, while one script taking two arguments grows by addition. `npm run suite -- smoke firefox` is the local form.
- **Letting a schedule choose an engine, guarded only by the input's default** — rejected. An input default is a UI convenience, not a constraint; anyone editing the default would silently change what every cron spends. Hence exit 66.
- **Encoding the schedule pin as a `check-adr-invariants.mjs` text assertion** — rejected. The guard in `run-suite.sh` refuses the run itself, which is strictly stronger than a lint asserting that a line of YAML still reads a certain way, and a check whose subject is another check is one indirection past useful.
