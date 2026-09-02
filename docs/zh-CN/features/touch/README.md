# 用户触达生命周期

用户触达生命周期管理定时用户消息，例如续费提醒和延迟运营通知。

## 用途

- 存储 touch scenes、templates、schedules 和 delivery records。
- 由 worker 使用幂等锁处理到期 schedule。
- 通过框架 email 抽象发送生命周期邮件。
- 当所属领域状态变化时取消 pending schedule。

## 启用

该功能由 `MODULES.features.touch` 控制。

- `TOUCH_MODE=auto` 默认启用该功能。
- `TOUCH_MODE=off` 关闭该功能。
- `TOUCH_MODE=on` 强制启用；若必需依赖缺失则启动失败。
- 关闭后 Worker 不注册 `touch-delivery`，touch 服务入口会返回 no-op skipped 结果。

## 依赖

- Database touch tables。
- Email integration，用于邮件投递。
- 所属领域事件，例如订阅取消。

## Workers

```text
touch-delivery -> 每分钟扫描到期 schedule，并处理有上限的一批任务
```

`touch-delivery` 属于该功能，不属于通用 Worker 平台。`stale-job-cleanup` 仍属于平台自身能力。

该 worker 通过模块 `WorkerContribution` 暴露，`src/workers/start.ts` 不直接导入此功能。

## 代码

```text
src/server/touch/
src/server/modules/touch.ts
src/workers/features/touch.ts
src/workers/queues/touch-delivery.queue.ts
src/workers/processors/touch-delivery/
```

## AI 规则

- Schedule claim 必须保持幂等。
- 产品生命周期邮件不要绕过 `@/server/email`。
- 新增 touch 副作用时必须受 `MODULES.features.touch` 控制。
- 修改投递行为前阅读 `docs/zh-CN/integrations/email/README.md` 和 `docs/zh-CN/integrations/queue/README.md`。
