import type { WorkerContribution } from "../types";
import { supportSyncQueue } from "../queues/support-sync.queue";
import { supportProcessQueue } from "../queues/support-process.queue";
import { supportSendQueue } from "../queues/support-send.queue";
import {
  processSupportSyncJob,
  supportSyncScheduler,
} from "../processors/support-sync";
import {
  processSupportProcessJob,
  supportProcessScheduler,
} from "../processors/support-process";
import {
  processSupportSendJob,
  supportSendScheduler,
} from "../processors/support-send";

export function getSupportAutomationWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "support-automation.sync",
      queue: supportSyncQueue,
      processor: processSupportSyncJob,
      options: {
        concurrency: 1,
        lockDuration: 120000,
      },
      scheduler: supportSyncScheduler,
    },
    {
      id: "support-automation.process",
      queue: supportProcessQueue,
      processor: processSupportProcessJob,
      options: {
        concurrency: 5,
        lockDuration: 300000,
      },
      scheduler: supportProcessScheduler,
    },
    {
      id: "support-automation.send",
      queue: supportSendQueue,
      processor: processSupportSendJob,
      options: {
        concurrency: 3,
        lockDuration: 60000,
      },
      scheduler: supportSendScheduler,
    },
  ];
}
