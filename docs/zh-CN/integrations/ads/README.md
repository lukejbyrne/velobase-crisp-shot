# 广告集成

Ads integration 覆盖 Google Ads、Twitter/X Ads 等 provider 的归因和 conversion upload。

## 使用

- Client conversion helpers 放在 analytics/ads abstractions 下。
- Server-side offline conversion upload 应通过框架 queues 或 provider modules。
- 不要在 payment 或 order core flows 中直接调用广告 provider SDK。

## 配置

常见配置：

- Frontend conversion IDs 和 labels。
- Google Ads customer 和 conversion configuration。
- 可选 API credentials，用于 server-side upload。

新增 provider 配置时更新 `.env.example`、`src/env.js` 和 module enablement。

模块模式：

- `GOOGLE_ADS_MODE=auto|off|on` 控制 Google Ads 事件处理和 worker 注册。
- `auto` 要求配置 Google Ads customer ID 和 developer token。

## Workers

Google Ads upload 归属于 Google Ads 集成，从 `src/workers/integrations/google-ads.ts` 注册。

| Worker              | 用途                                                                                        | 启用条件               |
| ------------------- | ------------------------------------------------------------------------------------------- | ---------------------- |
| `google-ads-upload` | 将 Redis pending buffer 批量 flush 到 Google Ads offline conversion 和 web enhancement APIs | Google Ads module 启用 |

业务事件路径不会直接投递 BullMQ job。`payment:succeeded` 通过 `src/server/ads/google-ads/queue.ts` 把 payment ID 写入 Redis ZSET buffer；worker 每 5 分钟批量上传。

上传 worker 通过模块 `WorkerContribution` 暴露，`src/workers/start.ts` 从模块 catalog 收集。

## 规则

- Payment/order flows 发出 domain events。
- Ads modules 订阅事件并上传 conversions。
- Conversion upload 必须按 order、user 或 provider event identifiers 幂等去重。
- Provider 失败不应导致 payment 或 entitlement delivery 失败。
