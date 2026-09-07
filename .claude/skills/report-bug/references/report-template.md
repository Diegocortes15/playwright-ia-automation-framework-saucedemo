# Bug report draft template

The `report-bug` skill renders this. Section order is mandatory — a reader scanning several
reports should find the same thing in the same place every time.

## Template

```markdown
**Summary:** <one line: what the app did that it should not have, in the user's words>

**Environment:** <project, e.g. chromium-problem> · <feature> · found by automated test

## Steps to reproduce

1. <reproSteps[0]>
2. <reproSteps[1]>
   …

## Expected

<the acceptance criterion verbatim when one is available; otherwise the test's assertion in plain words, preceded by the one-line reason it could not be resolved>

## Actual

<what happened — `received` when the script parsed one, otherwise the first line of the error>

## Which is wrong?

- **If the application:** <one sentence>
- **If the ticket:** <one sentence>
- <the repository's own documentation, cited, when it covers this — say whether it specifies intended behaviour or records a known defect; the second does not make the behaviour correct>

## Evidence

- Screenshot: `<path>`
- Video: `<path>`
- Trace: `npx playwright show-trace <path>`
- Failing test: `<file>:<line>` — `<title>`

## Runtime observations during this test

<one line per observation, or "None recorded.">
```

## Rules

- **`Which is wrong?` is never omitted, and never resolved unilaterally — not even by documentation.** Cite `docs/app/` when it covers the behaviour, and say which kind of record it is: a **specification** ("the system shall do X" — then not doing X is a defect) or a **defect log** ("X is broken for this user" — which proves the bug is *known*, not that it is *correct*). Both readings still stand afterwards. A file describing something as "broken" is the strongest possible evidence that someone considered it a bug.
- **Steps are the `test.step` titles verbatim.** They describe what actually ran. Rewriting them into prettier prose breaks the guarantee that following the steps reproduces the failure.
- **Expected prefers the acceptance criterion over the assertion.** The AC is what a person agreed the system should do; the assertion is one engineer's encoding of it. When the script found no AC it returns a `missing` reason instead — **render that reason**, then fall back to the assertion. Never fall back silently: restating the assertion that just failed is circular, and a reader has no way to tell an oversight from a structural absence.

  | `missing` | What to write |
  | --- | --- |
  | `no-matching-record` | "No acceptance criterion is committed for this test. A run blocked by an application-versus-AC contradiction writes no records artifact (ADR-0020), which is the usual reason after a blocked run — and the situation this skill exists for. Falling back to the assertion; supply the criterion from the ticket if you have it." |
  | `no-records-file` | "No records file exists for this feature, so nothing traces its tests to acceptance criteria. Falling back to the assertion." |
  | `unreadable-records-file` | "The feature's records file could not be parsed — worth fixing separately. Falling back to the assertion." |

  When the user supplies the criterion (from the ticket, as they did for SW-13), quote it and say where it came from, so a reader is never left assuming it was machine-resolved.
- **Observations are context, never a conclusion.** A 404 recorded during the test may explain the failure or may be unrelated noise already triaged as `ignored`. Present them; do not build the diagnosis on them.
- **No severity, no priority, no component.** Those are the reporter's call and depend on a tracker's own taxonomy. Guessing them wastes the triager's time correcting them.
