#!/usr/bin/env bash
# =============================================================================
# Expense Tracker — Backup Restore Script
# =============================================================================
# Restores a compressed pg_dump backup into the running Postgres container.
#
# Usage:
#   ./scripts/restore.sh <backup_file.sql.gz>
#
# The backup file can be:
#   - A local file path:  ./backups/expenses_backup_20260721_020000.sql.gz
#   - A Google Drive file (will be downloaded first via rclone)
#
# WARNING: This will DROP and recreate the database. All current data will be
# replaced by the backup. Only run this when you intend a full restore.
# =============================================================================

set -euo pipefail

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" >&2; }
err()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2; exit 1; }

# ── Args ──────────────────────────────────────────────────────────────────────
BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
  err "Usage: $0 <backup_file.sql.gz>  OR  $0 gdrive:<filename>"
fi

# ── Load .env ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)[[:space:]]*$ ]]; then
      _key="${BASH_REMATCH[1]}"
      _val="${BASH_REMATCH[2]}"
      if [[ "$_val" =~ ^\"(.*)\"$ ]] || [[ "$_val" =~ ^\'(.*)\'$ ]]; then
        _val="${BASH_REMATCH[1]}"
      fi
      export "$_key=$_val"
    fi
  done < "$ENV_FILE"
fi

DB_NAME="${DB_NAME:-expense_tracker}"
DB_USERNAME="${DB_USERNAME:-expense_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-expense-tracker-postgres-1}"
GDRIVE_REMOTE="${GDRIVE_REMOTE:-gdrive}"
GDRIVE_FOLDER="${GDRIVE_FOLDER:-expense-tracker-backups}"

# ── Resolve backup file ───────────────────────────────────────────────────────
# If it starts with "gdrive:" download it first
if [[ "$BACKUP_FILE" == gdrive:* ]]; then
  REMOTE_FILENAME="${BACKUP_FILE#gdrive:}"
  LOCAL_TEMP="/tmp/${REMOTE_FILENAME}"
  log "Downloading from Google Drive: $GDRIVE_REMOTE:$GDRIVE_FOLDER/$REMOTE_FILENAME"
  rclone copy "$GDRIVE_REMOTE:$GDRIVE_FOLDER/$REMOTE_FILENAME" /tmp/
  BACKUP_FILE="$LOCAL_TEMP"
  log "Downloaded to: $BACKUP_FILE"
fi

[[ -f "$BACKUP_FILE" ]] || err "Backup file not found: $BACKUP_FILE"

# ── Confirm ───────────────────────────────────────────────────────────────────
BACKUP_SIZE="$(du -sh "$BACKUP_FILE" | cut -f1)"
echo ""
warn "⚠️  WARNING: This will ERASE all current data in '$DB_NAME' and restore from:"
warn "   File  : $BACKUP_FILE ($BACKUP_SIZE)"
warn "   Target: $POSTGRES_CONTAINER → $DB_NAME"
echo ""
read -rp "Type YES to confirm: " CONFIRM
[[ "$CONFIRM" == "YES" ]] || { log "Aborted."; exit 0; }

# ── Stop the backend (prevent new writes during restore) ─────────────────────
log "Stopping backend container to prevent writes during restore ..."
docker stop expense-tracker-backend-1 2>/dev/null && log "Backend stopped." \
  || warn "Could not stop backend (may already be stopped — continuing)"

# ── Restore ───────────────────────────────────────────────────────────────────
log "Restoring database '$DB_NAME' from '$BACKUP_FILE' ..."

# Terminate any existing connections to the DB
docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" \
  psql -U "$DB_USERNAME" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='$DB_NAME' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

# Drop and recreate the database
docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" \
  psql -U "$DB_USERNAME" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec -e PGPASSWORD="$DB_PASSWORD" "$POSTGRES_CONTAINER" \
  psql -U "$DB_USERNAME" -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USERNAME;"

# Pipe the compressed dump in
gunzip -c "$BACKUP_FILE" | docker exec -i \
  -e PGPASSWORD="$DB_PASSWORD" \
  "$POSTGRES_CONTAINER" \
  psql -U "$DB_USERNAME" -d "$DB_NAME" -q

log "✅ Restore complete."

# ── Restart the backend ───────────────────────────────────────────────────────
log "Restarting backend ..."
docker start expense-tracker-backend-1 2>/dev/null && log "Backend started." \
  || warn "Could not restart backend — run: docker compose up -d backend"

# ── Cleanup temp file if we downloaded from Drive ─────────────────────────────
if [[ "$BACKUP_FILE" == /tmp/expenses_backup_* ]]; then
  rm -f "$BACKUP_FILE"
  log "Cleaned up temporary download"
fi

log "=== Restore finished. Verify the app at http://<your-server-ip>/ ==="
