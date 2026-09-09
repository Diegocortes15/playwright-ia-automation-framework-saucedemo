# 0028 — Evidence reaches a ticket through a script and an API token (scopes ADR-0013)

**Date:** 2026-09-09
**Status:** Accepted. Scopes [ADR-0013](0013-refine-ticket-jira-writeback.md), which restricts Jira writes to `/refine-ticket` and enforces that through `allowed-tools`.
**Confidence:** High for the mechanism — it was run and verified against two real tickets. Medium for the boundary: what would change it is a second write appearing that nobody weighed, which is the risk this record exists to make visible.
**Review by:** — (no shelf life; the trigger is a second script wanting to write)
**Enforced by:** **Nothing — prose only, and that is the finding.** ADR-0013's guard is `allowed-tools`, which governs what a _skill_ may call. `scripts/attach-evidence.sh` uses `curl` and a token, so no `allowed-tools` declaration reaches it. See Consequences.

## Context

A bug report is only useful to someone who can see the evidence. `/report-bug`'s collector already gathers one failure's screenshot, video, trace and a README into a folder — the payload was ready and the last step was not possible.

Three routes were checked, in this order:

- **The Atlassian MCP** — exposes no attachment tool. Verified twice, months apart.
- **`acli jira workitem`** — has `attachment-list` and `attachment-delete` but **no upload**. That asymmetry is what settled it: a tool that can delete attachments and not create them is not missing a flag.
- **The REST API with an API token** — works.

SW-14 sat filed for three days saying "attaching the files to this issue is manual — the tooling cannot write attachments", with the evidence on disk the whole time. The only thing missing was a way to move it.

## Decision

**`scripts/attach-evidence.sh <ISSUE-KEY> <folder>…` uploads collected evidence to a Jira issue over REST, authenticating with `JIRA_EMAIL` + `JIRA_API_TOKEN` from `.env`.**

- It uploads a **ZIP per evidence folder**, not loose files, so a reader who opens one attachment finds the README explaining the failure next to the files it describes.
- It is **invoked by a person with arguments.** No skill calls it, and no skill declares it.
- The credential lives in `.env` only, which is gitignored. `.env.example` documents the two variables commented out, the same way `QASE_*` is.
- **Nothing is automated.** A blocked run still reports and attaches nothing; `/report-bug` still files nothing. This closes the last manual step of a flow that stays manual by design.

## Consequences

- **This is the first Jira credential the project holds.** Before it, no code path in the repository could write to Jira except `/refine-ticket` through the MCP's OAuth, which carries no secret.
- **ADR-0013's enforcement does not cover this path, and that is worth stating plainly.** That record's guard is `allowed-tools`: `/refine-ticket` is the only skill declaring Atlassian write tools, so no other _skill_ can write. A shell script with `curl` is outside that mechanism entirely. ADR-0013 is not violated — its subject is skills — but the guard it relies on was sufficient only while MCP tools were the only route. It no longer is.
- **So the constraint here runs on prose**, and a check would be worse than none: it could verify that a script exists, not that a person meant to run it. The honest record is that the boundary is now a convention, and the trigger below is what to watch.
- CI does not have the token and does not attach anything. Giving it one would be a separate decision, and a bigger one — a secret in GitHub Actions that can write to the tracker.
- **Trigger to revisit:** a second script or skill wanting to write to Jira. One deliberate exception is a decision; two without a record is drift.

## Alternatives considered

- **Publish the HTML report to GitHub Pages and link it from the ticket.** Genuinely attractive — it gives a reader the full interactive trace rather than a screenshot, needs no credential, and the README once carried a note suggesting it. Rejected _for this purpose_: it shares a **run**, not a **bug's evidence**. A `test.fail()` test appears as passed in the report, so a reader cannot find it by filtering failures; and the evidence for these two tickets came from local runs, which CI never published. It remains a good idea for sharing a scheduled regression, and is recorded as such rather than discarded.
- **Attach loose files instead of a ZIP.** Rejected: it scatters four files per failure across the ticket and separates the README from what it explains.
- **Wait for the MCP to add an attachment tool.** Rejected: it has not in the months this has been open, and the evidence was already stale by three days on one ticket.
- **Let `/report-bug` attach as part of filing.** Rejected, and it is the tempting one. `/report-bug` files nothing by deliberate design (ADR-0026) — handing it upload rights would make the tool that must not decide able to publish.
