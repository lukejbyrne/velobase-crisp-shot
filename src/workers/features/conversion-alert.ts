import type { WorkerContribution } from "../types";
import { conversionAlertQueue } from "../queues/conversion-alert.queue";
import {
  conversionAlertScheduler,
  processConversionAlert,
} from "../processors/conversion-alert";

export function getConversionAlertWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "conversion-alert.hourly",
      queue: conversionAlertQueue,
      processor: processConversionAlert,
      options: {
        concurrency: 1,
        lockDuration: 60000,
      },
      scheduler: conversionAlertScheduler,
    },
  ];
}
