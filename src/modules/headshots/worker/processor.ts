/**
 * Headshot generation processor.
 *
 * Runs one image. The job is idempotent in both halves:
 *
 *  - Generation is keyed by a stable `idempotencyKey`, so a retry re-attaches
 *    to the existing provider task instead of paying for a second render.
 *  - Billing is keyed by the image row id, so freeze / consume / unfreeze all
 *    collapse to no-ops when replayed.
 *
 * The image row is written before its credit is settled, which lets a retry
 * tell "generated but not yet charged" apart from "not generated", and finish
 * only the half that is missing.
 */
import type { Job } from "bullmq";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { appEvents } from "@/server/events/bus";
import { consumeImageCredit, freezeImageCredit } from "../server/credits";
import { headshotConfig, isForcedFailureAllowed } from "../server/config";
import { buildHeadshotPrompt, HEADSHOT_NEGATIVE_PROMPT } from "../styles";
import {
  markCreditConsumed,
  markImageProcessing,
  recomputeBatchStatus,
  recordImageSuccess,
  releaseImageCredit,
  settleImageFailure,
} from "../server/service";
import {
  HEADSHOT_GENERATION_MAX_ATTEMPTS,
  type HeadshotGenerationJobData,
} from "./constants";

const logger = createLogger("headshot-generation-worker");

/** Message stored on an image that was failed on purpose in development. */
export const FORCED_FAILURE_MESSAGE =
  "Simulated generation failure (development only). Your credit was returned.";

export async function processHeadshotGenerationJob(
  job: Job<HeadshotGenerationJobData>,
): Promise<void> {
  if (job.data.type !== "generate-image") return;

  const { headshotImageId } = job.data;
  const isFinalAttempt =
    job.attemptsMade + 1 >= HEADSHOT_GENERATION_MAX_ATTEMPTS;

  const image = await db.headshotImage.findUnique({
    where: { id: headshotImageId },
    include: { batch: true },
  });

  if (!image) {
    logger.warn({ headshotImageId }, "Headshot image not found");
    return;
  }

  // --- Reconcile a half-settled retry before doing any new work -------------

  if (image.status === "COMPLETED") {
    if (image.creditState === "FROZEN") {
      try {
        await chargeForImage(
          image.id,
          image.userId,
          image.batchId,
          image.position,
        );
      } catch (error) {
        // Let BullMQ retry while attempts remain.
        if (!isFinalAttempt) throw error;

        // Out of attempts. The image is already delivered, so the only choice
        // left is which way to be wrong. Leaving the batch stuck in PROCESSING
        // is worse than an uncharged image: it never completes, and it counts
        // against the user's concurrent-batch limit forever. The reservation
        // releases itself at the Velobase TTL.
        logger.error(
          { err: error, headshotImageId: image.id, batchId: image.batchId },
          "Could not charge for a delivered headshot; leaving the credit reserved",
        );
      }
    }
    await recomputeBatchStatus(image.batchId);
    return;
  }

  if (image.status === "FAILED" || image.status === "CANCELLED") {
    if (image.creditState === "FROZEN") {
      await releaseImageCredit(image.id);
    }
    await recomputeBatchStatus(image.batchId);
    return;
  }

  // --- Make sure the credit is actually reserved ---------------------------

  if (image.creditState === "NONE") {
    // Defensive: the reservation normally happens when the batch is created.
    await freezeImageCredit({
      userId: image.userId,
      imageId: image.id,
      batchId: image.batchId,
      position: image.position,
    });
    await db.headshotImage.update({
      where: { id: image.id },
      data: { creditState: "FROZEN" },
    });
  } else if (image.creditState !== "FROZEN") {
    // Already consumed or released without a terminal status — nothing safe to
    // do here beyond squaring the batch counters.
    logger.warn(
      { headshotImageId, creditState: image.creditState },
      "Headshot image has no active credit reservation; skipping",
    );
    await recomputeBatchStatus(image.batchId);
    return;
  }

  await markImageProcessing(image.id);

  try {
    if (image.forcedFailure && isForcedFailureAllowed()) {
      throw new HeadshotGenerationError(FORCED_FAILURE_MESSAGE, {
        permanent: true,
      });
    }

    const { imageGeneration } = await import("@/server/ai/image-generation");

    const task = await imageGeneration.createTask({
      provider: headshotConfig.provider,
      model: image.batch.model,
      operation: "edit-image",
      prompt: buildHeadshotPrompt(image.styleKey, image.position),
      negativePrompt: HEADSHOT_NEGATIVE_PROMPT,
      aspectRatio: headshotConfig.aspectRatio,
      resolution: headshotConfig.resolution,
      outputFormat: "png",
      imageUrls: [image.batch.sourceImageUrl],
      userId: image.userId,
      // Stable across retries: the provider task is created at most once.
      idempotencyKey: `headshot_${image.id}`,
      metadata: {
        module: "headshots",
        batchId: image.batchId,
        headshotImageId: image.id,
        styleKey: image.styleKey,
      },
    });

    await db.headshotImage.update({
      where: { id: image.id },
      data: { imageGenerationTaskId: task.id },
    });

    const finished = await imageGeneration.waitForTask(task.id, {
      userId: image.userId,
    });

    if (finished.status !== "succeeded") {
      throw new HeadshotGenerationError(
        finished.errorMessage ?? "Image generation did not succeed",
        // A provider-side failure has already burned its own retries inside the
        // image-generation worker, so re-running it here rarely helps.
        { permanent: finished.status === "failed" },
      );
    }

    let asset = finished.assets.find((item) => item.status === "succeeded");

    // The image-generation worker stores the rendered file after the task
    // reports success, so a task can briefly read as succeeded with no asset
    // attached. Re-read for a few seconds before concluding anything.
    for (let attempt = 0; attempt < 4 && !asset?.publicUrl; attempt += 1) {
      await wait(1500);
      const refreshed = await imageGeneration.getTask(task.id, {
        userId: image.userId,
      });
      asset = refreshed?.assets.find((item) => item.status === "succeeded");
    }

    if (!asset?.publicUrl) {
      throw new HeadshotGenerationError(
        "Image generation finished without a usable image",
        // Not permanent: the asset may still be landing, so allow a retry
        // rather than refunding a render that actually worked.
        { permanent: false },
      );
    }

    await recordImageSuccess({
      imageId: image.id,
      imageUrl: asset.publicUrl,
      storageKey: asset.storageKey,
      contentType: asset.contentType,
      byteLength: asset.byteLength,
      imageGenerationTaskId: task.id,
    });

    await chargeForImage(image.id, image.userId, image.batchId, image.position);
    await recomputeBatchStatus(image.batchId);

    await appEvents.emit("headshot_image:succeeded", {
      headshotImageId: image.id,
      batchId: image.batchId,
      userId: image.userId,
      styleKey: image.styleKey,
    });

    logger.info(
      { headshotImageId: image.id, batchId: image.batchId },
      "Headshot image completed",
    );
  } catch (error) {
    const message = toFailureMessage(error);
    const permanent =
      error instanceof HeadshotGenerationError && error.permanent;

    if (!permanent && !isFinalAttempt) {
      // Leave the image PROCESSING and the credit frozen so BullMQ can retry.
      logger.warn(
        {
          err: error,
          headshotImageId: image.id,
          attempt: job.attemptsMade + 1,
        },
        "Headshot image generation failed; will retry",
      );
      throw error;
    }

    await settleImageFailure({ imageId: image.id, message });
    await recomputeBatchStatus(image.batchId);

    await appEvents.emit("headshot_image:failed", {
      headshotImageId: image.id,
      batchId: image.batchId,
      userId: image.userId,
      styleKey: image.styleKey,
      errorMessage: message,
    });

    logger.error(
      { err: error, headshotImageId: image.id, batchId: image.batchId },
      "Headshot image failed permanently; credit returned",
    );
  }
}

async function chargeForImage(
  imageId: string,
  userId: string,
  batchId: string,
  position: number,
): Promise<void> {
  await consumeImageCredit({ userId, imageId, batchId, position });
  await markCreditConsumed(imageId);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Distinguishes "do not bother retrying" from ordinary transient failures. */
export class HeadshotGenerationError extends Error {
  readonly permanent: boolean;

  constructor(message: string, options: { permanent?: boolean } = {}) {
    super(message);
    this.name = "HeadshotGenerationError";
    this.permanent = options.permanent ?? false;
  }
}

/** Provider errors can carry keys or URLs; only a safe summary is stored. */
function toFailureMessage(error: unknown): string {
  if (error instanceof HeadshotGenerationError) return error.message;
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 300);
  }
  return "Generation failed. Your credit was returned.";
}
