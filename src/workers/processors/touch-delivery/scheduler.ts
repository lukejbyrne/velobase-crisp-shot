/**
 * Touch Delivery Scheduler
 *
 * 每分钟扫描一次到期触达计划（轻量 DB 查询 + 幂等锁）。
 */
import { touchDeliveryQueue } from "../../queues/touch-delivery.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("touch-delivery-scheduler");

export const touchDeliveryScheduler = defineRepeatableScheduler({
  id: "touch.delivery",
  queue: touchDeliveryQueue,
  jobName: "scheduled-scan",
  data: { type: "scheduled-scan" as const },
  options: {
    repeat: { pattern: "* * * * *" }, // every minute (UTC)
    jobId: "touch-delivery-scan",
  },
  logger,
  readyMessage: "✅ Touch delivery scheduler registered: * * * * *",
});

export async function registerTouchDeliveryScheduler(): Promise<void> {
  await touchDeliveryScheduler.register();
}
