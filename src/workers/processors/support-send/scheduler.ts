/**
 * Support Send Scheduler
 *
 * 注意：send 队列不需要定时调度，由 process 队列或审核通过触发。
 */
import { createLogger } from "@/lib/logger";
import type { SchedulerContribution } from "@/workers/types";

const logger = createLogger("support-send-scheduler");

export const supportSendScheduler: SchedulerContribution = {
  id: "support-automation.send-triggered",
  async register() {
    // Send 队列由 process 队列或审核通过触发，不需要定时调度
    logger.info(
      "✅ Support send scheduler: triggered by process queue or approval",
    );
  },
};

export async function registerSupportSendScheduler(): Promise<void> {
  await supportSendScheduler.register();
}
