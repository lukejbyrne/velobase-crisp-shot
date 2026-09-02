# AI Development Completion Checklist

Use this after finishing a feature, bug fix, refactor, or integration, and before commit, push, PR, or deployment.

The goal is not to run every possible command. Confirm that the change is correct and respects database, deployment, and security boundaries.

## 1. Scope Check

- Review `git diff`.
- Confirm no unrelated files, temporary logs, debug code, or formatting noise are included.
- Do not revert user changes unless explicitly requested.
- If framework shared code changed, confirm product-specific logic did not leak into generic layers.
- If dependencies changed, confirm they are necessary and lockfile changes match.

## 2. Quality Commands

Run from the project root when practical:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

For documentation-only changes, a build can be skipped; check links and command examples instead.

Also consider:

```bash
pnpm format:check
```

If tests exist or were added, run the narrowest relevant test command.

## 3. Prisma And Database

If `prisma/schema.prisma` changed:

- Commit `prisma/migrations/<timestamp>_<name>/migration.sql`.
- Do not rely only on `pnpm db:push` or `npx prisma db push` for deployable changes.
- Run `npx prisma generate` or confirm the deploy flow regenerates Prisma Client.
- For required fields, confirm the data migration is safe.
- Handwritten migrations should be idempotent when possible.

## 4. Runtime Configuration

If environment variables changed:

- Update `.env.example`.
- Update `src/env.js`; do not read `process.env` directly in application code.
- Fail early in production or have a clear module-disable path.
- If the env controls a pluggable module, manage enablement in `src/config/modules.ts`.
- Confirm the intended `SERVICE_MODE`. The default is `web,worker`; enable `api` only when real Hono routes need a standalone service.

## 5. API And Permissions

For tRPC, Hono, Next.js API routes, or Server Actions:

- Mutations use `protectedProcedure` unless intentionally public.
- User input is validated with Zod or equivalent.
- List queries are paginated.
- Errors do not leak secrets, tokens, connection strings, or sensitive provider responses.
- New routers are mounted and disabled modules do not expose routes.
- New external HTTP or webhook endpoints should stay in Web unless there is a clear reason to enable the optional Hono API service.

## 6. Security And Data Boundaries

High-risk areas:

- Auth: do not store sensitive tokens in client state or local storage.
- Payment: do not call payment SDKs from frontend code; webhook signatures are verified; entitlement delivery goes through fulfillment/billing services.
- File upload: validate file type, size, and access permissions; use storage abstraction.
- Admin: permissions cover page, API, and operation entry points.
- Logs: do not print API keys, sessions, JWTs, card data, or private user data.

## 7. Modules And Side Effects

For notifications, analytics, ads, or automation:

- Use `appEvents.emit()` and pluggable module subscribers.
- Do not call PostHog, Google Ads, Lark, Telegram, or similar modules directly from core flows.
- Add `EventPayload` types for new events.
- Event handler errors should be logged and should not break core business flows.

## 8. Workers And Queues

If background jobs changed:

- Export new queues from `src/workers/queues/index.ts`.
- Export processors from `src/workers/processors/index.ts`.
- Create workers through `createWorkerInstance()`.
- Jobs are idempotent.
- Retry and permanent failure behavior is observable.
- `SERVICE_MODE=worker` does not depend on Next.js-only APIs.

## 9. Frontend And Internationalization

For UI changes:

- User-visible copy uses `useTranslations()` or `getTranslations()`.
- Loading, empty, error, and unauthorized states exist.
- Forms prevent duplicate submit or show loading state.
- Narrow layouts are basically usable.
- Navigation and SEO metadata are updated when needed.

## 10. Documentation And Seed Data

If usage changed:

- Update the relevant README, integration doc, or framework guide.
- Document new config, webhooks, and third-party setup.
- Keep seed scripts idempotent when default data changes.
- Ensure examples and commands match the current project structure.

## 11. Manual Verification

Run at least one real path for the change type:

- Login/register/permissions: page or API path.
- Payment/subscription/refund: test-mode full path.
- Database: migration and key query.
- Worker: enqueue and process one job.
- Webhook: test event or local forwarder.

## 12. Before Commit

- `git status` contains only task-related files.
- No `.env`, secrets, private certificates, local database files, or temporary exports.
- Lockfile changes match dependency changes.
- Migrations, seeds, docs, and code match.
- Final response says which checks were run and which were skipped.
