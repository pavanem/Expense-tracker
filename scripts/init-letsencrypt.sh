#!/bin/bash
# One-time bootstrap for HTTPS via Let's Encrypt. Run this once, after
# DuckDNS is up and pointing at your public IP, and before your first
# `docker compose up -d --build`.
#
# Why this exists: Nginx's HTTPS server block requires a certificate file
# to exist just to START, but Certbot's HTTP-01 challenge requires Nginx to
# already be running to serve that challenge. This script breaks the
# deadlock: create a throwaway self-signed cert so Nginx can boot, obtain
# the real cert through it, delete the throwaway, then reload.
#
# Routine renewal afterward is fully automatic (see the `certbot` service
# in docker-compose.yml) — you only run this script once, or again if you
# ever change domains.

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [ -z "${DOMAIN:-}" ] || [ -z "${CERTBOT_EMAIL:-}" ]; then
  echo "DOMAIN and CERTBOT_EMAIL must be set in .env first. See .env.example." >&2
  exit 1
fi

echo "==> Creating a throwaway self-signed certificate for $DOMAIN so Nginx can start..."
docker compose run --rm --entrypoint "sh -c '\
  mkdir -p /etc/letsencrypt/live/$DOMAIN && \
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout /etc/letsencrypt/live/$DOMAIN/privkey.pem \
    -out /etc/letsencrypt/live/$DOMAIN/fullchain.pem \
    -subj /CN=localhost'" certbot

echo "==> Starting Nginx with the throwaway certificate..."
docker compose up -d frontend

echo "==> Waiting for Nginx to be reachable..."
sleep 5

echo "==> Deleting the throwaway certificate..."
docker compose run --rm --entrypoint "sh -c '\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf'" certbot

echo "==> Requesting the real Let's Encrypt certificate for $DOMAIN..."
echo "    (This will fail if port 80 isn't actually reachable from the public"
echo "     internet yet — double-check your router's port forwarding first.)"
docker compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot \
    -d $DOMAIN \
    --email $CERTBOT_EMAIL \
    --agree-tos \
    --no-eff-email \
    --non-interactive" certbot

echo "==> Reloading Nginx to pick up the real certificate..."
docker compose exec frontend nginx -s reload

echo ""
echo "Done. Your app should now be reachable at https://$DOMAIN"
echo "Certificate renewal is automatic from here on (the 'certbot' service checks twice daily)."
