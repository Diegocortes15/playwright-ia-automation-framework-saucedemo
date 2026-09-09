#!/usr/bin/env bash
#
# Attach a collected evidence folder to a Jira issue.
#
# Why this exists as a script and not an instruction: it is the only route that works, and it
# took three checks to establish that. The Atlassian MCP exposes no attachment tool. `acli jira
# workitem` has `attachment-list` and `attachment-delete` but no upload — and that asymmetry is
# what made the finding conclusive rather than a guess about a missing flag. So the REST API with
# an API token is what is left, and it is the first Jira credential this project needs.
#
# It uploads a ZIP rather than loose files on purpose: `/report-bug`'s collector already groups
# one failure's screenshot, video, trace and README into a single folder, and a reader who opens
# one zip gets the README explaining the failure next to the files it describes.
#
# Usage:  scripts/attach-evidence.sh SW-17 bug-evidence/<folder> [more folders...]
# Needs:  JIRA_EMAIL and JIRA_API_TOKEN in .env (gitignored). Create the token at
#         https://id.atlassian.com/manage-profile/security/api-tokens
# Exit:   0 all uploads returned 200
#         64 bad usage
#         65 credentials missing from .env
#         66 a folder does not exist
#         1  an upload was rejected — the HTTP code and Jira's response are printed

set -uo pipefail

SITE="${JIRA_SITE:-https://diegocortes15.atlassian.net}"

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <ISSUE-KEY> <evidence-folder> [more...]" >&2
  exit 64
fi

issue="$1"; shift

# shellcheck disable=SC1091
[ -f .env ] && { set -a; . ./.env; set +a; }

if [ -z "${JIRA_EMAIL:-}" ] || [ -z "${JIRA_API_TOKEN:-}" ]; then
  echo "attach-evidence: JIRA_EMAIL and JIRA_API_TOKEN must be set in .env." >&2
  echo "  Create a token at https://id.atlassian.com/manage-profile/security/api-tokens" >&2
  exit 65
fi

status=0
for dir in "$@"; do
  if [ ! -d "$dir" ]; then
    echo "attach-evidence: no such folder: $dir" >&2
    exit 66
  fi

  slug=$(basename "$dir")
  zip="$(mktemp -d)/$slug.zip"
  zip -qr "$zip" "$dir"

  body=$(mktemp)
  code=$(curl -s -o "$body" -w "%{http_code}" -X POST \
    --user "$JIRA_EMAIL:$JIRA_API_TOKEN" \
    -H "X-Atlassian-Token: no-check" \
    -F "file=@$zip" \
    "$SITE/rest/api/3/issue/$issue/attachments")

  size=$(du -h "$zip" | cut -f1)
  if [ "$code" = "200" ]; then
    echo "  attached to $issue — $slug.zip ($size)"
  else
    echo "  FAILED on $issue — $slug.zip: HTTP $code" >&2
    head -c 400 "$body" >&2; echo >&2
    status=1
  fi
  rm -rf "$(dirname "$zip")" "$body"
done

exit "$status"
