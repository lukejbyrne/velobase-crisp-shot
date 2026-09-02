/**
 * Support Sync Scheduler
 *
 * 每分钟扫描一次 IMAP 收取新邮件。
 */
import { supportSyncQueue } from "../../queues/support-sync.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("support-sync-scheduler");

export const supportSyncScheduler = defineRepeatableScheduler({
  id: "support-automation.sync",
  queue: supportSyncQueue,
  jobName: "scheduled-scan",
  data: { type: "scheduled-scan" as const },
  options: {
    repeat: { pattern: "* * * * *" }, // every minute
    jobId: "support-sync-scan",
  },
  logger,
  readyMessage: "✅ Support sync scheduler registered: * * * * *",
});

export async function registerSupportSyncScheduler(): Promise<void> {
  await supportSyncScheduler.register();
}
