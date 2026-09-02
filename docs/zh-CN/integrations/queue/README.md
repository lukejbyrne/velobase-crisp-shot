# 队列集成

队列使用 Redis 和 BullMQ 处理后台任务、重试、定时工作和补偿任务。

## 标准结构

每个队列应包含：

- Queue definition。
- Processor function。
- 从中心 queue 和 processor indexes 导出。
- 可选 scheduler registration。

## 使用

- 通过 `createWorkerInstance()` 创建 worker，不直接 `new Worker()`。
- 从 `src/workers/queues/index.ts` 导出 queues。
- 从 `src/workers/processors/index.ts` 导出 processors。
- 功能归属的 workers 通过 `src/workers/features/*` 声明为模块贡献项。
- 三方集成归属的 workers 通过 `src/workers/integrations/*` 声明为模块贡献项。
- Worker 启动时从 `src/server/modules/catalog.ts` 收集已启用模块的贡献项。
- Repeatable scheduler 必须提供清理逻辑，模块关闭时移除 Redis 中遗留的 repeat jobs。
- Processor 逻辑必须幂等。

## 使用场景

适合用队列处理：

- 支付补偿。
- 需要重试的邮件发送。
- Ads conversion upload。
- 长耗时 AI 或文件处理。
- 定时清理或生命周期 jobs。

## AI 规则

- 重复执行 job 不得重复扣费、重复发放或产生重复不可逆副作用。
- Processor 代码不能依赖 Next.js-only APIs。
- 新增功能/集成 worker 应暴露为 `WorkerContribution`，不要硬编码到 `src/workers/start.ts`。
- 永久失败要留下可排查日志。
- 如果使用 progress updates，需要测试。
