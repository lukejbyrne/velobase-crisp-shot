# 分析集成

Analytics 使用 PostHog 处理 client/server events 和 feature flags。

## 使用

- Client analytics 使用 `@/analytics` 的 `track()`。
- Server analytics 使用 `@/analytics/server` 的 `safeTrack()`。
- Server code 不要 import `@/analytics`。
- 新 analytics events 使用前先定义在 `src/analytics/events/`。

## 配置

常见配置：

- Client PostHog key 和 host。
- 可选 server PostHog key，用于 backend events。
- 需要时配置 Feature flag settings。

新增配置时更新 `.env.example` 和 `src/env.js`。

## 规则

- Analytics 不应阻塞核心业务流程。
- Server tracking 应安全失败，只记录非敏感上下文。
- Product events 使用稳定名称和 typed payloads。
- 核心流程发出 domain events；可插拔 analytics modules 订阅事件。
