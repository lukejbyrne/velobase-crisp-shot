# Ads Integration

Ads integration covers attribution and conversion upload for providers such as Google Ads and Twitter/X Ads.

## Use

- Client conversion helpers live under analytics/ads abstractions.
- Server-side offline conversion upload should go through framework queues or provider modules.
- Do not call ad provider SDKs directly from payment or order core flows.

## Configuration

Common settings:

- Frontend conversion IDs and labels.
- Google Ads customer and conversion configuration.
- Optional API credentials for server-side upload.

Update `.env.example`, `src/env.js`, and module enablement when adding provider configuration.

Module modes:

- `GOOGLE_ADS_MODE=auto|off|on` controls Google Ads event handling and worker registration.
- `auto` requires the Google Ads customer ID and developer token.

## Workers

Google Ads upload is owned by the Google Ads integration and is registered from `src/workers/integrations/google-ads.ts`.

| Worker              | Purpose                                                                                 | Enablement                |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------- |
| `google-ads-upload` | Flush Redis pending buffers into Google Ads offline conversion and web enhancement APIs | Google Ads module enabled |

The business event path does not enqueue BullMQ jobs directly. `payment:succeeded` writes payment IDs into Redis ZSET buffers through `src/server/ads/google-ads/queue.ts`; the worker runs every 5 minutes and uploads batches.

The upload worker is exposed as a module `WorkerContribution`; `src/workers/start.ts` collects it from the module catalog.

## Rules

- Payment/order flows emit domain events.
- Ads modules subscribe to events and upload conversions.
- Conversion upload must be idempotent and deduplicated by order, user, or provider event identifiers.
- Provider failures should not fail payment or entitlement delivery.
