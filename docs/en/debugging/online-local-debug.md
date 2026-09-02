# Production-To-Local Debugging

Use this workflow when debugging production issues from Velobase Cloud or another hosted runtime.

## Core Flow

1. Collect the latest runtime logs from Cloud.
2. Identify the failing service: Web, API, or Worker.
3. Reproduce locally with Docker database and Redis when possible.
4. Apply the smallest fix.
5. Run targeted checks.
6. Push and verify in Cloud.

## 1. Collect Logs

Ask for:

- Web runtime logs for page, React, tRPC, auth, Next Route Handler, and current production webhook issues.
- API runtime logs only for optional Hono routes under `src/api/routes/*`.
- Worker logs for queues, processors, schedulers, payment reconciliation, email, ads, or touch jobs.

Do not guess from screenshots alone when runtime logs are available.

## 2. Reproduce Locally

Start local infrastructure:

```bash
pnpm docker:db:up
pnpm db:push
pnpm dev:all
```

Use split commands when the issue is service-specific:

```bash
pnpm dev
pnpm worker:dev
```

Start `pnpm api:dev` only when the failing path is an optional Hono API route.

## 3. Fix

- Keep the fix scoped to the failing boundary.
- Do not add product-specific behavior to framework generic layers.
- Avoid changing env or schema unless the failure requires it.
- For payment, auth, webhook, or worker bugs, check idempotency and retry behavior.

## 4. Verify

Run the narrowest commands that match the fix:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Also run targeted tests or manual reproduction steps when available.

## 5. Cloud Verification

After push/deploy:

- Confirm the failing path is fixed.
- Confirm logs no longer show the same error.
- Confirm no related service regressed.

Related docs:

- `docs/en/integrations/database/README.md`
- `docs/en/architecture/web-api-service-split.md`
- `docs/en/ai/completion-checklist.md`
