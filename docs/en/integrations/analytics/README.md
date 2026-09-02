# Analytics Integration

Analytics uses PostHog for client/server events and feature flags.

## Use

- Client analytics use `track()` from `@/analytics`.
- Server analytics use `safeTrack()` from `@/analytics/server`.
- Never import `@/analytics` in server code.
- Define new analytics events under `src/analytics/events/` before using them.

## Configuration

Common settings:

- Client PostHog key and host.
- Optional server PostHog key for backend events.
- Feature flag settings where needed.

Update `.env.example` and `src/env.js` for new settings.

## Rules

- Analytics should not block core business flows.
- Server tracking should fail safely and log only non-sensitive context.
- Product events should have stable names and typed payloads.
- Core flows should emit domain events; pluggable analytics modules subscribe to them.
