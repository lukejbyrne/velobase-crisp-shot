# 每日签到赠送

Daily Bonus 会在登录用户每天首次符合条件访问时发放积分。

## 用途

- 提升新用户激活。
- 鼓励每日留存。
- 用可预测发放策略控制成本。

## 依赖

- Velobase Billing：发放积分和读取 ledger history。
- Auth：获取当前 `userId`。

## 边界

不要把 Daily Bonus 和 `subscription-monthly-credits` worker 合并。

- Daily Bonus 是用户当天首次符合条件访问时触发的留存赠送。
- Subscription monthly credits 是付费订阅周期内的权益发放。
- 两者都会调用 billing `grant()`，但策略、幂等 key、有效期窗口和失败处理不同。

## 代码

```text
src/server/features/daily-bonus/
├── grant-daily-bonus.ts
└── index.ts
```

## 使用

```ts
import { grantDailyBonus } from "@/server/features/daily-bonus";

const result = await grantDailyBonus(userId);
```

## AI 规则

- 调整 `grant-daily-bonus.ts` 顶部策略常量。
- 保持 `grantDailyBonus()` 幂等。
- 发放积分不要绕过 billing services。
