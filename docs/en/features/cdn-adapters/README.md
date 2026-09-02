# CDN Adapters

CDN Adapters normalize request context across Cloudflare, Vercel, Nginx, and local development.

## Capabilities

- Extract client IP.
- Extract country code.
- Detect Cloudflare Flexible SSL.
- Decide cookie `secure` behavior.
- Normalize IP for rate limiting.

## Code

```text
src/server/features/cdn-adapters/
├── request-context.ts
└── index.ts
```

Compatibility exports may exist under older server lib paths.

## Use

```ts
import {
  getClientIpFromHeaders,
  getClientCountryFromHeaders,
  shouldCookieBeSecure,
} from "@/server/features/cdn-adapters";
```

## AI Rules

- Prefer CDN-injected trusted headers when available.
- Do not hand-roll IP parsing in auth, rate limit, or security code.
- If `COOKIE_SECURE` behavior changes, test login in the target deployment mode.
