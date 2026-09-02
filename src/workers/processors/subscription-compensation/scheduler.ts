/**
 * Subscription Compensation Scheduler
 *
 * 使用 BullMQ repeat/cron 能力，定期扫描需要补偿的订阅：
 * - 仍处于 TRIAL 周期
 * - 但 Stripe 侧已经对该订阅成功扣款
 */
import { subscriptionCompensationQueue } from "../../queues/subscription-compensation.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("subscription-compensation-scheduler");

export const subscriptionCompensationScheduler = defineRepeatableScheduler({
  id: "payment.subscription-compensation",
  queue: subscriptionCompensationQueue,
  jobName: "scheduled-scan",
  data: { type: "scheduled-scan" as const },
  options: {
    repeat: {
      pattern: "0 * * * *", // Cron: 每小时 00 分
    },
    jobId: "subscription-compensation-scan", // 固定 ID 防止重复
  },
  logger,
  readyMessage: "✅ Subscription compensation scheduler registered: 0 * * * *",
});

export async function registerSubscriptionCompensationScheduler(): Promise<void> {
  await subscriptionCompensationScheduler.register();
}
