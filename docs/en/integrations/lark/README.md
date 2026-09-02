# Lark / Feishu Integration

Lark / Feishu is the internal notification and approval channel. It should extend owning features; it should not become the owner of payment, support, ads, or analytics behavior.

## Use

- Payment success/failure notifications subscribe to payment domain events.
- Support approval cards are available only when Support Automation is enabled.
- Conversion reports are available only when Conversion Alert is enabled.
- Payment reconciliation reports are available only when Payment Reconciliation and Lark are enabled.

## Configuration

Common environment variables:

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_USE_FEISHU`
- `LARK_DEFAULT_CHAT_ID`
- `LARK_ENCRYPT_KEY`
- `LARK_VERIFICATION_TOKEN`

Module modes:

- `LARK_MODE=auto|off|on` controls Lark event handlers and notification-backed workers.
- `auto` requires `LARK_APP_ID` and `LARK_APP_SECRET`.

## Worker Ownership

Lark is a delivery channel for these workers:

| Worker                             | Owning feature/integration | Lark role                             |
| ---------------------------------- | -------------------------- | ------------------------------------- |
| `payment-reconciliation`           | Payment integration        | Report delivery                       |
| `conversion-alert`                 | Conversion Alert feature   | Report delivery                       |
| `support-process` / `support-send` | Support Automation feature | Approval and internal thread delivery |

When Lark is disabled, Lark-only notification workers are not registered. Owning features may still exist if they do not require Lark for their core flow.

Notification-backed workers remain owned by their source feature/integration and are exposed as worker contributions there.

## AI Rules

- Do not put payment, support, or ads business logic inside Lark handlers.
- Lark handlers should call owning feature services or queues.
- Keep card actions gated by the owning feature switch and Lark enablement.
- Provider failures should log safely and should not break core payment or entitlement flows.
