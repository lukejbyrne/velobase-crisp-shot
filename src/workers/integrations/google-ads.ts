import type { WorkerContribution } from "../types";
import { googleAdsUploadQueue } from "../queues/google-ads-upload.queue";
import {
  googleAdsUploadScheduler,
  processGoogleAdsUploadJob,
} from "../processors/google-ads-upload";

export function getGoogleAdsWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "google-ads.upload",
      queue: googleAdsUploadQueue,
      processor: processGoogleAdsUploadJob,
      options: {
        concurrency: 1,
        lockDuration: 300000,
      },
      scheduler: googleAdsUploadScheduler,
    },
  ];
}
