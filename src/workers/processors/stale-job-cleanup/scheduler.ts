/**
 * Stale Job Cleanup Scheduler
 *
 * 每 5 分钟扫描一次超时任务
 */
import { staleJobCleanupQueue } from "../../queues/stale-job-cleanup.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("stale-job-cleanup-scheduler");

export const staleJobCleanupScheduler = defineRepeatableScheduler({
  id: "platform.stale-job-cleanup",
  queue: staleJobCleanupQueue,
  jobName: "scheduled-scan",
  data: { type: "scheduled-scan" as const },
  options: {
    repeat: {
      pattern: "*/5 * * * *", // 每 5 分钟
    },
    jobId: "stale-job-cleanup-scan",
  },
  logger,
  readyMessage: "✅ Stale job cleanup scheduler registered: every 5 minutes",
});

export async function registerStaleJobCleanupScheduler(): Promise<void> {
  await staleJobCleanupScheduler.register();
}
