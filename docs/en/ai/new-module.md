# New Business Module Guide

Use this when creating a product-specific module under `src/modules/<name>/`.

If the module touches auth, payment, email, storage, analytics, ads, queue, database, or security, also read the matching `docs/en/integrations/*/README.md`.

## 1. Preconditions

Confirm:

- Module name uses kebab-case.
- Main entity and owner are known.
- Required integrations are known.
- Test coverage target is known.

## 2. Standard Structure

Create only needed folders:

```text
src/modules/<name>/
├── README.md
├── server/
│   ├── schema.ts
│   ├── service.ts
│   ├── router.ts
│   └── service.test.ts
├── worker/
│   ├── queue.ts
│   ├── processor.ts
│   └── index.ts
└── components/
    └── <name>-page.tsx
```

Rules:

- Business logic goes in `server/service.ts`.
- Routers validate input and call services only.
- Add worker files only when async or retryable work is needed.

## 3. Prisma Model

Add product entities to `prisma/schema.prisma`. Do not modify framework-reserved tables unless requested.

Use `cuid()`, ownership fields, timestamps, enums for states, and indexes. Committed schema changes require migrations.

## 4. Zod Schemas

Create `server/schema.ts` for every router input. Never trust client-provided `userId`; derive it from session.

## 5. Service

Create `server/service.ts`.

Rules:

- Services enforce ownership.
- Services throw `TRPCError` for expected business errors.
- Use framework abstractions for billing, queues, storage, email, and events.

## 6. Router

Create `server/router.ts` and register it in `src/server/api/root.ts`.

Rules:

- Reads are queries.
- Writes are mutations.
- Mutations are protected unless intentionally public.
- Router bodies stay thin.

## 7. UI

Create routes in `src/app/` and import module components. User-visible copy must use `useTranslations()` or `getTranslations()`.

## 8. Workers And Events

Workers:

- Read `docs/en/integrations/queue/README.md`.
- Export queues and processors from central worker indexes.
- Use `createWorkerInstance()`.
- Make jobs idempotent.

Events:

- Emit domain events through `appEvents.emit()`.
- Add event payload types.
- Do not call pluggable modules directly from core module code.

## 9. Tests And Completion

Before tests, read `docs/en/ai/testing.md`.

Minimum:

- `server/service.test.ts` for business rules.
- Router integration tests for ownership, auth, or persistence.
- Processor tests for worker jobs.
- E2E only for critical product flows.

Before final response:

- Run the narrowest relevant validation command.
- If schema changed, confirm migration status.
- Run `docs/en/ai/completion-checklist.md`.
