/**
 * CrispShot headshot service.
 *
 * Owns every business rule for turning one uploaded portrait into a batch of
 * independently billed professional headshots. Routers stay thin and call in
 * here; the worker calls the settlement helpers at the bottom of the file.
 */
import { TRPCError } from "@trpc/server";
import type { HeadshotBatch, HeadshotImage, Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { createLogger } from "@/lib/logger";
import { appEvents } from "@/server/events/bus";
import { getObject, getStorageSignedUrl } from "@/server/storage";
import { isModuleEnabled } from "@/config/modules";
import { enqueueHeadshotImage } from "../worker/queue";
import {
  freezeImageCredit,
  getCreditSummary,
  unfreezeImageCredit,
  type HeadshotCreditSummary,
} from "./credits";
import {
  headshotConfig,
  isForcedFailureAllowed,
  isOwnedStorageKey,
} from "./config";
import {
  assignStylesToSlots,
  getHeadshotStyle,
  HEADSHOT_STYLES,
} from "../styles";

const logger = createLogger("headshots-service");

/** A user may not pile up unlimited concurrent batches. */
const MAX_ACTIVE_BATCHES_PER_USER = 3;

const DEFAULT_PAGE_SIZE = 20;

export interface CreateBatchParams {
  userId: string;
  styleKeys: string[];
  sourceStorageKey: string;
  sourceImageUrl: string;
  devForceFailure?: boolean;
}

export interface ListParams {
  userId: string;
  limit?: number;
  cursor?: string | null;
}

/** Thrown as a TRPCError so the UI can route the user straight to checkout. */
export const INSUFFICIENT_CREDITS_CODE = "INSUFFICIENT_CREDITS";

export function assertHeadshotsEnabled(): void {
  if (!isModuleEnabled("headshots")) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Headshot generation is not configured on this deployment. " +
        "Set the image generation provider credentials to enable it.",
    });
  }
}

/** Style catalogue for the picker. Public: it is marketing copy, not user data. */
export function listStyles() {
  return HEADSHOT_STYLES.map((style) => ({
    key: style.key,
    labelKey: style.labelKey,
    accentClassName: style.accentClassName,
    sampleImage: style.sampleImage,
  }));
}

/** Static generation parameters the UI needs before a batch exists. */
export function getGenerationSettings() {
  return {
    batchSize: headshotConfig.batchSize,
    creditsPerImage: headshotConfig.creditsPerImage,
    creditsPerBatch: headshotConfig.batchSize * headshotConfig.creditsPerImage,
    maxUploadBytes: headshotConfig.maxUploadBytes,
    acceptedUploadTypes: [...headshotConfig.acceptedUploadTypes],
    forcedFailureAvailable: isForcedFailureAllowed(),
  };
}

export async function getCredits(
  userId: string,
): Promise<HeadshotCreditSummary> {
  return getCreditSummary(userId);
}

/**
 * Creates a batch and reserves one credit per image before any generation
 * starts.
 *
 * Freezing up front (rather than inside the worker) means the user is told
 * immediately if they cannot afford the batch, and the credits cannot be spent
 * elsewhere while the batch is in flight. Each freeze is its own transaction
 * keyed by the image row id, so the four images settle independently.
 */
export async function createBatch(params: CreateBatchParams) {
  assertHeadshotsEnabled();

  const unknown = params.styleKeys.find((key) => !getHeadshotStyle(key));
  if (unknown) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown headshot style: ${unknown}`,
    });
  }

  if (!isOwnedStorageKey(params.sourceStorageKey, params.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Source photo does not belong to the current user",
    });
  }

  const activeBatches = await db.headshotBatch.count({
    where: {
      userId: params.userId,
      status: { in: ["QUEUED", "PROCESSING"] },
    },
  });
  if (activeBatches >= MAX_ACTIVE_BATCHES_PER_USER) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        "You already have batches in progress. Wait for them to finish before starting another.",
    });
  }

  const batchSize = headshotConfig.batchSize;
  const creditsRequired = batchSize * headshotConfig.creditsPerImage;

  const credits = await getCreditSummary(params.userId);
  if (credits.available < creditsRequired) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${INSUFFICIENT_CREDITS_CODE}: ${creditsRequired} credits required, ${credits.available} available`,
    });
  }

  // Forced failure is a development affordance only. A client asking for it on
  // a server that has not opted in gets a normal batch, never an error.
  const forceFailure =
    Boolean(params.devForceFailure) && isForcedFailureAllowed();

  // Picks cycle across the batch's image slots.
  const slotStyles = assignStylesToSlots(params.styleKeys, batchSize);

  // The provider fetches source images server-side, so a private bucket is
  // unreachable to it. Hand the bytes over once per batch instead of making
  // the user's portrait publicly readable; all four images share the result.
  const providerSourceUrl = await resolveProviderSourceUrl({
    storageKey: params.sourceStorageKey,
    fallbackUrl: params.sourceImageUrl,
  });

  const batch = await db.headshotBatch.create({
    data: {
      userId: params.userId,
      styleKeys: params.styleKeys,
      sourceImageUrl: providerSourceUrl,
      sourceStorageKey: params.sourceStorageKey,
      status: "QUEUED",
      requestedCount: batchSize,
      creditsPerImage: headshotConfig.creditsPerImage,
      provider: headshotConfig.provider,
      model: headshotConfig.model,
      images: {
        create: slotStyles.map((styleKey, position) => ({
          userId: params.userId,
          styleKey,
          position,
          status: "QUEUED" as const,
          creditState: "NONE" as const,
          creditAmount: headshotConfig.creditsPerImage,
          // Only the first image of a batch is sacrificed, so the demo still
          // shows three successful results alongside one refund.
          forcedFailure: forceFailure && position === 0,
        })),
      },
    },
    include: { images: { orderBy: { position: "asc" } } },
  });

  const frozen: HeadshotImage[] = [];
  try {
    for (const image of batch.images) {
      await freezeImageCredit({
        userId: params.userId,
        imageId: image.id,
        batchId: batch.id,
        position: image.position,
      });
      await db.headshotImage.update({
        where: { id: image.id },
        data: { creditState: "FROZEN" },
      });
      frozen.push(image);
    }
  } catch (error) {
    // Partial reservation is never left behind: release what was taken and
    // fail the whole batch, so the user is charged nothing and sees one error.
    await releaseReservations(batch.id, frozen, params.userId);
    logger.error(
      { err: error, batchId: batch.id, userId: params.userId },
      "Failed to reserve credits for headshot batch",
    );
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${INSUFFICIENT_CREDITS_CODE}: could not reserve ${creditsRequired} credits`,
    });
  }

  const failedToEnqueue: HeadshotImage[] = [];
  for (const image of batch.images) {
    try {
      await enqueueHeadshotImage(image.id);
    } catch (error) {
      logger.error(
        { err: error, imageId: image.id, batchId: batch.id },
        "Failed to enqueue headshot image",
      );
      failedToEnqueue.push(image);
    }
  }

  for (const image of failedToEnqueue) {
    await settleImageFailure({
      imageId: image.id,
      message: "Could not start generation. Your credit was returned.",
    });
  }

  await appEvents.emit("headshot_batch:created", {
    batchId: batch.id,
    userId: params.userId,
    styleKeys: params.styleKeys,
    requestedCount: batchSize,
  });

  logger.info(
    {
      batchId: batch.id,
      userId: params.userId,
      styleKeys: params.styleKeys,
      requestedCount: batchSize,
      forceFailure,
    },
    "Headshot batch created",
  );

  return getBatch({ userId: params.userId, batchId: batch.id });
}

async function releaseReservations(
  batchId: string,
  frozen: HeadshotImage[],
  userId: string,
): Promise<void> {
  for (const image of frozen) {
    try {
      await unfreezeImageCredit({
        userId,
        imageId: image.id,
        batchId,
        position: image.position,
      });
      await db.headshotImage.update({
        where: { id: image.id },
        data: { creditState: "UNFROZEN" },
      });
    } catch (error) {
      // The Velobase freeze TTL is the backstop here; log loudly and move on
      // rather than leaving the caller without an answer.
      logger.error(
        { err: error, imageId: image.id, batchId },
        "Failed to release a headshot credit reservation",
      );
    }
  }

  await db.headshotImage.updateMany({
    where: { batchId, status: "QUEUED" },
    data: { status: "CANCELLED" },
  });
  await db.headshotBatch.update({
    where: { id: batchId },
    data: {
      status: "FAILED",
      errorMessage: "Could not reserve credits for this batch",
      completedAt: new Date(),
    },
  });
}

/**
 * Gives the image provider a URL it can actually fetch.
 *
 * Falls back to the stored public URL when the provider cannot re-host, so a
 * provider without that capability still works wherever storage is public.
 */
async function resolveProviderSourceUrl(params: {
  storageKey: string;
  fallbackUrl: string;
}): Promise<string> {
  const { getImageGenerationProvider } =
    await import("@/server/ai/image-generation");

  try {
    const provider = getImageGenerationProvider(headshotConfig.provider);
    if (!provider.uploadInputImage) return params.fallbackUrl;

    const bytes = await getObject(params.storageKey);
    return await provider.uploadInputImage(
      bytes,
      params.storageKey.split("/").pop() ?? "portrait.jpg",
    );
  } catch (error) {
    // Not fatal on its own: the batch can still succeed if the fallback URL
    // happens to be reachable, and if it is not the images fail individually
    // and refund rather than losing the whole batch here.
    logger.error(
      { err: error, storageKey: params.storageKey },
      "Could not re-host the source portrait with the provider",
    );
    return params.fallbackUrl;
  }
}

export type HeadshotBatchView = Awaited<ReturnType<typeof getBatch>>;

export async function getBatch(params: { userId: string; batchId: string }) {
  const batch = await db.headshotBatch.findFirst({
    where: { id: params.batchId, userId: params.userId },
    include: { images: { orderBy: { position: "asc" } } },
  });

  if (!batch) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Batch not found" });
  }

  return toBatchView(batch);
}

export async function listBatches(params: ListParams) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;

  const batches = await db.headshotBatch.findMany({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
    include: { images: { orderBy: { position: "asc" } } },
  });

  let nextCursor: string | null = null;
  if (batches.length > limit) {
    nextCursor = batches.pop()!.id;
  }

  return { items: batches.map(toBatchView), nextCursor };
}

/** Completed images only — this backs the private results gallery. */
export async function listImages(params: ListParams & { batchId?: string }) {
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;

  const images = await db.headshotImage.findMany({
    where: {
      userId: params.userId,
      status: "COMPLETED",
      ...(params.batchId ? { batchId: params.batchId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
    skip: params.cursor ? 1 : 0,
    include: { batch: { select: { createdAt: true } } },
  });

  let nextCursor: string | null = null;
  if (images.length > limit) {
    nextCursor = images.pop()!.id;
  }

  return {
    items: images.map((image) => ({
      id: image.id,
      batchId: image.batchId,
      position: image.position,
      imageUrl: image.imageUrl,
      styleKey: image.styleKey,
      createdAt: image.createdAt,
    })),
    nextCursor,
  };
}

/**
 * Short-lived signed URL for one finished image.
 *
 * The gallery is private, so downloads are authorised per request against the
 * caller's own row rather than relying on an unguessable public URL.
 */
export async function getDownloadUrl(params: {
  userId: string;
  imageId: string;
}): Promise<{ url: string; filename: string }> {
  const image = await db.headshotImage.findFirst({
    where: { id: params.imageId, userId: params.userId, status: "COMPLETED" },
  });

  if (!image?.storageKey) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Image not found" });
  }

  const extension = image.storageKey.split(".").pop() ?? "png";
  const url = await getStorageSignedUrl(image.storageKey, 3600);

  return {
    url,
    filename: `crispshot-${image.styleKey}-${image.position + 1}.${extension}`,
  };
}

// ---------------------------------------------------------------------------
// Settlement helpers used by the worker
// ---------------------------------------------------------------------------

/**
 * Records a produced image without touching billing.
 *
 * Persisting the result before charging is deliberate: if the consume call
 * fails, a retry finds a COMPLETED image still holding a FROZEN credit and
 * finishes only the billing half, instead of paying the provider twice.
 */
export async function recordImageSuccess(params: {
  imageId: string;
  imageUrl: string;
  storageKey?: string;
  contentType?: string;
  byteLength?: number;
  imageGenerationTaskId?: string;
}): Promise<void> {
  await db.headshotImage.update({
    where: { id: params.imageId },
    data: {
      status: "COMPLETED",
      imageUrl: params.imageUrl,
      storageKey: params.storageKey,
      contentType: params.contentType,
      byteLength: params.byteLength,
      imageGenerationTaskId: params.imageGenerationTaskId,
      errorMessage: null,
      completedAt: new Date(),
    },
  });
}

/** Marks the credit as charged once `consume` has succeeded. */
export async function markCreditConsumed(imageId: string): Promise<void> {
  await db.headshotImage.update({
    where: { id: imageId },
    data: { creditState: "CONSUMED" },
  });
}

/** Records the failure, then releases the reserved credit. */
export async function settleImageFailure(params: {
  imageId: string;
  message: string;
  imageGenerationTaskId?: string;
}): Promise<void> {
  const image = await db.headshotImage.findUnique({
    where: { id: params.imageId },
  });
  if (!image) return;

  // A delivered image is never retracted by a later bookkeeping error. Flipping
  // it to FAILED here would hide a picture the user can see they received, and
  // if its credit was already consumed they would have paid for nothing.
  // Settling the billing half is the processor's COMPLETED branch.
  if (image.status === "COMPLETED") {
    logger.warn(
      { imageId: image.id, reason: params.message },
      "Ignoring failure settlement for an image that already completed",
    );
    return;
  }

  if (image.status !== "FAILED") {
    await db.headshotImage.update({
      where: { id: params.imageId },
      data: {
        status: "FAILED",
        errorMessage: params.message,
        imageGenerationTaskId:
          params.imageGenerationTaskId ?? image.imageGenerationTaskId,
        completedAt: new Date(),
      },
    });
  }

  await releaseImageCredit(params.imageId);
}

/**
 * Returns a reserved credit. Safe to call repeatedly: Velobase treats a repeat
 * unfreeze as an idempotent replay, and a credit already consumed or already
 * released is left alone.
 */
export async function releaseImageCredit(imageId: string): Promise<void> {
  const image = await db.headshotImage.findUnique({ where: { id: imageId } });
  if (!image) return;
  if (image.creditState !== "FROZEN") return;

  await unfreezeImageCredit({
    userId: image.userId,
    imageId: image.id,
    batchId: image.batchId,
    position: image.position,
  });

  await db.headshotImage.update({
    where: { id: imageId },
    data: { creditState: "UNFROZEN" },
  });
}

export async function markImageProcessing(imageId: string): Promise<void> {
  await db.headshotImage.update({
    where: { id: imageId },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });
  const image = await db.headshotImage.findUnique({
    where: { id: imageId },
    select: { batchId: true },
  });
  if (!image) return;
  await db.headshotBatch.updateMany({
    where: { id: image.batchId, status: "QUEUED" },
    data: { status: "PROCESSING", startedAt: new Date() },
  });
}

/**
 * Rolls the batch counters and status up from its images.
 *
 * Derived rather than incremented so a retried job can never double-count, and
 * emits the terminal domain event exactly once by only firing on the
 * transition into a terminal state.
 */
export async function recomputeBatchStatus(batchId: string): Promise<void> {
  const batch = await db.headshotBatch.findUnique({
    where: { id: batchId },
    include: { images: true },
  });
  if (!batch) return;

  const completed = batch.images.filter(
    (image) => image.status === "COMPLETED",
  ).length;
  const failed = batch.images.filter(
    (image) => image.status === "FAILED" || image.status === "CANCELLED",
  ).length;
  const settled = completed + failed;
  const isTerminal = settled >= batch.images.length;

  const status: HeadshotBatch["status"] = !isTerminal
    ? batch.status === "QUEUED" && settled === 0
      ? "QUEUED"
      : "PROCESSING"
    : completed > 0
      ? "COMPLETED"
      : "FAILED";

  const wasTerminal = batch.status === "COMPLETED" || batch.status === "FAILED";

  await db.headshotBatch.update({
    where: { id: batchId },
    data: {
      completedCount: completed,
      failedCount: failed,
      status,
      completedAt: isTerminal ? (batch.completedAt ?? new Date()) : null,
    },
  });

  if (isTerminal && !wasTerminal) {
    await appEvents.emit("headshot_batch:completed", {
      batchId: batch.id,
      userId: batch.userId,
      styleKeys: batch.styleKeys,
      completedCount: completed,
      failedCount: failed,
    });
  }
}

// ---------------------------------------------------------------------------

type BatchWithImages = Prisma.HeadshotBatchGetPayload<{
  include: { images: true };
}>;

function toBatchView(batch: BatchWithImages) {
  const images = [...batch.images].sort((a, b) => a.position - b.position);
  return {
    id: batch.id,
    styleKeys: batch.styleKeys,
    status: batch.status,
    sourceImageUrl: batch.sourceImageUrl,
    requestedCount: batch.requestedCount,
    completedCount: batch.completedCount,
    failedCount: batch.failedCount,
    creditsPerImage: batch.creditsPerImage,
    model: batch.model,
    provider: batch.provider,
    errorMessage: batch.errorMessage,
    createdAt: batch.createdAt,
    completedAt: batch.completedAt,
    images: images.map((image) => ({
      id: image.id,
      position: image.position,
      styleKey: image.styleKey,
      status: image.status,
      creditState: image.creditState,
      creditAmount: image.creditAmount,
      imageUrl: image.imageUrl,
      errorMessage: image.errorMessage,
      forcedFailure: image.forcedFailure,
      completedAt: image.completedAt,
    })),
  };
}
