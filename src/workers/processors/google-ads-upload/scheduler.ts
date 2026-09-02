/**
 * Google Ads Upload Scheduler
 *
 * 每 5 分钟 flush 一次 Redis buffer，批量上传（最多 1000 条/类型/次）。
 */
import { googleAdsUploadQueue } from "../../queues/google-ads-upload.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("google-ads-upload-scheduler");

export const googleAdsUploadScheduler = defineRepeatableScheduler({
  id: "google-ads.upload-flush",
  queue: googleAdsUploadQueue,
  jobName: "flush",
  data: { type: "flush" as const },
  options: {
    repeat: { pattern: "*/5 * * * *" }, // every 5 minutes
    jobId: "google-ads-upload-flush",
  },
  logger,
  readyMessage: "✅ Google Ads upload scheduler registered: */5 * * * *",
});

export async function registerGoogleAdsUploadScheduler(): Promise<void> {
  await googleAdsUploadScheduler.register();
}
