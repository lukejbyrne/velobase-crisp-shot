/**
 * Subscription Monthly Credits Scheduler
 *
 * 使用 BullMQ repeat/cron 能力，每天定时扫描需要发放月度积分的订阅周期。
 */
import { subscriptionMonthlyCreditsQueue } from "../../queues/subscription-monthly-credits.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("subscription-monthly-credits-scheduler");

export const subscriptionMonthlyCreditsScheduler = defineRepeatableScheduler({
  id: "platform.subscription-monthly-credits",
  queue: subscriptionMonthlyCreditsQueue,
  jobName: "scheduled-scan",
  data: { type: "scheduled-scan" as const },
  options: {
    repeat: {
      pattern: "30 1 * * *", // Cron: 每天 01:30
    },
    jobId: "subscription-monthly-credits-scan", // 固定 ID 防止重复
  },
  logger,
  readyMessage:
    "✅ Subscription monthly credits scheduler registered: 30 1 * * *",
});

export async function registerSubscriptionMonthlyCreditsScheduler(): Promise<void> {
  await subscriptionMonthlyCreditsScheduler.register();
}
