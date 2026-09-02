# 安全集成

Security integration 覆盖 Cloudflare Turnstile、rate limiting、IP/country context、disposable email checks 和 anti-abuse boundaries。

## 使用

- 使用框架 security helpers，不要临时实现 ad hoc checks。
- Login 和 signup flows 使用既有 guards。
- Public mutation endpoints 应限流或保护。

## 配置

常见配置：

- Turnstile site key 和 secret key。
- Rate limit Redis 配置。
- 可选 country 或 IP-based policies。

新增配置时更新 `.env.example` 和 `src/env.js`。

## 规则

- 不要在没有 CDN/request-context helper 的情况下信任 client IP headers。
- 不要在 client state 保存 secrets。
- 避免记录敏感 auth、payment 或 user privacy data。
- 涉及 anti-abuse features 时，也要阅读 `docs/zh-CN/features/anti-abuse/README.md`。
