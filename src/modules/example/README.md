# Example Business Module

This is a small reference module that shows the expected shape of a product-specific feature under `src/modules/<name>/`.

Before creating a real module, read:

- [`docs/en/ai/new-module.md`](../../../docs/en/ai/new-module.md) for the full module creation flow.
- [`docs/en/conventions/api.md`](../../../docs/en/conventions/api.md) for tRPC / HTTP API conventions.
- [`docs/en/integrations/queue/README.md`](../../../docs/en/integrations/queue/README.md) if the module needs background jobs.

## Structure

```
src/modules/example/
├── README.md                  # This file
├── server/
│   ├── router.ts              # tRPC router (API endpoints)
│   └── service.ts             # Business logic layer
├── worker/
│   ├── queue.ts               # BullMQ queue definition
│   ├── processor.ts           # Job processor
│   └── index.ts               # Export barrel
└── components/
    └── example-page.tsx       # React page component
```

## Integration Points

- Register the tRPC router in `src/server/api/root.ts`.
- Export worker queues from `src/workers/queues/index.ts` if the module has background jobs.
- Export processors from `src/workers/processors/index.ts` and wire them in `src/workers/index.ts`.
- Create an App Router page under `src/app/` that imports the module component.

Keep product logic inside the module service layer, keep routers thin, and route side effects through framework abstractions such as queues, storage, email, billing, and events.
