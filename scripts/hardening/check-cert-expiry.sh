#!/bin/bash
# Independently verifies certificate health rather than just trusting that
# the certbot renewal loop (docker-compose.yml) is working — if it ever
# silently fails (DNS issue, port 80 blocked, rate-limited by Let's
# Encrypt, etc.), this is what catches it before the cert actually expires
# and the site starts throwing browser warnings.
#
# Intended to run daily via cron (see scripts/hardening/README.md Phase 5).

set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

WARN_DAYS=14
NTFY_TOPIC="${NTFY_TOPIC:-}"

if [ -z "${DOMAIN:-}" ]; then
  echo "DOMAIN not set in .env — nothing to check." >&2
  exit 1
fi

notify() {
  local title="$1" message="$2"
  echo "$title: $message"
  if [ -n "$NTFY_TOPIC" ]; then
    curl -s -H "Title: $title" -H "Priority: high" -H "Tags: warning" \
      -d "$message" "https://ntfy.sh/$NTFY_TOPIC" >/dev/null || true
  fi
}

expiry_date=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2) || true

if [ -z "$expiry_date" ]; then
  notify "expense-tracker: cert check failed" \
    "Could not retrieve the TLS certificate for $DOMAIN at all. Site may be down or DNS/port-forwarding broken."
  exit 1
fi

expiry_epoch=$(date -d "$expiry_date" +%s)
now_epoch=$(date +%s)
days_left=$(( (expiry_epoch - now_epoch) / 86400 ))

echo "Certificate for $DOMAIN expires in $days_left day(s) ($expiry_date)."

if [ "$days_left" -lt 0 ]; then
  notify "expense-tracker: CERT EXPIRED" \
    "The TLS certificate for $DOMAIN expired $(( -days_left )) day(s) ago. Renewal has failed — check the certbot container logs."
elif [ "$days_left" -lt "$WARN_DAYS" ]; then
  notify "expense-tracker: cert expiring soon" \
    "The TLS certificate for $DOMAIN expires in $days_left day(s). Automatic renewal should have already handled this by 30 days out — check the certbot container logs."
fi
