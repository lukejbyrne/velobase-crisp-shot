# 线上到本地 Debug

从 Velobase Cloud 或其他托管 runtime 排查生产问题时使用本流程。

## 核心流程

1. 从 Cloud 收集最新 runtime logs。
2. 判断失败服务：Web、API 或 Worker。
3. 尽量用本地 Docker database 和 Redis 复现。
4. 做最小修复。
5. 运行针对性检查。
6. Push 后回到 Cloud 验证。

## 1. 收集日志

向用户索要：

- 页面、React、tRPC、认证、Next Route Handler、当前生产 webhook 问题：Web runtime logs。
- 只有 `src/api/routes/*` 下的可选 Hono routes 问题才看 API runtime logs。
- queues、processors、schedulers、支付对账、邮件、广告、touch jobs：Worker logs。

如果 runtime logs 可用，不要只根据截图猜测。

## 2. 本地复现

启动本地基础设施：

```bash
pnpm docker:db:up
pnpm db:push
pnpm dev:all
```

如果问题与特定服务相关，使用拆分命令：

```bash
pnpm dev
pnpm worker:dev
```

只有失败路径是可选 Hono API route 时才启动 `pnpm api:dev`。

## 3. 修复

- 修复范围限定在失败边界。
- 不把产品特定行为写入框架通用层。
- 除非故障需要，不随意修改 env 或 schema。
- 支付、认证、webhook 或 worker bug 要检查幂等和重试行为。

## 4. 验证

运行与修复匹配的最小命令：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

如果有可用测试或手动复现步骤，也要执行。

## 5. Cloud 验证

Push/deploy 后：

- 确认失败路径已修复。
- 确认日志不再出现同一错误。
- 确认相关服务没有回归。

相关文档：

- `docs/zh-CN/integrations/database/README.md`
- `docs/zh-CN/architecture/web-api-service-split.md`
- `docs/zh-CN/ai/completion-checklist.md`
