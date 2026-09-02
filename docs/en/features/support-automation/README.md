# Support Automation

Support Automation turns inbound support email into tickets, lets an AI agent draft or send replies, and routes approval actions through Lark when configured.

## Purpose

- Pull new support email from IMAP.
- Create or update support tickets and timelines.
- Run the support agent for classification, context lookup, and reply drafting.
- Send approved or auto-approved replies through SMTP.

## Enablement

The feature is controlled by `MODULES.features.supportAutomation`.

- `SUPPORT_AUTOMATION_MODE=auto` enables the feature only when the required mailbox and AI config are present.
- `SUPPORT_AUTOMATION_MODE=off` disables the feature.
- `SUPPORT_AUTOMATION_MODE=on` forces the feature on and fails startup if required dependencies are missing.
- Lark approval cards require `MODULES.integrations.messaging.lark.enabled`.
- Full automation currently requires support mailbox credentials and `OPENROUTER_API_KEY`.

Required config for `auto` and `on`:

- `SUPPORT_EMAIL_ADDRESS`
- `SUPPORT_EMAIL_PASSWORD`
- `SUPPORT_IMAP_HOST`
- `SUPPORT_SMTP_HOST`
- `OPENROUTER_API_KEY`

Optional mailbox defaults:

- `SUPPORT_IMAP_PORT` defaults to `993`.
- `SUPPORT_SMTP_PORT` defaults to `465`.
- `SUPPORT_EMAIL_FROM` defaults to the product support address.

## Dependencies

- Database support ticket tables.
- Support mailbox IMAP/SMTP settings.
- OpenRouter configuration for the support agent.
- Optional Lark/Feishu for approval cards and internal threads.

## Workers

```text
support-sync    -> pulls IMAP email and enqueues support-process
support-process -> runs the support agent and enqueues support-send when appropriate
support-send    -> sends SMTP replies and updates ticket state
```

When the feature is disabled, the worker service does not register these queues or schedulers, and the standalone Lark support webhook returns 404.

These workers are exposed as module `WorkerContribution` entries; `src/workers/start.ts` collects them from the module catalog.

## Code

```text
src/server/support/
src/workers/features/support-automation.ts
src/workers/queues/support-*.queue.ts
src/workers/processors/support-*/
```

## AI Rules

- Keep ticket state transitions idempotent.
- Do not send customer email outside `support-send`.
- Keep Lark approval actions gated by `MODULES.features.supportAutomation`.
- Read `docs/en/integrations/email/README.md` and `docs/en/integrations/queue/README.md` before changing mailbox or worker behavior.
