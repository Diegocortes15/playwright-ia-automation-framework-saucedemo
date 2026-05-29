# TCMS records artifact + at-merge Qase sync

The framework mirrors tests into Qase **one-way, at merge** (see [ADR-0017](../../../../docs/adr/0017-tcms-sync-at-merge.md)), behind the `src/tcms/` seam. `/from-issue` does **not** push to Qase; it writes a committed **records artifact**, and a merge-time CI step (`npm run tcms:sync`) does the authoritative create/update/archive. A rejected PR therefore never mutates Qase.

## Step 11.5 — write `.tcms/records/<KEY>.json`

One object per generated test, from the Step 6 model:

```json
{
  "meta": { "jiraKey": "SW-1", "sourceUrl": "https://…/browse/SW-1" },
  "records": [
    {
      "title": "<prose test title, with any embedded @tag tokens stripped>",
      "acText": "<the AC text this test covers — the human-readable expected outcome>",
      "user": "standard_user | … | no-auth",
      "tags": ["@no-auth", "@smoke"],
      "bucket": "Positive | Negative | Edge",
      "feature": "<feature slug, e.g. login>",
      "contextLabel": "<context label, e.g. 'no auth' / 'problem_user'>"
    }
  ]
}
```

Write it with the Write tool and `git add` it alongside the spec. Skip under `dry-run`.

## What the merge-time sync does (`src/tcms/suite-sync.ts`, run by CI)

- Reads **all** `.tcms/records/*.json` + the full `test-results/results.json`.
- One Qase case per logical test under **`feature › context › bucket`**, marked **automated**; steps from `test.step` names; **expected = the record's `acText`**; deduped across projects (passed only if every project passed).
- Find-or-create (never references an unknown id), one run per sync, writes `qase-map.json` (test → case id), and **archives** cases whose records vanished.

Mapping lives in `src/tcms/case-mapper.ts` + `suite-sync.ts` — do not re-derive.
