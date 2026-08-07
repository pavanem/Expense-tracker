#!/usr/bin/env bash
# =============================================================================
# Expense Tracker — PostgreSQL Backup Script
# =============================================================================
# Dumps the Postgres database from the running Docker container, compresses it,
# keeps a configurable number of local copies, and syncs to Google Drive via
# rclone.
#
# Usage:
#   ./scripts/backup.sh              — normal run (called by cron)
#   ./scripts/backup.sh --dry-run    — show what would happen, make no changes
#   ./scripts/backup.sh --no-upload  — dump + compress locally, skip Drive upload
#
# Dependencies:
#   - Docker (postgres container must be running)
#   - rclone configured with a "gdrive" remote (run: rclone config)
#   - gzip (pre-installed on every Ubuntu system)
#
# Config (set in .env at the project root, or export before calling this script):
#   BACKUP_DIR              Local directory to store dumps (default: ./backups)
#   BACKUP_KEEP_DAYS        Days of local backups to retain (default: 7)
#   GDRIVE_REMOTE           rclone remote name (default: gdrive)
#   GDRIVE_FOLDER           Drive folder path (default: expense-tracker-backups)
#   DB_NAME                 Postgres database name (default: expense_tracker)
#   DB_USERNAME             Postgres user (default: expense_user)
#   DB_PASSWORD             Postgres password
#   POSTGRES_CONTAINER      Docker container name (default: expense-tracker-postgres-1)
# =============================================================================

set -euo pipefail

# ── Helpers ──────────────────────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" >&2; }
err()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" >&2; exit 1; }

# ── Parse flags ──────────────────────────────────────────────────────────────
DRY_RUN=false
NO_UPLOAD=false
for arg in "$@"; do
  case "$arg" in
    --dry-run)   DRY_RUN=true ;;
    --no-upload) NO_UPLOAD=true ;;
    *) warn "Unknown argument: $arg" ;;
  esac
done

# ── Load project .env (if it exists alongside this script's parent dir) ──────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

if [[ -f "$ENV_FILE" ]]; then
  # Safe .env parser — reads key=value line by line WITHOUT invoking bash on
  # the value, so passwords containing $, !, etc. are never shell-expanded.
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip blank lines and comment lines
    [[ -z "${line//[[:space:]]/}" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    # Match KEY=VALUE (value may contain anything, including $ signs)
    if [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)[[:space:]]*=[[:space:]]*(.*)[[:space:]]*$ ]]; then
      _key="${BASH_REMATCH[1]}"
      _val="${BASH_REMATCH[2]}"
      # Strip trailing carriage return (handles Windows CRLF line endings)
      _val="${_val%$'\r'}"
      # Strip matching surrounding quotes if present
      if [[ "$_val" =~ ^\"(.*)\"$ ]] || [[ "$_val" =~ ^\'(.*)\'$ ]]; then
        _val="${BASH_REMATCH[1]}"
      fi
      export "$_key=$_val"
    fi
  done < "$ENV_FILE"
  log "Loaded environment from $ENV_FILE"
else
  warn ".env not found at $ENV_FILE — relying on exported environment variables"
fi

# ── Config with defaults ──────────────────────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
GDRIVE_REMOTE="${GDRIVE_REMOTE:-gdrive}"
GDRIVE_FOLDER="${GDRIVE_FOLDER:-expense-tracker-backups}"
DB_NAME="${DB_NAME:-expense_tracker}"
DB_USERNAME="${DB_USERNAME:-expense_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-expense-tracker-postgres-1}"

# ── Derived values ────────────────────────────────────────────────────────────
TIMESTAMP="$(date '+%Y%m%d_%H%M%S')"
DUMP_FILENAME="expenses_backup_${TIMESTAMP}.sql.gz"
DUMP_PATH="$BACKUP_DIR/$DUMP_FILENAME"

# ── Pre-flight checks ─────────────────────────────────────────────────────────
log "=== Expense Tracker Backup Starting ==="
log "Database  : $DB_NAME"
log "Container : $POSTGRES_CONTAINER"
log "Local dir : $BACKUP_DIR"
log "Drive path: $GDRIVE_REMOTE:$GDRIVE_FOLDER"
log "Dry run   : $DRY_RUN"
log "No upload : $NO_UPLOAD"

# Check Docker is available
command -v docker >/dev/null 2>&1 || err "Docker is not installed or not in PATH"

# Check the Postgres container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
  # Try partial match (handles docker compose project prefix variations)
  ACTUAL=$(docker ps --format '{{.Names}}' | grep postgres | head -1)
  if [[ -z "$ACTUAL" ]]; then
    err "No running Postgres container found. Is the stack up? (docker compose up -d)"
  fi
  warn "Container '$POSTGRES_CONTAINER' not found — using '$ACTUAL' instead"
  POSTGRES_CONTAINER="$ACTUAL"
fi

# Check rclone only if we're uploading
if [[ "$NO_UPLOAD" == "false" ]] && [[ "$DRY_RUN" == "false" ]]; then
  command -v rclone >/dev/null 2>&1 || err "rclone is not installed. Run: curl https://rclone.org/install.sh | sudo bash"
  rclone listremotes | grep -q "^${GDRIVE_REMOTE}:" \
    || err "rclone remote '${GDRIVE_REMOTE}' not configured. Run: rclone config"
fi

# ── Create local backup directory ─────────────────────────────────────────────
if [[ "$DRY_RUN" == "false" ]]; then
  mkdir -p "$BACKUP_DIR"
fi

# ── Dump the database ─────────────────────────────────────────────────────────
log "Dumping database '$DB_NAME' from container '$POSTGRES_CONTAINER' ..."

if [[ "$DRY_RUN" == "true" ]]; then
  log "[DRY RUN] Would run: docker exec $POSTGRES_CONTAINER pg_dump -U $DB_USERNAME $DB_NAME | gzip > $DUMP_PATH"
else
  PGPASSWORD="$DB_PASSWORD" docker exec \
    -e PGPASSWORD="$DB_PASSWORD" \
    "$POSTGRES_CONTAINER" \
    pg_dump -U "$DB_USERNAME" "$DB_NAME" \
    | gzip > "$DUMP_PATH"

  DUMP_SIZE="$(du -sh "$DUMP_PATH" | cut -f1)"
  log "Dump complete: $DUMP_PATH ($DUMP_SIZE)"
fi

# ── Upload to Google Drive ────────────────────────────────────────────────────
if [[ "$NO_UPLOAD" == "false" ]]; then
  log "Uploading to Google Drive: $GDRIVE_REMOTE:$GDRIVE_FOLDER/ ..."

  if [[ "$DRY_RUN" == "true" ]]; then
    log "[DRY RUN] Would run: rclone copy $DUMP_PATH $GDRIVE_REMOTE:$GDRIVE_FOLDER/"
  else
    rclone copy "$DUMP_PATH" "$GDRIVE_REMOTE:$GDRIVE_FOLDER/" \
      --progress \
      --log-level INFO

    log "Upload complete."

    # Verify the file landed on Drive
    if rclone ls "$GDRIVE_REMOTE:$GDRIVE_FOLDER/$DUMP_FILENAME" >/dev/null 2>&1; then
      log "✅ Verified: $DUMP_FILENAME is on Google Drive"
    else
      warn "⚠️  Could not verify file on Drive — check rclone output above"
    fi
  fi
else
  log "Skipping Google Drive upload (--no-upload flag set)"
fi

# ── Prune old local backups ───────────────────────────────────────────────────
log "Pruning local backups older than ${BACKUP_KEEP_DAYS} days ..."

if [[ "$DRY_RUN" == "true" ]]; then
  OLD_FILES=$(find "$BACKUP_DIR" -name "expenses_backup_*.sql.gz" \
    -mtime +"$BACKUP_KEEP_DAYS" 2>/dev/null || true)
  if [[ -n "$OLD_FILES" ]]; then
    log "[DRY RUN] Would delete:"
    echo "$OLD_FILES"
  else
    log "[DRY RUN] No old files to delete"
  fi
else
  DELETED=$(find "$BACKUP_DIR" -name "expenses_backup_*.sql.gz" \
    -mtime +"$BACKUP_KEEP_DAYS" -print -delete 2>/dev/null | wc -l)
  log "Pruned $DELETED old local backup(s)"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log "=== Backup Finished Successfully ==="
if [[ "$DRY_RUN" == "false" ]]; then
  log "Local backups in $BACKUP_DIR:"
  ls -lh "$BACKUP_DIR"/expenses_backup_*.sql.gz 2>/dev/null || log "  (none)"
fi
