# CDN 适配

CDN Adapters 统一 Cloudflare、Vercel、Nginx 和本地开发环境下的 request context。

## 能力

- 提取 client IP。
- 提取 country code。
- 检测 Cloudflare Flexible SSL。
- 决定 cookie `secure` 行为。
- 为 rate limiting 规范化 IP。

## 代码

```text
src/server/features/cdn-adapters/
├── request-context.ts
└── index.ts
```

旧 server lib 路径下可能保留兼容 re-export。

## 使用

```ts
import {
  getClientIpFromHeaders,
  getClientCountryFromHeaders,
  shouldCookieBeSecure,
} from "@/server/features/cdn-adapters";
```

## AI 规则

- 优先使用 CDN 注入的可信 headers。
- Auth、rate limit 或 security code 中不要手写 IP 解析。
- 如果修改 `COOKIE_SECURE` 行为，在目标部署模式下测试登录。
