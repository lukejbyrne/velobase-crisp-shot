# Touch Lifecycle

Touch Lifecycle manages scheduled user lifecycle messages such as renewal reminders and delayed operational notifications.

## Purpose

- Store touch scenes, templates, schedules, and delivery records.
- Process due schedules from a worker with idempotent locks.
- Send lifecycle email through the framework email abstraction.
- Cancel pending schedules when the owning domain state changes.

## Enablement

The feature is controlled by `MODULES.features.touch`.

- `TOUCH_MODE=auto` enables the feature by default.
- `TOUCH_MODE=off` disables the feature.
- `TOUCH_MODE=on` forces the feature on and fails startup if required dependencies are missing.
- When disabled, the worker does not register `touch-delivery`, and touch service entry points return no-op skipped results.

## Dependencies

- Database touch tables.
- Email integration for email delivery.
- Owning domain events, such as subscription cancellation.

## Workers

```text
touch-delivery -> scans due schedules every minute and processes a bounded batch
```

`touch-delivery` belongs to this feature, not to the generic worker platform. The stale job cleanup worker remains platform-owned.

The worker is exposed as a module `WorkerContribution`; `src/workers/start.ts` does not import this feature directly.

## Code

```text
src/server/touch/
src/server/modules/touch.ts
src/workers/features/touch.ts
src/workers/queues/touch-delivery.queue.ts
src/workers/processors/touch-delivery/
```

## AI Rules

- Keep schedule claiming idempotent.
- Do not bypass `@/server/email` for product lifecycle email.
- Gate new touch side effects through `MODULES.features.touch`.
- Read `docs/en/integrations/email/README.md` and `docs/en/integrations/queue/README.md` before changing delivery behavior.
