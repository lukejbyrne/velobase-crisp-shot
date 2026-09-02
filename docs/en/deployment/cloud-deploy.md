# Deploy To Velobase Cloud

This guide is the English canonical deployment entry for Velobase Harness.

Use the Velobase Cloud CLI for project setup, adaptation, deployment checks, and operations.

## 1. Install The CLI

```bash
npm install -g @velobaseai/cloud-cli@latest
```

The CLI binary is `velobase-cloud`.

## 2. Sign In And Connect GitHub

```bash
velobase-cloud login
velobase-cloud github connect
```

The CLI uses browser-based login and stores local credentials under `~/.velobase-cloud/`.

Check project slot and billing status:

```bash
velobase-cloud billing
```

Velobase Cloud uses a project/month model. Each initialized project consumes one project slot and receives dedicated PostgreSQL, dedicated Redis, and an app compute budget. New accounts can use free trial slots; when no slot is available, the CLI links you to the billing page to purchase a project slot.

## 3. Initialize The Project

Run this from your Harness repository root:

```bash
velobase-cloud init
```

`init` scans the project, detects Velobase Harness, consumes an available project slot, creates a Cloud project and dedicated infrastructure, writes `.github/workflows/deploy-velobase.yml`, configures GitHub secrets when possible, and stores project binding under `.velobase/config.json`.

## 4. Adapt For Cloud

- Install dependencies with `pnpm install`.
- Configure `.env` from `.env.example`.
- Confirm database, Redis, auth, and any required provider keys are available.
- Run the relevant checks from `docs/en/ai/completion-checklist.md`.

Generate AI deployment context:

```bash
velobase-cloud adapt
```

This writes `.velobase/ai-prompt.md`. Open it in the IDE and let the local AI adapt the project to Cloud constraints when needed.

## 5. Choose A Runtime Mode

Use `SERVICE_MODE`:

- `web,worker` for the default combined runtime without the optional API service.
- `web` and `worker` for split production deployments.
- `api` only after adding real Hono routes that need a separate service.
- `all` when you explicitly want Web, API, and Worker in one process.
- `web,api` or other comma-separated combinations when needed.

See `docs/en/architecture/web-api-service-split.md`.

## 6. Verify

Before deploy:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

If schema changed, ensure migrations are committed and deploy with `prisma migrate deploy`.

Then run the CLI readiness check:

```bash
velobase-cloud doctor
```

`doctor` checks deployment requirements such as Dockerfile, port `3000`, health endpoint, migration setup, workflow, secrets, and environment validation.

## 7. Deploy

The default deployment path is GitHub Actions:

```bash
git push origin main
```

You can also trigger a deployment from the CLI:

```bash
velobase-cloud deploy trigger --branch main --watch
```

The canonical GitHub Actions workflow is `.github/workflows/deploy-velobase.yml`. It deploys the default Web + Worker shape, exposes `web`, and keeps only this workflow attached to `push` on `main` to avoid duplicate deployments from one commit.

The Deploy API requires every service to declare `cpu_request`, `memory_request`, `cpu_limit`, and `memory_limit`. The workflow reads `appBudget` from `/api/v1/deploy/config`, splits requests evenly across `web` and `worker`, and keeps each service limit equal to its request. Kubernetes quota counts limits as well as requests, so setting both services to the full app budget can make the second pod fail quota admission.

Deployment workflows should validate `/api/v1/deploy/config` before building images. `dataPlaneMode` must be `project`; if the Deploy API returns `PROJECT_DATA_PLANE_REQUIRED`, the API key is bound to a legacy shared project and the project must be migrated or re-created as a project data-plane project before using the Deploy API.

In split Web + Worker deploys, Web listens on `3000`, uses the platform HTTP probe on `/healthz`, and runs `prisma migrate deploy` before starting `server.js`; Worker listens on `3001`, uses an `exec` probe, and does not run migrations. Set `SKIP_MIGRATION=true` only when another release step has already applied migrations.

Add the API service only when standalone Hono routes are active; then include an API service entry with `mode: "api"` and `port: 3002`, and redistribute the app budget across Web, API, and Worker. Keep `exposed_service` as `web` unless the primary domain (`{subdomain}.velobase.app`) should route directly to API.

## 8. Operate

Use the CLI for status, deployment runs, logs, environment variables, and rollback:

```bash
velobase-cloud status
velobase-cloud deploy runs
velobase-cloud logs deploy
velobase-cloud logs pods
velobase-cloud env list
velobase-cloud billing
velobase-cloud deploy rollback <deployment-id>
```

- Check Web `/healthz` and Worker process logs. Worker is deployed with an `exec` probe; its `3001` HTTP health server is for local diagnostics and optional direct inspection, not the primary Cloud readiness contract. Check API health only when the optional API service is enabled.
- If commands return `PROJECT_OVERDUE`, restore the project subscription before deploying or applying environment changes.
- Confirm required modules initialize from logs.
- For production issues, collect Cloud runtime logs first, then follow `docs/en/debugging/online-local-debug.md`.
