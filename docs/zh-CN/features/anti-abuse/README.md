# 注册反滥用

Anti-Abuse Guard 检测注册滥用、临时邮箱、可疑 IP/device 模式和刷积分行为。

## 用途

- 发送验证邮件前拦截明显滥用。
- 注册后检测更深层滥用。
- 确认滥用后回收已发放积分。

## 依赖

- Auth user data。
- Database signup history。
- Velobase Billing 回收积分。
- 可选 Cloudflare Turnstile。

## 代码

```text
src/server/features/anti-abuse/
├── email-guard.ts
├── signup-guard.ts
└── index.ts
```

## AI 规则

- 在对应 guard 文件中调整策略常量。
- Guard 决策应能通过日志和返回值解释。
- 未经产品确认，不要过度拦截共享网络下的正常用户。
- 修改安全边界前阅读 `docs/zh-CN/integrations/security/README.md`。
