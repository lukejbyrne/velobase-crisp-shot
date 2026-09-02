import type { WorkerContribution } from "../types";
import { touchDeliveryQueue } from "../queues/touch-delivery.queue";
import {
  processTouchDeliveryJob,
  touchDeliveryScheduler,
} from "../processors/touch-delivery";

export function getTouchWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "touch.delivery",
      queue: touchDeliveryQueue,
      processor: processTouchDeliveryJob,
      options: {
        concurrency: 2,
        lockDuration: 300000,
      },
      scheduler: touchDeliveryScheduler,
    },
  ];
}
