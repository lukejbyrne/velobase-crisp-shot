# Headshots Module (CrispShot)

Turns one uploaded portrait into a batch of professional AI headshots, each one
billed as an independent credit transaction.

This is the only product-specific code in the repository. Authentication,
Stripe checkout, credits, background workers, transactional email, admin tools,
analytics, affiliates and anti-abuse all come from Velobase Harness unchanged.

## Phase 0 record

```yaml
product:
  name: CrispShot
  one_liner: Studio-quality professional headshots from a single portrait photo.
  target_users: [founders, freelancers, job_seekers]
  core_user_stories:
    - As a job-seeker I upload one portrait and get four professional headshots.
    - As a founder I pick a style that matches how I want to be seen.
    - As a user I watch each image move through queued, processing, completed or failed.
    - As a user I browse and download my results from a private gallery.
    - As a buyer I see available, frozen and used credits, and a transaction history.
  business_model: credits
  ai_capabilities: [image_generation]
  target_regions: [global]
  third_party_services: [stripe, wavespeed, velobase_billing, resend, r2]

domains:
  user: reuse_framework          # NextAuth + email verification, no custom roles
  billing: configure             # credit packs reseeded; freeze/consume/unfreeze reused
  operations: design_needed      # product domain events
  integrations: configure
  non_functional: reuse_framework

billing:
  model: credits
  skus:
    - { key: prod-credits-atomic-001,  type: credit_pack, price: "$9",  credits: 8,   validity: never_expires }
    - { key: prod-credits-starter-001, type: credit_pack, price: "$19", credits: 20,  validity: never_expires }
    - { key: prod-credits-popular-001, type: credit_pack, price: "$39", credits: 60,  validity: never_expires }
    - { key: prod-credits-studio-001,  type: credit_pack, price: "$79", credits: 150, validity: never_expires }
  credit_rules:
    - operation: generate_headshot_image
      cost: 1
      reason: One credit per successfully generated image; refunded on failure.
```

## The credit lifecycle

This is the part worth reading carefully. Every image in a batch is its own
transaction, and the `HeadshotImage` row id **is** the Velobase transaction id.
That single decision is what makes the whole path idempotent without a lock or a
dedupe table.

```text
createBatch                        worker (per image)
─────────────                      ──────────────────
check balance  ──┐
create batch     │                 freeze already held
create 4 images  │                        │
freeze × 4  ─────┘                        ▼
  creditState = FROZEN            generate (idempotencyKey = headshot_<imageId>)
                                          │
                                    ┌─────┴─────┐
                                success      failure
                                    │             │
                          record image row   mark FAILED
                          (still FROZEN)          │
                                    │        unfreeze
                                consume      creditState = UNFROZEN
                          creditState = CONSUMED
```

Why it holds up:

- **Reserve before work, settle after.** Credits are frozen when the batch is
  created, so the user learns immediately if they cannot afford it and the
  balance cannot be spent twice while the batch runs.
- **Persist the result before charging.** If `consume` fails, a retry finds a
  `COMPLETED` image still holding a `FROZEN` credit and finishes only the billing
  half — it does not pay the provider again.
- **Retries cannot double-render.** `imageGeneration.createTask` is called with a
  stable `idempotencyKey`, so a retried job re-attaches to the existing provider
  task.
- **Retries cannot double-charge.** Velobase keys freeze / consume / unfreeze off
  the transaction id and reports replays as idempotent.
- **Partial reservations are rolled back.** If the third of four freezes fails,
  the first two are released and the batch fails as a whole.
- **Nothing is stranded.** Freezes carry an `unfreezeAfterSeconds` TTL, so a
  worker that dies mid-flight releases the hold on its own.
- **Transient vs permanent failures differ.** Transient errors are rethrown so
  BullMQ retries with the credit still frozen; the final attempt (or a permanent
  provider failure) settles and refunds.

## Layout

```text
src/modules/headshots/
├── README.md
├── styles.ts                  # style catalogue + prompt builder (shared client/server)
├── server/
│   ├── config.ts              # env-derived provider/model/batch settings
│   ├── credits.ts             # freeze / consume / unfreeze wrappers
│   ├── schema.ts              # Zod router inputs
│   ├── service.ts             # business rules + settlement helpers
│   ├── service.test.ts
│   └── router.ts              # tRPC, mounted as `headshots` in src/server/api/root.ts
├── worker/
│   ├── constants.ts           # queue name + retry budget (no Redis import)
│   ├── queue.ts               # BullMQ queue, created lazily
│   ├── processor.ts           # one job per image
│   ├── processor.test.ts
│   └── index.ts
└── components/                # studio, gallery, credits, landing-page pieces
```

Framework wiring lives outside the module:

| Concern | File |
| --- | --- |
| Router mount | `src/server/api/root.ts` |
| Queue export | `src/workers/queues/index.ts` |
| Processor export | `src/workers/processors/index.ts` |
| Worker contribution | `src/workers/features/headshots.ts` |
| Module enablement | `src/server/modules/catalog.ts` (`headshots`) |
| Domain events | `src/server/events/bus.ts` |
| Upload endpoint | `src/app/api/headshots/upload/route.ts` |
| Pages | `src/app/{page,pricing,studio,gallery,credits}` |

## Data model

`prisma/schema.prisma`:

- `HeadshotBatch` — one source portrait rendered in one style, fanned out into
  `requestedCount` images. Holds derived counters and the provider/model used.
- `HeadshotImage` — one billed image. `creditState` mirrors the Velobase
  lifecycle locally so the worker stays idempotent and the UI can explain where
  a credit currently sits.

Migration: `prisma/migrations/20260902123930_add_headshots`.

## API

All procedures are on the `headshots` tRPC router.

| Procedure | Type | Access | Notes |
| --- | --- | --- | --- |
| `settings` | query | public | Style catalogue, batch size, upload limits |
| `credits` | query | protected | Available / frozen / used / total |
| `createBatch` | mutation | protected | Reserves credits, then enqueues |
| `getBatch` | query | protected | Polled while the batch is running |
| `listBatches` | query | protected | Cursor paginated |
| `listImages` | query | protected | Cursor paginated, completed images only |
| `getDownloadUrl` | mutation | protected | Short-lived signed URL |

Credit balance and history in the UI come from the framework's own
`billing.getBalance` and `billing.getRecords`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `HEADSHOTS_MODE` | `auto` | `off` / `auto` / `on`. `auto` requires the `image-generation` module |
| `HEADSHOT_IMAGE_PROVIDER` | `wavespeed` | Provider id passed to `@/server/ai/image-generation` |
| `HEADSHOT_IMAGE_MODEL` | `openai/gpt-image-2/edit` | Provider model used for the portrait edit |
| `HEADSHOT_IMAGE_RESOLUTION` | unset | `1k` / `2k` / `4k` |
| `HEADSHOT_IMAGE_ASPECT_RATIO` | `1:1` | Output aspect ratio |
| `HEADSHOT_BATCH_SIZE` | `4` | Images per batch; each costs one credit |
| `HEADSHOT_FREEZE_TTL_SECONDS` | `86400` | Auto-unfreeze safety net for stranded holds |
| `HEADSHOT_DEV_ALLOW_FORCED_FAILURE` | `false` | Development-only forced-failure switch |

No provider secret is ever exposed to the browser: the client only ever sees the
style catalogue and the numbers above.

## Demonstrating the refund path

`HEADSHOT_DEV_ALLOW_FORCED_FAILURE=true` (outside production) adds a checkbox to
the studio. When ticked, the first image of the batch fails deliberately: three
images complete and consume a credit each, and the fourth is marked failed with
its credit returned. Both conditions are required — the switch is inert whenever
`NODE_ENV=production`, so it cannot be enabled in a production deployment by
configuration alone.

## Tests

```bash
pnpm test:unit
```

- `server/service.test.ts` — ownership, insufficient balance, partial-reservation
  rollback, concurrency cap, batch status derivation, download authorisation.
- `worker/processor.test.ts` — success charges exactly once, retries never
  double-render or double-charge, half-settled retries complete only the missing
  half, transient vs permanent failure handling, forced-failure refund.
