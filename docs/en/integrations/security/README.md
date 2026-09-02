# Security Integration

Security integration covers Cloudflare Turnstile, rate limiting, IP/country context, disposable email checks, and anti-abuse boundaries.

## Use

- Use framework security helpers rather than implementing ad hoc checks.
- Login and signup flows should use existing guards.
- Public mutation endpoints should be rate-limited or protected.

## Configuration

Common settings:

- Turnstile site key and secret key.
- Rate limit Redis configuration.
- Optional country or IP-based policies.

Update `.env.example` and `src/env.js` when adding settings.

## Rules

- Do not trust client IP headers without the CDN/request-context helper.
- Do not store secrets in client state.
- Avoid logging sensitive auth, payment, or user privacy data.
- For anti-abuse features, also read `docs/en/features/anti-abuse/README.md`.
