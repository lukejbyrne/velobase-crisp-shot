# 客服自动化

客服自动化会把支持邮箱中的新邮件转换为工单，使用 AI Agent 生成回复，并在配置 Lark/飞书时通过卡片完成审核动作。

## 用途

- 通过 IMAP 拉取新的客服邮件。
- 创建或更新 support tickets 和 timelines。
- 运行客服 Agent，完成分类、上下文查询和回复草稿。
- 通过 SMTP 发送自动回复或审核通过后的回复。

## 启用

该功能由 `MODULES.features.supportAutomation` 控制。

- `SUPPORT_AUTOMATION_MODE=auto` 仅在必需的邮箱和 AI 配置齐全时自动启用。
- `SUPPORT_AUTOMATION_MODE=off` 关闭该功能。
- `SUPPORT_AUTOMATION_MODE=on` 强制启用；若必需依赖缺失则启动失败。
- Lark 审核卡片要求 `MODULES.integrations.messaging.lark.enabled`。
- 完整自动化当前需要客服邮箱凭据和 `OPENROUTER_API_KEY`。

`auto` 和 `on` 需要以下配置：

- `SUPPORT_EMAIL_ADDRESS`
- `SUPPORT_EMAIL_PASSWORD`
- `SUPPORT_IMAP_HOST`
- `SUPPORT_SMTP_HOST`
- `OPENROUTER_API_KEY`

可选邮箱默认值：

- `SUPPORT_IMAP_PORT` 默认 `993`。
- `SUPPORT_SMTP_PORT` 默认 `465`。
- `SUPPORT_EMAIL_FROM` 默认使用产品客服邮箱。

## 依赖

- Database support ticket tables。
- 客服邮箱 IMAP/SMTP 配置。
- 客服 Agent 使用的 OpenRouter 配置。
- 可选 Lark/飞书，用于内部话题和审核卡片。

## Workers

```text
support-sync    -> 拉取 IMAP 邮件，并投递 support-process
support-process -> 运行客服 Agent，必要时投递 support-send
support-send    -> 发送 SMTP 回复并更新工单状态
```

关闭功能后，Worker 服务不会注册这些队列或 scheduler，独立的 Lark support webhook 会返回 404。

这些 workers 通过模块 `WorkerContribution` 暴露，`src/workers/start.ts` 从模块 catalog 收集。

## 代码

```text
src/server/support/
src/workers/features/support-automation.ts
src/workers/queues/support-*.queue.ts
src/workers/processors/support-*/
```

## AI 规则

- 工单状态流转必须保持幂等。
- 不要绕过 `support-send` 发送客户邮件。
- Lark 审核动作必须受 `MODULES.features.supportAutomation` 控制。
- 修改邮箱或 worker 行为前阅读 `docs/zh-CN/integrations/email/README.md` 和 `docs/zh-CN/integrations/queue/README.md`。
