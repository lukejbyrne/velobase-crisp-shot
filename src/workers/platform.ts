import type { WorkerContribution } from "./types";
import { staleJobCleanupQueue } from "./queues/stale-job-cleanup.queue";
import { subscriptionMonthlyCreditsQueue } from "./queues/subscription-monthly-credits.queue";
import {
  processStaleJobCleanup,
  staleJobCleanupScheduler,
} from "./processors/stale-job-cleanup";
import {
  processSubscriptionMonthlyCreditsJob,
  subscriptionMonthlyCreditsScheduler,
} from "./processors/subscription-monthly-credits";

export function getPlatformWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "platform.subscription-monthly-credits",
      queue: subscriptionMonthlyCreditsQueue,
      processor: processSubscriptionMonthlyCreditsJob,
      options: {
        concurrency: 1,
        lockDuration: 300000,
      },
      scheduler: subscriptionMonthlyCreditsScheduler,
    },
    {
      id: "platform.stale-job-cleanup",
      queue: staleJobCleanupQueue,
      processor: processStaleJobCleanup,
      options: {
        concurrency: 1,
        lockDuration: 300000,
      },
      scheduler: staleJobCleanupScheduler,
    },
  ];
}
