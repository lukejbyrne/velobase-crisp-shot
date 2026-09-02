# Queue Integration

Queues use Redis and BullMQ for background jobs, retries, scheduled work, and compensation tasks.

## Standard Shape

Each queue should have:

- A queue definition.
- A processor function.
- An export from central queue and processor indexes.
- Optional scheduler registration.

## Use

- Create workers through `createWorkerInstance()`, not `new Worker()`.
- Export queues from `src/workers/queues/index.ts`.
- Export processors from `src/workers/processors/index.ts`.
- Feature-owned workers are module contributions declared from `src/workers/features/*`.
- Third-party integration workers are module contributions declared from `src/workers/integrations/*`.
- Worker startup collects enabled module contributions from `src/server/modules/catalog.ts`.
- Repeatable schedulers must provide cleanup so disabled modules remove old Redis repeat jobs.
- Keep processor logic idempotent.

## When To Use Queues

Use queues for:

- Payment compensation.
- Email delivery that needs retry.
- Ads conversion upload.
- Long-running AI or file processing.
- Scheduled cleanup or lifecycle jobs.

## AI Rules

- A repeated job must not double-charge, double-grant, or duplicate irreversible side effects.
- Processor code must not depend on Next.js-only APIs.
- New feature/integration workers should be exposed as `WorkerContribution` entries, not hard-coded in `src/workers/start.ts`.
- Permanent failures should leave useful logs.
- Progress updates are optional but should be tested when used.
