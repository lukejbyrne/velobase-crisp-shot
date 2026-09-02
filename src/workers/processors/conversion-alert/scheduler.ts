/**
 * Conversion Alert Scheduler
 *
 * 每小时检查注册转化率
 */
import { conversionAlertQueue } from "../../queues/conversion-alert.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("conversion-alert-scheduler");

export const conversionAlertScheduler = defineRepeatableScheduler({
  id: "conversion-alert.hourly",
  queue: conversionAlertQueue,
  jobName: "hourly-check",
  data: { type: "hourly-check" as const },
  options: {
    repeat: {
      pattern: "0 * * * *", // 每小时整点
    },
    jobId: "conversion-alert-hourly-check",
  },
  logger,
  readyMessage: "✅ Conversion alert scheduler registered: every hour",
});

export async function registerConversionAlertScheduler(): Promise<void> {
  await conversionAlertScheduler.register();
}
