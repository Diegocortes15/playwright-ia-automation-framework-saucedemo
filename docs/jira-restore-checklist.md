# Checklist — first session after Jira access is back

Access to the free Jira instance was lost to inactivity on 2026-09-05 and re-requested.
Everything below is blocked on it. Nothing here is speculative: each item exists because a
change was shipped without ever being observed running.

**The honest state, updated 2026-09-07:** four ADRs (0019–0022) were designed and merged without
`/from-issue` being executed once. They were reasoned from the code, not from watching the pipeline
work. This checklist is how that debt gets paid — and **most of it now is.** Both critical branches
of the ADR-0020 gate have run against real Jira tickets: the happy path (SW-12 → PR #48, green on
the first attempt) and the app-versus-AC diagnosis (SW-13 → blocked, no PR, then landed as
`test.fail()` against SW-14 → PR #49).

The single biggest thing running it found had nothing to do with those ADRs:
**`/scaffold-page-object` had been aborting on every invocation since 2026-06-03** and nobody knew,
because it was never executed. Fixed in PR #47 with ADR-0025. That is the whole argument for this
checklist in one line.

---

## 0. Reconnect (blocking — do first)

> **Status 2026-09-06:** the site is confirmed alive — `/rest/api/3/serverInfo` answers with
> `deploymentType: Cloud`, so it was never deactivated. What remains is the OAuth reconnect,
> and it must happen in a **fresh** session: MCP connections are established at session start,
> so authorizing in one window does not retrofit into an already-running one. If Claude reports
> no `mcp__atlassian__*` tools, restart rather than re-authorizing.

- [x] ~~Run `/mcp` in an **interactive** Claude Code session and complete the Atlassian OAuth.~~
      Done 2026-09-06. A fresh session was indeed what it took.
- [x] ~~Confirm the MCP answers.~~ Done 2026-09-06 — and confirmed twice over: through a direct
      call, and through `/from-issue`'s own pre-authorized `allowed-tools` path (no prompt per run).
- [x] ~~**Confluence.**~~ **Not available**, established 2026-09-06: `getConfluenceSpaces` returns
      `404` on `/ex/confluence/<cloudId>/wiki/api/v2/spaces`, and the accessible-resource record
      declares only `read:jira-work` / `write:jira-work`. Whether the product is unprovisioned or
      the OAuth grant simply never requested the Confluence scopes is **not distinguishable from
      the API** — it needs a look at the Atlassian admin console. Either way `/refine-ticket`
      end-to-end stays blocked, now for a reason unrelated to Jira.
- [x] ~~Confirm the `SW` project and its tickets survived the lapse.~~ Done 2026-09-06: `SW-1`
      through `SW-11` all present, all `Done`. **But all eleven were already contributors** to a
      generated spec, so re-running any of them refuses (ADR-0010) and section 1 had no clean
      ticket to use. Three were created to unblock it: - **SW-12** — `product_detail`, a surface with no prior automation. Deliberately chosen to
      force CREATE-NEW _and_ the `/scaffold-page-object` composition. - **SW-13** — asserts `problem_user` can sort, which the app does not do. Labelled
      `validation-fixture`; the label is invisible to the skill (Step 2 captures only key,
      summary and description) and visible to a person. - **SW-14** — the defect SW-13's run found, filed on approval so the `test.fail()`
      annotation had an identifier to name (ADR-0024).

## 0.5 You can start before Jira returns

`--from-file` reads a ticket from disk, so everything downstream of the ticket read can be
exercised now. Two fixtures ship in `tickets/`:

- [x] ~~`/from-issue --from-file tickets/SW-901-inventory-cart-badge.md` — the happy path.~~
      Ran green and produced **PR #46**, which was then **closed unmerged on 2026-09-06** — see
      "The `--from-file` TCMS contradiction" below. It could not be merged without breaking the
      merge build, which is a finding rather than a failure of the run.
- [x] ~~`/from-issue --from-file tickets/SW-902-problem-user-sort.md` — **the branch that has
      never fired.**~~ **Superseded by a better test.** That branch fired on 2026-09-06 against a
      **real Jira ticket** (SW-13), which is strictly stronger evidence than the file fixture would
      have been: only Step 2 differs between the two paths, and the Jira path was the one never
      exercised. The run stopped and reported the contradiction with 0 fix attempts. See §1.

Only the ticket _read_ still needs Jira. Everything below is about the read itself, or about
behaviour that only a real ticket exercises.

### `tickets/` is not scratch — do not delete it

Considered and rejected on 2026-09-07. The two fixtures look like leftovers now that SW-13 exists,
but three things depend on them:

- **[ADR-0024](adr/0024-blocked-test-lands-as-expected-failure.md)'s Context cites the SW-902 run**
  as the concrete case that motivated the whole decision. ADRs are superseded, never edited, so
  deleting the file leaves an ADR citing something that does not exist — the exact defect the
  `/from-issue` citation audit was cleaning up ("a citation that cannot be followed is worse than
  none").
- **`--from-file` is a shipped feature** (#42), still documented in `from-issue/SKILL.md`,
  `references/workflow.md` and `docs/jira-tickets.md`. `tickets/README.md` plus these two files are
  its only worked examples.
- **The `--from-file` TCMS contradiction is still undecided** (see §0.7). These fixtures are the
  test material for whichever way it goes.

Also worth correcting a natural assumption: **SW-901's content is not in Jira.** SW-902's became
SW-13, but SW-901 was the cart-badge scenario, and PR #46 closed unmerged — so that file is the
only place its acceptance criteria now exist.

## 0.7 Gaps found by actually running the pipeline

Both surfaced running `--from-file`, not by reading the code. Neither is fixed.

- [x] ~~**Provenance in AUGMENT mode is unspecified.**~~ **Largely dissolved by ADR-0026** (2026-09-07): a file-sourced run now commits nothing, so the `Augmented by:` line it would have written never enters the repository and there is no provenance to lose. The generated file still sits on disk for inspection, where the run's own report names the source. Left here rather than deleted because the original text below explains the shape of the problem: Workflow Step 2 says a file-sourced run
      writes `// Source: local file <path>`, but that header is rendered in Step 7, which only
      runs for CREATE-NEW. In AUGMENT the header belongs to the originating ticket and Step 8.5
      only appends `<KEY> (YYYY-MM-DD)` to `Augmented by:`. There is no specified place to record
      that a ticket came from a file. Decide: a suffix on that line, or accept the loss.
- [x] ~~**ADR-0020 says what NOT to do, not what to do.**~~ Closed by **ADR-0024**
      (2026-09-06): the test lands as `test.fail()` referencing the filed defect, applied
      only after a human decides — never by the agent. Recorded honestly that the
      human-approval half is unenforceable, and that a `test.fail()` test passes for _any_
      failure, not only the original one, which is why the annotation must name the bug.
- [ ] **A blocked run in AUGMENT mode leaves committed files dirty**, which blocks the next run
      (Step 1.5 requires a clean tree). **Observed 2026-09-06** by the blocked `/from-issue SW-13`
      run, and the item was understated in two ways: - It is **two** files, not one: the spec _and_ `.observations/observations.json`. The second
      is the more delicate, because its content does not belong to the ticket. - **The ADR-0024 path needs no cleanup at all** — when the test lands as `test.fail()`, those
      dirty files simply become the landing commit. The open question is narrower than written:
      it only applies to the _other_ branch, where a person concludes the ticket was wrong and
      the generated tests are discarded.

### ~~The `--from-file` TCMS contradiction~~ — closed by ADR-0026

- [x] ~~`tcms-sync.md` gave two instructions that cannot both hold~~ ("the sync rejects any record
      missing a non-empty `jira` array" vs "when the run used `--from-file`, write `"jira": []`"),
      which made every file-sourced run unmergeable by construction — the failure landing on `main`
      **after** the merge, not on the PR. **Resolved 2026-09-07 by ADR-0026**, which deletes the
      instruction rather than relaxing the check: a file-sourced run now skips Steps 11, 11.5 and 12
      exactly as `dry-run` does, so no branch, no commit, no PR and no records artifact. An empty
      `jira` array is never written, and `suite-sync.ts`'s throw becomes a real guarantee instead of
      a trap.

      The obvious reaction once Jira returned — delete `--from-file` — was considered and rejected:
      its stated purpose ("testing changes to this skill without burning a real ticket") outlives
      the outage, **four real tickets were burned in one session** testing pipeline behaviour,
      ADR-0019 depends on it for a repo with no Atlassian connection, and ADR-0024's Context cites
      the SW-902 run.

## 1. Verify what was built blind

### ADR-0020 — the no-red-PR gate

~~The gate has never fired.~~ **It has now, on both critical branches** (2026-09-06). It remains
the highest-risk change of the four: it is the one that decides whether a PR exists at all.

- [x] ~~**Happy path.**~~ Done 2026-09-06 — `/from-issue SW-12` (`product_detail`), **PR #48**:
      3 tests, green on the first attempt, no `Fix attempts` line. Deliberately aimed at the one
      saucedemo surface with no Page Object, so it exercised CREATE-NEW _and_ the
      `/scaffold-page-object` composition rather than the easier AUGMENT path.
- [ ] **Forced failure.** Point a ticket at an element that does not exist, or temporarily
      break a Page Object method the ticket needs. Expect: 3 diagnosed attempts, then **no
      branch, no commit, no push, no PR**, and a report naming every file left on disk.
      _If a PR appears, the gate is broken and that is the top priority._
- [x] ~~**App-vs-code diagnosis.**~~ Done 2026-09-06 — `/from-issue SW-13`. The run **stopped and
      reported an app-versus-AC contradiction** with **0 fix attempts**: the loop was never entered,
      because `fix-loop.md`'s first question answered itself. No branch, no commit, no PR, no TCMS
      artifact. Verified afterwards that none of those existed.

      What made the diagnosis solid was that it did not rest on the agent's reading of the ticket:
      the failing assertion used `getActiveSortLabel()` and `sortBy()`, **pre-existing** methods
      that the four `standard_user` sort tests in the same file exercise and pass; and a live
      control run with identical steps showed `problem_user` leaving `select.value` at `az` where
      `standard_user` reaches `lohi` and reorders.

      > **Caveat on the evidence.** The same session wrote SW-13 and had read `docs/app/users.md`,
      > so it already knew the AC was false. The mechanical steps are proven; the part that matters
      > most — whether the agent *chooses* to stop rather than weaken the test — was tested by an
      > agent that could not un-know the answer. Re-running SW-13-shaped work from a cold session
      > is the stronger experiment, and is still worth doing.

      It then closed the ADR-0024 loop end to end: `/report-bug` drafted the report, SW-14 was
      filed on approval, and the tests landed `test.fail()` naming it — **16 passed, 0 failed**,
      with the two annotated tests showing `✘` in the list output. CI green while the defect lives,
      exactly as designed (**PR #49**, CI pass).

- [ ] Confirm the `typecheck-spec.sh` exit codes behave in a real run — especially 69, which
      should tell the user to `npm install` and stop, never consume a fix attempt. **Partly done:**
      exit 0 is confirmed across four real runs. **69 has still never fired** and is the one worth
      forcing, since it is the exit that exists to prevent a PASS the run never earned.

### ADR-0022 — Obstacles encountered

- [x] ~~Confirm the section renders in the PR body **and** the terminal report.~~ Done 2026-09-06
      across four runs (SW-3 dry-run, SW-12, SW-13, and the scaffold fix). It rendered every time.
- [ ] Confirm a run with nothing to report renders exactly `None.` rather than omitting it.
      **Not observed — no run this session was obstacle-free.** Every single one surfaced real
      friction, which is either a good sign for the convention or a sign the toolchain has more
      rough edges than anyone assumed. Probably both.
- [x] ~~Confirm it does **not** restate the assumptions block or the fix log.~~ Done 2026-09-06:
      ticket inferences stayed in `⚠️ Assumptions & open questions`, and SW-13's zero fix attempts
      were reported in Verification, not duplicated here.
- [x] ~~Watch for the failure mode the ADR admits: a section that comes back `None.` on a run
      that visibly hit friction.~~ **Did not happen** in four runs. The section did real work —
      it is where every finding below was first written down. The **inverse** risk now looks like
      the live one: the sections are long, and a reader may start skimming them. Worth watching.
- [ ] Run `/refine-ticket` and confirm obstacles reach the terminal and **never** the ticket.

### ADR-0021 — Observations

- [x] ~~Confirm `/from-issue` stages the observations index and that new entries show up in the
      PR diff.~~ Done 2026-09-06 in PRs #48 and #49. Two notes: - The path in this item was wrong: the committed artifact is the single signature-keyed
      `.observations/observations.json`, not one file per feature. - **New defect in the prose renderer.** `count`, `lastSeen` and `sample` _refresh_ per run
      while `firstSeen` survives — that is the documented contract (`reporter.ts:96-99`) and it
      is correct. But `npm run observations` renders "Seen 3 times between 2026-09-04 and
      2026-09-07", pairing a per-run count with a cross-run date range, so the sentence reads as
      cumulative when it is not. The data is right; the sentence is misleading.
- [ ] Triage the standing entries in `.observations/observations.json`. The 404s are already
      marked `ignored` (GitHub Pages `spa-github-pages` shim). Still open: the
      **`events.backtrace.io` 401s** — the app's own error-reporting telemetry is being
      rejected. Harmless on a demo; on a client app it would mean production error reporting
      is dead and nobody would notice, because the UI works fine either way. Decide and record.
- [ ] First ticket that legitimately needs `error_user`: confirm `/from-issue` wires it into
      `AUTH_USERS` per ADR-0014, and that the **dialog detector finally gets e2e coverage**
      (`error_user` + sort → `alert()`). It is unit-tested only today.

### ADR-0019 — Portability

- [ ] Run `skill-validator check .claude/skills/<name>` and confirm still green after the above.
      **Could not run:** `skill-validator` is not installed (`skill-validator not found`); install
      steps are in README.md under "Optional: validating the skills". This matters more than it did
      before — PR #47 edited `scaffold-page-object`'s `references/` and `SKILL.md` and added a
      `scripts/` directory, so its link graph changed without the one check that verifies ADR-0019.
      Also note there are now **five** skills, not four (`/report-bug` shipped in #43).

## 1.5 Found by running it, 2026-09-06/07

None of these came from reading code. They are ordered by how much damage they were doing.

- [x] ~~**`/scaffold-page-object` aborted on every invocation, and had since 2026-06-03.**~~ Fixed in
      **PR #47** with **ADR-0025**. Step 4 reconciles `src/components/*.ts` against the signature
      table and aborts when a file has no row; `BurgerMenu.ts` landed in `1ca64a9` (SW-11) and never
      got one. Step 4 runs _before_ the page is opened, so the abort was page-independent — the
      skill was unusable against any URL for three months. `component-detection.md` was even edited
      inside that window (`83ede0c`, the ADR-0019 refactor) and the gap still went unseen.

      Two further defects, same root cause: the `ProductCard` and `SortDropdown` rows outlived their
      deleted files (removed 2026-05-24), because the reconciliation was one-directional — and the
      doc's own prose cited `ProductCard` as real, which would have made a run compose an import
      that does not resolve. Underneath both, **the rule contradicted the architecture**: nested
      components (composed by a parent, never detected standalone) had no way to declare themselves,
      so `CartBadge` passed only by luck and `BurgerMenu` read as an omission. Nested rows now say
      so, and `scripts/check-component-signatures.sh` reconciles both directions — with both of its
      failure modes verified against injected mismatches rather than assumed.

- [x] ~~**`/report-bug` cannot resolve an acceptance criterion for the case it exists to serve.**~~ **Addressed 2026-09-07 by ADR-0026.** The criterion still cannot be _obtained_ — a failure carries a feature and a test title, not a ticket key — but the silence is gone: `collect-failure.mjs` now returns `no-records-file` / `no-matching-record` / `unreadable-records-file` instead of a bare `undefined`, and the draft renders the reason before falling back to the assertion. `no-matching-record` names ADR-0020 explicitly, so a reader learns the absence is by design. All four branches verified against injected failures, not assumed. Original text:
      `collect-failure.mjs` reads the AC from `.tcms/records/<feature>.json` and matches on test
      title, but ADR-0020 specifies that a blocked run writes **no TCMS artifact**. So for a run
      blocked by an app-versus-AC contradiction, `acceptanceCriterion` is structurally always
      `undefined`. Confirmed 2026-09-06. The AC was supplied from the Jira read instead. Needs a
      design decision, not a doc edit.

- [ ] **ADR-0024 requires a filed defect identifier, and nothing in this project can file one.** **Deliberately still open** — ADR-0026 considered letting `/report-bug` file on approval (mirroring ADR-0013) and **rejected it for now**: "files nothing" is the sharpest statement of the human-in-the-loop principle in this repo, filing a new defect is a larger act than editing an existing ticket's ACs, and exactly one defect has been filed by hand. Revisit when the friction has been felt more than once. Original text:
      The ADR says the annotation "always carries the defect's identifier", but `/report-bug`'s
      Scope excludes tracker writes by design ("needs… its own ADR"), `/from-issue` declares
      read-only Jira tools, and only `/refine-ticket` writes (the AC block, ADR-0013). SW-14 was
      filed as a deliberate one-off on explicit instruction, not by a skill. **The mandatory manual
      step between _diagnosed_ and _annotated_ is named by no document.**

- [x] ~~**ADR-0024 says nothing about the TCMS artifact.**~~ **Closed 2026-09-07.** The record now carries an optional `expectedFailure` ({key, url, reason}), documented in `from-issue/references/tcms-sync.md` and added by hand when a person approves the landing — never by a run. It earns its place twice: the Playwright report reads it and **explains the expected failure in words** instead of showing a bare "expected" status, and a `test.fail()` test whose record lacks it is flagged as an _unattributed expected failure_, which is the machine-readable half of ADR-0024's own rule. No new ADR: by the admission bar this is an implementation detail of an existing decision, so it belongs in the present layer. Original text: A blocked run writes none (ADR-0020), but
      a test that later lands on approval needs one or it carries no report annotation. Records were
      written by hand for SW-13's tests, referencing **both** keys — SW-13 (the AC's origin) and
      SW-14 (the defect). The ADR should say that is the expectation.

- [ ] **Step 8.5's duplicate guard is file-scoped while its insertion is context-scoped.** It
      compares titles "already in the file" but inserts "within the resolved context describe". In a
      multi-context file the same behaviour for a different user is a legitimately different test.
      **Avoided in the SW-13 run only by title choice** — a run that had reused the `@standard`
      describe's phrasing would have been wrongly skipped as a duplicate.

- [ ] **`/from-issue` Step 13's Jira fallback is not executable.** It says to "post a comment-back
      via the Atlassian MCP" if the GitHub-for-Jira link does not appear, but the skill's
      `allowed-tools` declares only the two read tools. Either declare a write tool or drop the
      fallback; today it reads as a capability that is not there.

- [ ] **Whether the GitHub-for-Jira auto-link works is still unverified.**
      `getJiraIssueRemoteIssueLinks` returns `[]` for SW-12 _and_ for SW-11, whose PR was merged
      long ago — so remote issue links are simply not the mechanism (the app writes "development
      information", which this MCP does not appear to expose). **The available check cannot answer
      the question**; confirming it needs a look at the Development panel in the browser.

- [ ] **`/scaffold-page-object` Step 11 still says `npx tsc`.** That is exactly the command
      `from-issue/scripts/typecheck-spec.sh` was written to replace: with `node_modules` absent,
      `npx tsc` fetches `tsc@2.0.4`, a deprecated squatter that is not the compiler, and the skill
      would record a PASS it never earned. `/from-issue` got the hardened script; the scaffold never
      did. A concrete candidate for roadmap item **B12b**.

- [ ] **`playwright-cli` is not on `PATH`.** The scaffold's Step 5 says to run `playwright-cli open`,
      which fails with `command not found`; the binary ships as a local devDependency at
      `node_modules/.bin/playwright-cli`. Two related gaps in the same steps: `click` and `select`
      **require a snapshot `ref`** and fail on free text, which the workflow never says.

- [ ] **`scaffold-page-object`'s `allowed-tools` does not declare `Edit`**, yet its Step 11.5
      instructs "apply three edits" to `src/fixtures/test.ts`. Only `Write` is declared, which would
      mean rewriting the whole fixture file. Left unwidened deliberately: the roadmap's revised
      Bloque A step 4 says review case by case and do not widen by default.

- [x] ~~**`docs/app/users.md` described the `problem_user` sort defect wrongly.**~~ Corrected
      2026-09-06 (PR #49). It said the dropdown "accepts the click but does not re-order", implying
      the control registers the selection. It does not — `select.value` reverts to `az`. **The
      distinction is load-bearing: a test asserting only the resulting order would have passed
      through the wrong mechanism**, and this was caught only because the control assertion and the
      ordering assertion were kept separate. The entry now also labels itself a defect log rather
      than a specification. It also cited `tests/visual/inventory-images.spec.ts`, which does not
      exist.

- [ ] **`@sort-functional` routes to no project.** `test-template.md:109` offers it to the generator
      inside the list of routing tags, but `playwright.config.ts` only greps `@no-auth` and
      `@all-users|@<user>`. As a _secondary_ tag alongside `@standard` it is harmless; **as a sole
      routing tag those tests would run in zero projects and the run would report green having
      executed nothing.** It is also absent from CLAUDE.md's tag table, and cited in
      `docs/architecture.md`.

## 1.7 Client-readiness — raised 2026-09-07

Prompted by the right question: _is this professional for an automation framework, assuming a real
client?_ The prose in the tickets was close to fine. These two are not about prose.

- [x] ~~**The `SW` project has no `Bug` issue type.**~~ Fixed 2026-09-07: the type was added to the
      project, SW-14 converted to it, and both workarounds removed — the `[BUG]` summary prefix and
      the `defect` label went away with their cause. The convention is now recorded in
      `docs/jira-tickets.md`: a defect is filed as a `Bug`, never a `Story`.

- [ ] **Captured evidence is not shareable.** Screenshots, video and traces live at absolute paths
      under `test-results/` on the machine that ran the suite, so a bug report's "Evidence" section
      is dead on arrival for everyone else. A report whose evidence nobody can open has, in
      practice, no evidence. Real work, not a doc edit: attach to the ticket, or link the CI
      artifact. The Atlassian MCP exposes no attachment tool, so this needs another route. SW-14
      currently says so explicitly rather than pretending otherwise.

- [x] ~~**Ticket prose carried internal vocabulary.**~~ Settled 2026-09-07 and recorded as a
      convention in `docs/jira-tickets.md`: **name the tooling, gloss it once, never cite an ADR.**
      Skill names earn their place because they tell the reader that repro steps were _extracted_
      from `test.step` names rather than performed by hand, which changes how a failed repro is
      attributed. ADR citations pay nothing back to a reader without the repo. SW-14 was rewritten
      accordingly.

## 2. Finish Bloque A

- [ ] **Step 2** — run `claude --debug` in the repo and read for silent skill-load errors.
      Must be run by the user; `claude` is not on PATH in the agent's shell.
- [ ] **Step 3** — audit each skill's `description` against 3–4 realistic phrasings of how
      the task would actually be asked. Needs an interactive session to test invocation for
      real. This is the last substantive item left in Bloque A (5–7 were dropped, ADR-0022
      alternatives records why).

## 3. Then, and only then, Bloque B

- [x] ~~**Step 9 — EARS in `/refine-ticket`.**~~ **Done 2026-09-07**, and done in the order this item asked for: written against a pipeline that had been observed on both skills the same day, not an imagined one. Rubric item 10. The `WHEN`→Positive / `IF…THEN`→Negative mapping was validated against four real ACs from this session and **found to break on one** (SW-15 AC 3, `IF…THEN` by EARS but correctly `Edge`), so the limit is documented rather than the mapping oversold. Original text: The roadmap's own highest-ROI/lowest-effort
      item: acceptance criteria as `WHEN <condition> THE SYSTEM SHALL <behavior>`, which map
      near 1:1 onto `test('...')`. Do this _after_ section 1, so it is written against an
      observed pipeline rather than an imagined one.
- [ ] Step 10 — Given/When/Then as the mandatory spec structure.
- [ ] Step 11 — consolidate `AGENTS.md`.

---

## ~~Temporary~~ validation tests — NO LONGER DELETABLE

Added 2026-09-05 to verify the observation detectors, three of which had shipped without
ever firing. They test the framework's instrumentation, not the application.

> **Reversed 2026-09-07. Do not delete these.** The removal plan below said "nothing else
> references them", and that is **false**: [ADR-0021](adr/0021-runtime-observations.md)'s
> `Enforced by:` field names them —
>
> > `src/observations/*.test.ts` cover the signature, merge and digest logic, and
> > **`tests/_framework_validation/` exercises all four detectors including the failure path.**
>
> Deleting them would falsify that field, which is precisely the failure ADR-0023 exists to
> record. It cannot be patched by editing ADR-0021 either — ADRs are superseded, never edited —
> so removal would need a new ADR downgrading the enforcement to prose only. Five kilobytes of
> tests is a much better deal than that.
>
> The contradiction is chronological, not anyone's mistake: the "deletable once `/from-issue`
> has run" note was written 2026-09-05, and the `Enforced by:` backfill (#45) landed **after**
> and made these tests load-bearing. Two items written days apart, pointing opposite ways.
>
> The spec file's own header comment (`_framework_validation.spec.ts:11-12`) repeats the same
> stale "Nothing else references them" claim and should be corrected to point at ADR-0021.

**If a future session still wants them gone**, the honest route is: keep the `test.fail()`
failure-path probe (the only case the real runs do not cover — see the table below), drop the
rest, and write the ADR that adjusts ADR-0021's `Enforced by:` to match. Not worth it today.

~~- [ ] `rm -rf tests/_framework_validation/`~~
~~- [ ] Remove the four `OBSERVATION_PROBE` / dialog entries from `.observations/observations.json`~~
~~- [ ] Remove the `test:instrumentation` script from `package.json`~~
~~- [ ] Nothing else references them.~~ — **the last line was the wrong one.**
`src/observations/reporter.test.ts` is still **not** part of this; those are permanent unit
tests for the merge logic and should stay.

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

~~Keep them until `/from-issue` has run end-to-end at least once; the observation pipeline has
no other coverage.~~ That condition was met on 2026-09-06 — `/from-issue` ran end-to-end on SW-12
and SW-13, both through the real reporter — but it turned out not to be the condition that
mattered. See the reversal above.

- [ ] Worth checking regardless: **do SW-13's landed `test.fail()` tests record observations?**
      That is the one case these probes uniquely cover, and there are now real annotated tests to
      compare against. If the real ones cover it, the failure-path probe becomes redundant and the
      removal conversation gets simpler.

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
- [x] ~~**`/from-issue` is flagged for size.**~~ Audited 2026-09-06, and the conclusion is that
      most of the content earns its place. What the warning cannot know: ADR-0019 requires a
      skill to be self-contained, so the overlap with `CLAUDE.md` (selector order, no manual
      waits) is deliberate rather than redundant; references load on demand, so a green run
      never opens `fix-loop.md`; and the bulk is instruction, not padding —
      `pr-description-template.md` is 3,313 tokens of which 1,469 are rules and only 326 the
      worked example, which shapes output better than the abstract template does.
      **What was actually wrong was citations nobody could follow**: `spec §2 Decision 5/11/13`
      naming no file, `D1-OBS-001`, `PR #8 of the experiment`, `v2`/`v5` run IDs, `Phase E/H`,
      and a Step 3 that existed only to announce it had been removed. A citation that cannot be
      followed is worse than none — it implies authority that is not there. Removed, keeping
      every rule they were attached to. The `References` list now names the step each file
      serves, which addresses the warning's real concern (how many get loaded per run) without
      deleting anything. Net 25,384 -> 25,195 tokens; the number barely moved, which is itself
      the finding.
- [ ] **Run `/skill-doctor`** (Claude Code v2.1.252+, terminal only — not over Remote Control).
      It reports what each skill actually costs in context and how often it is invoked. That is
      the observed-usage data the reference audit lacked: the `skill-validator` total-token
      warning is a heuristic Anthropic's own docs contradict — _"a skill's body loads only when
      it's used, so long reference material costs almost nothing until you need it"_ — whereas
      this measures what is really paid. Decide any further trimming from it, not from the sum.
- [ ] Roadmap item **B12b**: more `scripts/` extraction. One exists
      (`from-issue/scripts/typecheck-spec.sh`); the next candidates are the base-branch
      preflight (Step 1.5) and the PR-body render (Step 12). Apply YAGNI per candidate.
