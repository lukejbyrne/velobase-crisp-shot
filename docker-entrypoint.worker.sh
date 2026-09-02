#!/bin/sh
set -e

# --- Database seed ---
# The split web image runs `prisma migrate deploy` but cannot seed: prisma/seed.ts
# imports ../src/env.js and bcryptjs, neither of which exists in the Next.js
# standalone output. The worker image has the full prod dependency tree and the
# src/ tree it needs, so seeding happens here instead.
#
# Seeds are idempotent upserts, so re-running on every worker start is safe.
# Set SKIP_SEED=true to opt out (e.g. when another release step handles it).
if [ "$SKIP_SEED" = "true" ]; then
  echo "[worker-entrypoint] SKIP_SEED=true, skipping database seed"
else
  # Web applies migrations at its own startup, so the tables may not exist yet on
  # a first deploy. Retry briefly rather than racing it — the budget is kept
  # small so a hard database outage cannot delay worker startup into a failed
  # readiness probe. A seed missed here is retried on the next worker start.
  attempt=1
  max_attempts=3
  while [ "$attempt" -le "$max_attempts" ]; do
    echo "[worker-entrypoint] Running database seed (attempt $attempt/$max_attempts)..."
    if node --import tsx prisma/seed.ts; then
      echo "[worker-entrypoint] Seed complete"
      break
    fi

    if [ "$attempt" -eq "$max_attempts" ]; then
      # A failed seed must never stop the worker: queued jobs still need
      # processing, and the next restart retries the seed.
      echo "[worker-entrypoint] WARNING: Seed failed after $max_attempts attempts, continuing without it"
      break
    fi

    echo "[worker-entrypoint] Seed failed, retrying in 5s..."
    sleep 5
    attempt=$((attempt + 1))
  done
fi

exec node --import tsx src/workers/index.ts
