#!/bin/sh
set -e

run_prisma() {
  if [ -x ./node_modules/.bin/prisma ]; then
    ./node_modules/.bin/prisma "$@"
  elif command -v prisma >/dev/null 2>&1; then
    prisma "$@"
  else
    npx prisma "$@"
  fi
}

if [ "$SKIP_MIGRATION" = "true" ]; then
  echo "[web-entrypoint] SKIP_MIGRATION=true, skipping database migrations"
else
  echo "[web-entrypoint] Running prisma migrate deploy..."
  if run_prisma migrate deploy; then
    echo "[web-entrypoint] Migrations complete"
  else
    if [ "$MIGRATION_OPTIONAL" = "true" ]; then
      echo "[web-entrypoint] WARNING: Migration failed but MIGRATION_OPTIONAL=true, continuing..."
    else
      echo "[web-entrypoint] ERROR: Migration failed, exiting"
      exit 1
    fi
  fi
fi

exec node server.js
