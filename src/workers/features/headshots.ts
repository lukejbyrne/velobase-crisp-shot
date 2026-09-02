import type { WorkerContribution } from "../types";
import { getHeadshotGenerationQueue } from "@/modules/headshots/worker/queue";
import { processHeadshotGenerationJob } from "@/modules/headshots/worker/processor";

export function getHeadshotsWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "headshots.generate",
      queue: getHeadshotGenerationQueue(),
      processor: processHeadshotGenerationJob,
      options: {
        // Each job waits on a provider render, so concurrency is about how many
        // renders may be in flight rather than local CPU work.
        concurrency: 4,
        lockDuration: 10 * 60 * 1000,
      },
    },
  ];
}
