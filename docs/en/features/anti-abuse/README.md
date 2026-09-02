# Anti-Abuse Guard

Anti-Abuse Guard detects signup abuse, disposable email usage, suspicious IP/device patterns, and credit farming.

## Purpose

- Block obvious abuse before sending verification email.
- Detect deeper signup abuse after registration.
- Reclaim granted credits when abuse is confirmed.

## Dependencies

- Auth user data.
- Database for signup history.
- Velobase Billing for credit reclaim.
- Optional Cloudflare Turnstile.

## Code

```text
src/server/features/anti-abuse/
├── email-guard.ts
├── signup-guard.ts
└── index.ts
```

## AI Rules

- Tune policy constants in the relevant guard file.
- Keep guard decisions explainable through logs and return values.
- Do not block legitimate shared-network users too aggressively without product approval.
- Read `docs/en/integrations/security/README.md` before changing security boundaries.
