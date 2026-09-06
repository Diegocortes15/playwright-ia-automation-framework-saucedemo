# report-bug Workflow

The procedural workflow Claude follows when the `report-bug` skill is invoked.

## Inputs

- **`--grep <substring>`** (optional) — narrow to one failure when the run had several. Matched against the test title.

## Steps

### 1. Collect the facts

```bash
node .claude/skills/report-bug/scripts/collect-failure.mjs [--grep "<substring>"]
```

| Exit | Meaning |
| ---- | ------- |
| 0 | JSON on stdout — continue |
| 3 | The last run had no failures. Say so and stop; there is nothing to report |
| 4 | No `test-results/results.json`. Tell the user to run the suite first, and stop |

Do **not** hunt for these facts by hand if the script fails — fix the run, then re-run the script. Reconstructing them by reading files is how a report ends up describing a different failure than the one that happened.

### 2. Decide what kind of failure this is

**This is the judgment the skill exists to support, and it is not yours to settle.** Read the acceptance criterion against the actual behaviour and present *both* readings:

- **The application is wrong** — the test faithfully encodes the AC, and the app does not do it. A defect.
- **The ticket is wrong** — the app behaves as designed, and the AC describes something it never did. A refinement.

They are indistinguishable from the failure alone. A report that asserts "the application has a bug" when the truth was a badly written AC sends someone chasing a ghost, and the credibility of every later report goes with it.

Where the repository already documents the behaviour (`docs/app/`), say so and cite it — that usually settles it, and it is evidence rather than opinion. Where it does not, present both and stop.

### 3. Render the draft

Follow [`report-template.md`](report-template.md) exactly. Every section, in order.

Repro steps come from the script's `reproSteps` — these are the `test.step` titles the Page Objects already wrap each action in, so they are prose, not code. Use them verbatim; do not paraphrase them into something prettier that no longer matches what ran.

### 4. Hand it over

Print the draft. **File nothing.** Say plainly that it is a draft for the user to review, and that the tracker write is deliberately not implemented (see the skill's Scope section).

Then report **Obstacles encountered** — ALWAYS, even when there are none (one line: `Obstacles encountered: none.`). Per ADR-0022 it carries three things:

1. **Evidence gaps** — a field the script could not fill: no acceptance criterion matched the test title, no trace was captured, no observations recorded. Name what is missing, because a reader will otherwise assume it was checked and found empty.
2. **Tooling friction** — a command that failed and was retried or worked around.
3. **Reference gaps** — where this skill's own `references/` did not cover the case and you improvised. **Name the file that should have covered it.**

Do not restate the two readings from Step 2 here; they belong in the draft itself.
