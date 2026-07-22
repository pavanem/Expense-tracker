#!/bin/bash
# Run nightly via cron. Local-only backups (no cloud dependency, per the
# original SRS) — kept simple on purpose. Alerts on failure so a broken
# backup doesn't go unnoticed for months until the day you actually need it.

set -euo pipefail
cd "$(dirname "$0")/../.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

BACKUP_DIR="./backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILE="${BACKUP_DIR}/expense_tracker_${TIMESTAMP}.sql.gz"
DB_USERNAME="${DB_USERNAME:-expense_user}"
DB_NAME="${DB_NAME:-expense_tracker}"

mkdir -p "$BACKUP_DIR"

if docker compose exec -T postgres pg_dump -U "$DB_USERNAME" "$DB_NAME" | gzip > "$FILE"; then
  SIZE=$(du -h "$FILE" | cut -f1)
  echo "Backup succeeded: $FILE ($SIZE)"

  # Sanity check: a 0-byte or near-empty "successful" backup is worse than
  # an honest failure, since it looks fine until you actually need it.
  MIN_BYTES=200
  ACTUAL_BYTES=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")
  if [ "$ACTUAL_BYTES" -lt "$MIN_BYTES" ]; then
    echo "Backup file is suspiciously small ($ACTUAL_BYTES bytes)" >&2
    ./scripts/monitoring/notify.sh "⚠️ Database backup looks empty" \
      "Backup completed without error but the file is only $ACTUAL_BYTES bytes — check it manually: $FILE" \
      "urgent"
    exit 1
  fi

  find "$BACKUP_DIR" -name "expense_tracker_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
else
  echo "Backup FAILED" >&2
  ./scripts/monitoring/notify.sh "❌ Database backup failed" \
    "expense-tracker backup failed at ${TIMESTAMP} — check disk space and that the postgres container is running." \
    "urgent"
  exit 1
fi
