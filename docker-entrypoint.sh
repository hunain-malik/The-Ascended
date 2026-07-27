#!/bin/sh
# Boot sequence for the production container:
#   1. make sure the persistent dirs exist and the sqlite schema is applied
#   2. start the web app
#   3. start the Telegram / Drive sync workers IF their credentials are set
#      (each in a restart loop — a flaky network kill must not take sync down)
# The container lives and dies with the web process.
set -eu

DB_FILE=$(printf '%s' "${DATABASE_URL:-file:/app/storage/data/ascended.db}" | sed 's/^file://')
mkdir -p "$(dirname "$DB_FILE")" "${MEDIA_DIR:-/app/storage/media}" /app/storage/secrets

echo "==> applying database schema ($DB_FILE)"
npx prisma db push --skip-generate

echo "==> starting web app on port ${PORT:-3000}"
node_modules/.bin/next start -p "${PORT:-3000}" &
WEB_PID=$!

if [ -n "${TG_SESSION:-}" ] && [ -n "${TG_API_ID:-}" ] && [ -n "${TG_API_HASH:-}" ]; then
  echo "==> starting telegram sync worker"
  ( while true; do
      npx tsx scripts/sync-telegram.ts || echo "telegram sync exited ($?)"
      echo "    restarting telegram sync in 15s"; sleep 15
    done ) &
else
  echo "==> telegram sync disabled (set TG_API_ID / TG_API_HASH / TG_SESSION to enable)"
fi

if [ -f "${GOOGLE_TOKEN_PATH:-/app/storage/secrets/google-token.json}" ]; then
  echo "==> starting drive sync worker"
  ( while true; do
      npx tsx scripts/sync-drive.ts || echo "drive sync exited ($?)"
      echo "    restarting drive sync in 30s"; sleep 30
    done ) &
else
  echo "==> drive sync disabled (no token at ${GOOGLE_TOKEN_PATH:-/app/storage/secrets/google-token.json})"
fi

wait "$WEB_PID"
