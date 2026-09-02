# Conversion Alert

Conversion Alert generates business conversion reports and delivers them through Lark when the messaging integration is enabled.

## Purpose

- Generate hourly conversion metrics.
- Generate the daily report at the Los Angeles midnight boundary.
- Deliver reports to configured Lark/Feishu chats.

## Enablement

The feature is controlled by `MODULES.features.conversionAlert`.

- `CONVERSION_ALERT_MODE=auto` enables the feature when Lark is enabled.
- `CONVERSION_ALERT_MODE=off` disables report delivery and worker registration.
- `CONVERSION_ALERT_MODE=on` forces the feature on and fails startup if Lark is not enabled.
- `LARK_MODE=off` also disables report delivery and worker registration because Lark is a required delivery dependency.

## Workers

```text
conversion-alert -> hourly schedule, sends hourly or daily report depending on LA time
```

The worker belongs to this feature. Lark is only the report delivery channel.

The worker is exposed as a module `WorkerContribution`; `src/workers/start.ts` does not import this feature directly.

## Code

```text
src/workers/features/conversion-alert.ts
src/workers/queues/conversion-alert.queue.ts
src/workers/processors/conversion-alert/
```

## AI Rules

- Keep report generation separate from Lark delivery.
- Gate scheduled delivery by both Conversion Alert and Lark enablement.
- Do not put payment or ads upload side effects in this feature.
