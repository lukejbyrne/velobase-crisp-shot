/**
 * Order Compensation Scheduler
 *
 * 每 10 分钟扫描一次 PENDING 支付
 */
import { orderCompensationQueue } from "../../queues/order-compensation.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("order-compensation-scheduler");

export const orderCompensationScheduler = defineRepeatableScheduler({
  id: "payment.order-compensation",
  queue: orderCompensationQueue,
  jobName: "scheduled-scan",
  data: { type: "scheduled-scan" as const },
  options: {
    repeat: {
      pattern: "*/10 * * * *", // Cron: 每 10 分钟
    },
    jobId: "order-compensation-scan", // 固定 ID 防止重复
  },
  logger,
  readyMessage: "✅ Order compensation scheduler registered: every 10 minutes",
});

/**
 * 注册订单补偿定时任务
 */
export async function registerOrderCompensationScheduler(): Promise<void> {
  await orderCompensationScheduler.register();
}
