# Email Integration

Email delivery is exposed through a framework abstraction so product code does not call provider SDKs directly.

Supported providers:

- Resend.
- SendGrid.

## Use

- Send email through `sendEmail()` from `@/server/email`.
- Keep templates in the framework email template structure.
- Do not import Resend or SendGrid SDKs directly from product modules.

## Configuration

Common environment variables:

- `RESEND_API_KEY`
- `SENDGRID_API_KEY`
- provider-specific webhook or domain settings when enabled.

Support Automation uses a dedicated mailbox instead of the generic outbound
provider chain:

- `SUPPORT_EMAIL_ADDRESS`
- `SUPPORT_EMAIL_PASSWORD`
- `SUPPORT_IMAP_HOST`
- `SUPPORT_SMTP_HOST`
- optional `SUPPORT_IMAP_PORT`, `SUPPORT_SMTP_PORT`, `SUPPORT_EMAIL_FROM`

Update `.env.example` and `src/env.js` for new email settings.

## Rules

- Email sending should be retry-safe.
- Critical email side effects should use workers when they need retries.
- Provider failures should be logged without exposing API keys or message private data.
- If email is part of auth, also read `docs/en/integrations/auth/README.md`.
