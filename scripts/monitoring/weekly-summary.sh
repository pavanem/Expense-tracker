#!/bin/bash
# Run weekly via cron (suggested: Monday mornings). Ties the other signals
# together into one "everything's fine" (or not) message. The point of
# this one specifically is that silence from the alert scripts is
# ambiguous — it could mean nothing happened, or it could mean cron itself
# stopped running weeks ago and you'd never know. This is the positive
# confirmation that the whole monitoring setup is still alive.

set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

TOTAL_BANNED="unknown (fail2ban not reachable — is it running?)"
if command -v fail2ban-client >/dev/null 2>&1 && sudo fail2ban-client status >/dev/null 2>&1; then
  JAILS=$(sudo fail2ban-client status | grep "Jail list" | sed 's/.*://; s/,//g')
  SUM=0
  for jail in $JAILS; do
    COUNT=$(sudo fail2ban-client status "$jail" 2>/dev/null \
      | grep "Currently banned" | sed 's/.*://' | tr -d ' ')
    SUM=$(( SUM + ${COUNT:-0} ))
  done
  TOTAL_BANNED="${SUM} IP(s) currently banned across $(echo "$JAILS" | wc -w) jail(s)"
fi

LATEST_BACKUP="none found"
if [ -d ./backups ]; then
  LATEST_FILE=$(ls -t ./backups/expense_tracker_*.sql.gz 2>/dev/null | head -n1 || true)
  if [ -n "$LATEST_FILE" ]; then
    LATEST_BACKUP="$(basename "$LATEST_FILE") ($(date -r "$LATEST_FILE" '+%Y-%m-%d'))"
  fi
fi

CERT_DAYS_LEFT="unknown"
if [ -n "${DOMAIN:-}" ]; then
  EXPIRY_DATE=$(docker compose run --rm --entrypoint \
    "openssl x509 -enddate -noout -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem" \
    certbot 2>/dev/null | cut -d= -f2 || true)
  if [ -n "$EXPIRY_DATE" ]; then
    EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
    NOW_EPOCH=$(date +%s)
    CERT_DAYS_LEFT="$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 )) days"
  fi
fi

./scripts/monitoring/notify.sh "Weekly status: expense-tracker" \
  "fail2ban: ${TOTAL_BANNED} | Latest backup: ${LATEST_BACKUP} | Cert expires in: ${CERT_DAYS_LEFT}" \
  "low"
