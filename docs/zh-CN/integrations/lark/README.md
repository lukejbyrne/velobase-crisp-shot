# Lark / 飞书集成

Lark / 飞书是内部通知和审核渠道。它应该扩展所属功能，不应该成为支付、客服、广告或分析行为的业务归属。

## 使用

- 支付成功/失败通知订阅 payment domain events。
- Support 审核卡片仅在客服自动化启用时可用。
- 转化报表仅在 Conversion Alert 启用时可用。
- 支付对账报表仅在 Payment Reconciliation 和 Lark 同时启用时可用。

## 配置

常见环境变量：

- `LARK_APP_ID`
- `LARK_APP_SECRET`
- `LARK_USE_FEISHU`
- `LARK_DEFAULT_CHAT_ID`
- `LARK_ENCRYPT_KEY`
- `LARK_VERIFICATION_TOKEN`

模块模式：

- `LARK_MODE=auto|off|on` 控制 Lark event handlers 和依赖通知渠道的 workers。
- `auto` 要求配置 `LARK_APP_ID` 和 `LARK_APP_SECRET`。

## Worker 归属

Lark 是以下 worker 的投递渠道：

| Worker                             | 归属功能/集成              | Lark 角色          |
| ---------------------------------- | -------------------------- | ------------------ |
| `payment-reconciliation`           | Payment integration        | 报表投递           |
| `conversion-alert`                 | Conversion Alert feature   | 报表投递           |
| `support-process` / `support-send` | Support Automation feature | 审核和内部话题投递 |

关闭 Lark 后，Lark-only notification workers 不会注册。若所属功能的核心流程不依赖 Lark，该功能仍可存在。

依赖通知渠道的 workers 仍归属于其来源功能/集成，并由对应模块暴露 worker contributions。

## AI 规则

- 不要把支付、客服或广告业务逻辑放进 Lark handlers。
- Lark handlers 应调用所属功能的 service 或 queue。
- Card actions 必须同时受所属功能开关和 Lark 启用状态控制。
- Provider 失败要安全记录日志，不能破坏核心支付或权益流程。
