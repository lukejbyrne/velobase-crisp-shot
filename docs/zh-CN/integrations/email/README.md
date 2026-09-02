# 邮件集成

邮件发送通过框架抽象暴露，产品代码不要直接调用 provider SDK。

支持的 providers：

- Resend。
- SendGrid。

## 使用

- 通过 `@/server/email` 的 `sendEmail()` 发送邮件。
- 邮件模板放在框架邮件模板结构中。
- 产品模块不要直接 import Resend 或 SendGrid SDK。

## 配置

常见环境变量：

- `RESEND_API_KEY`
- `SENDGRID_API_KEY`
- 启用时需要 provider-specific webhook 或 domain settings。

客服自动化使用独立的客服邮箱，不走通用出信 provider chain：

- `SUPPORT_EMAIL_ADDRESS`
- `SUPPORT_EMAIL_PASSWORD`
- `SUPPORT_IMAP_HOST`
- `SUPPORT_SMTP_HOST`
- 可选 `SUPPORT_IMAP_PORT`、`SUPPORT_SMTP_PORT`、`SUPPORT_EMAIL_FROM`

新增邮件配置时更新 `.env.example` 和 `src/env.js`。

## 规则

- 邮件发送应可安全重试。
- 需要重试的关键邮件副作用应使用 worker。
- Provider 失败要记录日志，但不能暴露 API keys 或 message private data。
- 如果邮件属于 auth 流程，也要阅读 `docs/zh-CN/integrations/auth/README.md`。
