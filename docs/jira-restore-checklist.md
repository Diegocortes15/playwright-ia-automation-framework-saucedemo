# Checklist — first session after Jira access is back

Access to the free Jira instance was lost to inactivity on 2026-09-05 and re-requested.
Everything below is blocked on it. Nothing here is speculative: each item exists because a
change was shipped without ever being observed running.

**The honest state:** four ADRs (0019–0022) were designed and merged without `/from-issue`
being executed once this session. They were reasoned from the code, not from watching the
pipeline work. This checklist is how that debt gets paid.

---

## 0. Reconnect (blocking — do first)

- [ ] Run `/mcp` in an **interactive** Claude Code session and complete the Atlassian OAuth.
      A non-interactive session cannot run the flow.
- [ ] Confirm the MCP answers: ask for `mcp__atlassian__getAccessibleAtlassianResources`,
      then read any ticket with `mcp__atlassian__getJiraIssue`.
- [ ] Confirm the `SW` project and its tickets survived the lapse. If they did not, recreate
      2–3 from `docs/jira-tickets.md` before going further — several items below need a real,
      unrefined ticket to be meaningful.

## 0.5 You can start before Jira returns

`--from-file` reads a ticket from disk, so everything downstream of the ticket read can be
exercised now. Two fixtures ship in `tickets/`:

- [ ] `/from-issue --from-file tickets/SW-901-inventory-cart-badge.md` — the happy path.
      Expect a green PR, `"jira": []` in the TCMS record, and a `// Source:` line naming the
      file rather than a browse URL.
- [ ] `/from-issue --from-file tickets/SW-902-problem-user-sort.md` — **the branch that has
      never fired.** Its AC asserts `problem_user` can sort, which `docs/app/users.md`
      documents as broken. A correct run stops and reports an app-versus-AC contradiction.
      **A green PR here is a bug in the gate, not a success.**

Only the ticket _read_ still needs Jira. Everything below is about the read itself, or about
behaviour that only a real ticket exercises.

## 0.7 Gaps found by actually running the pipeline

Both surfaced running `--from-file`, not by reading the code. Neither is fixed.

- [ ] **Provenance in AUGMENT mode is unspecified.** Workflow Step 2 says a file-sourced run
      writes `// Source: local file <path>`, but that header is rendered in Step 7, which only
      runs for CREATE-NEW. In AUGMENT the header belongs to the originating ticket and Step 8.5
      only appends `<KEY> (YYYY-MM-DD)` to `Augmented by:`. There is no specified place to record
      that a ticket came from a file. Decide: a suffix on that line, or accept the loss.
- [x] ~~**ADR-0020 says what NOT to do, not what to do.**~~ Closed by **ADR-0024**
      (2026-09-06): the test lands as `test.fail()` referencing the filed defect, applied
      only after a human decides — never by the agent. Recorded honestly that the
      human-approval half is unenforceable, and that a `test.fail()` test passes for _any_
      failure, not only the original one, which is why the annotation must name the bug.
- [ ] **A blocked run in AUGMENT mode leaves a committed spec dirty**, which blocks the next run
      (Step 1.5 requires a clean tree). Fine for CREATE-NEW — an untracked new file. Unspecified
      cleanup for AUGMENT.

## 1. Verify what was built blind

### ADR-0020 — the no-red-PR gate

The gate has never fired. It is the highest-risk change of the four: it is the one that
decides whether a PR exists at all.

- [ ] **Happy path.** Run `/from-issue <KEY>` on a clean ticket. Expect a green PR, and a
      `Fix attempts` line absent (first run green).
- [ ] **Forced failure.** Point a ticket at an element that does not exist, or temporarily
      break a Page Object method the ticket needs. Expect: 3 diagnosed attempts, then **no
      branch, no commit, no push, no PR**, and a report naming every file left on disk.
      _If a PR appears, the gate is broken and that is the top priority._
- [ ] **App-vs-code diagnosis.** Write a ticket whose AC contradicts real app behavior (e.g.
      assert the sort dropdown works for `problem_user` — it does not). Expect the run to
      **stop and report an app/AC contradiction**, not to weaken the test until it passes.
      This is the branch that protects real bug findings; it has never executed.
- [ ] Confirm the `typecheck-spec.sh` exit codes behave in a real run — especially 69, which
      should tell the user to `npm install` and stop, never consume a fix attempt.

### ADR-0022 — Obstacles encountered

- [ ] Confirm the section renders in the PR body **and** the terminal report, and that a
      clean run renders exactly `None.` rather than omitting it.
- [ ] Confirm it does **not** restate the assumptions block or the fix log.
- [ ] Watch for the failure mode the ADR admits: a section that comes back `None.` on a run
      that visibly hit friction. If that happens, the convention is not working as written —
      record it and reconsider rather than tightening the prose again.
- [ ] Run `/refine-ticket` and confirm obstacles reach the terminal and **never** the ticket.

### ADR-0021 — Observations

- [ ] Confirm `/from-issue` stages `.observations/<feature>.json` and that new entries show
      up in the PR diff.
- [ ] Triage the standing entries in `.observations/observations.json`. The 404s are already
      marked `ignored` (GitHub Pages `spa-github-pages` shim). Still open: the
      **`events.backtrace.io` 401s** — the app's own error-reporting telemetry is being
      rejected. Harmless on a demo; on a client app it would mean production error reporting
      is dead and nobody would notice, because the UI works fine either way. Decide and record.
- [ ] First ticket that legitimately needs `error_user`: confirm `/from-issue` wires it into
      `AUTH_USERS` per ADR-0014, and that the **dialog detector finally gets e2e coverage**
      (`error_user` + sort → `alert()`). It is unit-tested only today.

### ADR-0019 — Portability

- [ ] Run `skill-validator check .claude/skills/<name>` on all four and confirm still green
      after whatever the above changes.

## 2. Finish Bloque A

- [ ] **Step 2** — run `claude --debug` in the repo and read for silent skill-load errors.
      Must be run by the user; `claude` is not on PATH in the agent's shell.
- [ ] **Step 3** — audit each skill's `description` against 3–4 realistic phrasings of how
      the task would actually be asked. Needs an interactive session to test invocation for
      real. This is the last substantive item left in Bloque A (5–7 were dropped, ADR-0022
      alternatives records why).

## 3. Then, and only then, Bloque B

- [ ] **Step 9 — EARS in `/refine-ticket`.** The roadmap's own highest-ROI/lowest-effort
      item: acceptance criteria as `WHEN <condition> THE SYSTEM SHALL <behavior>`, which map
      near 1:1 onto `test('...')`. Do this _after_ section 1, so it is written against an
      observed pipeline rather than an imagined one.
- [ ] Step 10 — Given/When/Then as the mandatory spec structure.
- [ ] Step 11 — consolidate `AGENTS.md`.

---

## Temporary validation tests — DELETE WHEN NO LONGER NEEDED

Added 2026-09-05 to verify the observation detectors, three of which had shipped without
ever firing. They test the framework's instrumentation, not the application.

**To remove, in full:**

- [ ] `rm -rf tests/_framework_validation/`
- [ ] Remove the four `OBSERVATION_PROBE` / dialog entries from `.observations/observations.json`
- [ ] Remove the `test:instrumentation` script from `package.json`
- [ ] Nothing else references them. `src/observations/reporter.test.ts` is **not** part of
      this — those are permanent unit tests for the merge logic and should stay.

What they proved, so the cost of deleting them is known:

| Test                       | Verified                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| console-error detector     | Fires and records the message                                                                                               |
| page-error detector        | Records an uncaught exception thrown from a timer                                                                           |
| dialog detector            | Records `error_user`'s real `alert()` on sort, dismisses it, page stays usable                                              |
| `test.fail()` failure path | An observation raised before a failing assertion **survives** into the file — the case that matters most for failure triage |

Run them with `npm run test:instrumentation`. The script deliberately passes **no**
`--reporter` flag: that flag replaces the config's reporter list and silently drops
`ObservationsReporter`, so the run would write no `.observations/` file at all. Results land in `.observations/observations.json`;
read them with `npm run observations`.

Keep them until `/from-issue` has run end-to-end at least once; the observation pipeline has
no other coverage.

## Not blocked on Jira — can be done any time

- [x] ~~**Pin Node 22 for local dev.**~~ Done 2026-09-06: `.nvmrc`, an `engines` field of
      `22.x`, and `engine-strict=true` in `.npmrc` so npm refuses to install on the wrong
      major instead of only warning. Matches the `node-version: '22'` both workflows use.
- [x] ~~The files Prettier has always flagged on `main`.~~ Done 2026-09-06: formatted, and
      `npm run format:check` is now a CI gate beside typecheck and lint — they drifted for
      months precisely because nothing checked. `.observations/` is excluded in
      `.prettierignore`: it is machine-written by the reporter, not source.
- [ ] **Backfill `Enforced by:` across the existing ADRs.** ADR-0023 added the field to the
      template and ADR-0005 showed why it matters, but the other 21 records predate it. The
      audit is one line each, and the answer is often already true — no `waitForTimeout` and
      no XPath are lint rules, ADR-0004 is enforced by `playwright.config.ts` deriving its
      projects from `AUTH_USERS`. What matters is finding the ones that state a mechanical
      invariant with nothing checking it: those are the next ADR-0005.
- [ ] **`/from-issue` is now flagged for size.** `skill-validator` warns at 25,451 tokens of
      references; `workflow.md` alone is 9,966, up from 8,075 at the start of this work. Three
      additions did it: the fix loop (ADR-0020), Obstacles (ADR-0022), and `--from-file`. The
      warning is real — an agent loading several references in one session pays for all of it.
      The fix is roadmap item B12b: move procedure into `scripts/` where it is deterministic.
      `typecheck-spec.sh` proved it works; the base-branch preflight (Step 1.5) and the PR-body
      render (Step 12) are the next candidates.
- [ ] Roadmap item **B12b**: more `scripts/` extraction. One exists
      (`from-issue/scripts/typecheck-spec.sh`); the next candidates are the base-branch
      preflight (Step 1.5) and the PR-body render (Step 12). Apply YAGNI per candidate.
