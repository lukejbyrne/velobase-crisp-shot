# 转化告警

转化告警生成业务转化报表，并在 Lark/飞书集成启用时投递到内部群。

## 用途

- 生成小时级转化指标。
- 在洛杉矶时间 00:00 边界生成日报。
- 投递到配置的 Lark/飞书群。

## 启用

该功能由 `MODULES.features.conversionAlert` 控制。

- `CONVERSION_ALERT_MODE=auto` 会在 Lark 启用时启用该功能。
- `CONVERSION_ALERT_MODE=off` 关闭报表投递和 worker 注册。
- `CONVERSION_ALERT_MODE=on` 强制启用；若 Lark 未启用则启动失败。
- `LARK_MODE=off` 也会停止报表投递和 worker 注册，因为 Lark 是必需投递依赖。

## Workers

```text
conversion-alert -> 每小时调度，根据 LA 时间发送小时报或日报
```

该 worker 归属于此功能。Lark 只是报表投递渠道。

该 worker 通过模块 `WorkerContribution` 暴露，`src/workers/start.ts` 不直接导入此功能。

## 代码

```text
src/workers/features/conversion-alert.ts
src/workers/queues/conversion-alert.queue.ts
src/workers/processors/conversion-alert/
```

## AI 规则

- 保持报表生成和 Lark 投递分离。
- 定时投递必须同时受 Conversion Alert 和 Lark 启用状态控制。
- 不要把支付或广告回传副作用放入此功能。
