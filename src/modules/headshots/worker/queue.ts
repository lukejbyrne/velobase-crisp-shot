/**
 * Headshot Generation Queue
 *
 * One job per image, not per batch. Each image owns its own credit
 * transaction, so fanning out at image granularity keeps a single failure from
 * taking its siblings down with it and lets BullMQ retry them independently.
 *
 * The queue is created lazily. This module is reachable from the tRPC route
 * (the service enqueues jobs), and during `next build` `@/server/redis` exports
 * a stub connection that BullMQ cannot construct a Queue against. Deferring
 * construction to first use keeps the build graph clean without weakening
 * anything at runtime.
 */
import { Queue } from "bullmq";
import { redis } from "@/server/redis";
import { createLogger } from "@/lib/logger";
import {
  HEADSHOT_GENERATION_MAX_ATTEMPTS,
  HEADSHOT_GENERATION_QUEUE_NAME,
  type HeadshotGenerationJobData,
} from "./constants";

const logger = createLogger("queue:headshot-generation");

export {
  HEADSHOT_GENERATION_MAX_ATTEMPTS,
  HEADSHOT_GENERATION_QUEUE_NAME,
  type HeadshotGenerationJobData,
};

let queue: Queue<HeadshotGenerationJobData> | null = null;

export function getHeadshotGenerationQueue(): Queue<HeadshotGenerationJobData> {
  if (queue) return queue;

  queue = new Queue<HeadshotGenerationJobData>(HEADSHOT_GENERATION_QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
      attempts: HEADSHOT_GENERATION_MAX_ATTEMPTS,
      backoff: { type: "exponential", delay: 15000 },
      removeOnComplete: { count: 100, age: 24 * 3600 },
      removeOnFail: { count: 500, age: 7 * 24 * 3600 },
    },
  });

  queue.on("error", (err) => {
    logger.error({ err }, "Headshot generation queue error");
  });

  return queue;
}

/**
 * Enqueues one image. `jobId` is the image id, so an accidental double enqueue
 * collapses into a single job.
 */
export async function enqueueHeadshotImage(
  headshotImageId: string,
): Promise<void> {
  await getHeadshotGenerationQueue().add(
    `headshot-${headshotImageId}`,
    { type: "generate-image", headshotImageId },
    { jobId: headshotImageId },
  );
}
