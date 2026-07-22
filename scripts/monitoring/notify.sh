#!/bin/bash
# Sends a push notification via ntfy.sh — free, no signup or account
# needed. Install the "ntfy" app on your Android phone and subscribe to
# your topic name to receive these.
#
# Usage: ./notify.sh "Title" "Message body" ["priority"]
#   priority: min | low | default | high | urgent

set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

TITLE="${1:?Usage: notify.sh <title> <message> [priority]}"
MESSAGE="${2:?Usage: notify.sh <title> <message> [priority]}"
PRIORITY="${3:-default}"

if [ -z "${NTFY_TOPIC:-}" ]; then
  echo "NTFY_TOPIC not set in .env — notification skipped: [$TITLE] $MESSAGE" >&2
  exit 0
fi

curl -sf \
  -H "Title: $TITLE" \
  -H "Priority: $PRIORITY" \
  -d "$MESSAGE" \
  "https://ntfy.sh/${NTFY_TOPIC}" > /dev/null \
  || echo "Warning: failed to send notification to ntfy.sh" >&2
