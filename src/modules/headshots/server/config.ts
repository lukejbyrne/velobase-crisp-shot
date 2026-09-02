import { env } from "@/env";
import type { ImageGenerationProviderId } from "@/server/ai/image-generation";

/**
 * Runtime configuration for headshot generation.
 *
 * Everything provider-specific is resolved from the environment so swapping the
 * image provider or model is a deploy-time configuration change rather than a
 * code change, and no provider secret is ever exposed to the browser.
 */
export const headshotConfig = {
  /** Image provider id understood by `@/server/ai/image-generation`. */
  get provider(): ImageGenerationProviderId {
    return env.HEADSHOT_IMAGE_PROVIDER as ImageGenerationProviderId;
  },
  /** Provider model id used for the portrait -> headshot edit. */
  get model(): string {
    return env.HEADSHOT_IMAGE_MODEL;
  },
  get resolution(): "1k" | "2k" | "4k" | undefined {
    return env.HEADSHOT_IMAGE_RESOLUTION;
  },
  get aspectRatio(): string {
    return env.HEADSHOT_IMAGE_ASPECT_RATIO;
  },
  /** Images produced per batch. Each one is billed independently. */
  get batchSize(): number {
    return env.HEADSHOT_BATCH_SIZE;
  },
  /** Credits charged per successfully generated image. */
  creditsPerImage: 1,
  /**
   * Safety net handed to Velobase when freezing. If a worker dies between
   * freeze and settlement, the hold releases itself instead of stranding the
   * user's credit forever.
   */
  get freezeTtlSeconds(): number {
    return env.HEADSHOT_FREEZE_TTL_SECONDS;
  },
  /** Maximum bytes accepted for an uploaded source portrait. */
  maxUploadBytes: 10 * 1024 * 1024,
  acceptedUploadTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ] as const,
} as const;

/**
 * Whether a request may ask for a deliberately failing image.
 *
 * Two independent conditions must hold, so the switch cannot be flipped on in a
 * production deployment by configuration alone.
 */
export function isForcedFailureAllowed(): boolean {
  return env.NODE_ENV !== "production" && env.HEADSHOT_DEV_ALLOW_FORCED_FAILURE;
}

export const HEADSHOT_STORAGE_PREFIX = "headshot-sources";

/** Storage key layout for an uploaded source portrait. */
export function buildSourceStorageKey(
  userId: string,
  uploadId: string,
  extension: string,
): string {
  return `${userId}/${HEADSHOT_STORAGE_PREFIX}/${uploadId}.${extension}`;
}

/**
 * Storage keys are namespaced by user id, which is what makes ownership
 * checkable without a database round trip.
 */
export function isOwnedStorageKey(key: string, userId: string): boolean {
  return key.startsWith(`${userId}/`);
}
