#!/usr/bin/env bash
# =============================================================================
# Expense Tracker — Manual Deploy Script
# =============================================================================
# Pulls the latest code from main and restarts the Docker Compose stack.
# This is the same logic the GitHub Actions workflow runs — you can also
# call it directly on the server for a quick manual deploy.
#
# Usage:
#   ./scripts/deploy.sh              — full deploy (pull + build + restart)
#   ./scripts/deploy.sh --skip-pull  — rebuild & restart without git pull
#                                      (useful if you edited files directly
#                                       on the server for testing)
# =============================================================================

set -euo pipefail

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [DEPLOY] $*"; }
err()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR]  $*" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"

SKIP_PULL=false
for arg in "$@"; do
  [[ "$arg" == "--skip-pull" ]] && SKIP_PULL=true
done

log "=== Expense Tracker Deploy Starting ==="
log "Deploy directory: $DEPLOY_DIR"

# ── Pre-flight ────────────────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || err "Docker not found in PATH"
cd "$DEPLOY_DIR"

# ── Git pull ──────────────────────────────────────────────────────────────────
if [[ "$SKIP_PULL" == "false" ]]; then
  log "Pulling latest code from origin/main ..."
  git fetch origin main
  git reset --hard origin/main
  log "Code updated to: $(git log -1 --oneline)"
else
  log "Skipping git pull (--skip-pull flag set)"
  log "Current commit: $(git log -1 --oneline)"
fi

# ── Build & restart ───────────────────────────────────────────────────────────
log "Building images and restarting services ..."
docker compose up -d --build --remove-orphans

# ── Wait & health check ───────────────────────────────────────────────────────
log "Waiting for services to initialise (20s) ..."
sleep 20

log "Checking backend health ..."
for i in {1..6}; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' expense-tracker-backend 2>/dev/null || echo "not found")
  log "  Attempt $i/6 — backend: $STATUS"
  if [[ "$STATUS" == "healthy" ]]; then
    log "✅ Backend is healthy"
    break
  fi
  if [[ $i -eq 6 ]]; then
    err "Backend did not become healthy after 60s — check: docker logs expense-tracker-backend"
  fi
  sleep 10
done

log "Checking frontend ..."
curl -sf --max-time 10 http://localhost/ -o /dev/null \
  && log "✅ Frontend is responding" \
  || err "Frontend did not respond — check: docker logs expense-tracker-frontend"

# ── Summary ───────────────────────────────────────────────────────────────────
log "=== Deploy Finished Successfully ==="
log "Running containers:"
docker compose ps
