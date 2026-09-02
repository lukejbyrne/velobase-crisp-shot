/**
 * Credit lifecycle for headshot generation.
 *
 * Thin wrappers over the framework billing services. Their only job is to fix
 * the conventions the rest of the module relies on:
 *
 *  - The Velobase transaction id is always the `HeadshotImage` row id. Because
 *    Velobase keys freeze/consume/unfreeze off that id, every operation is
 *    idempotent under worker retries and duplicate webhooks without the module
 *    needing a lock or a dedupe table of its own.
 *  - Every image in a batch is its own transaction, so one failure never
 *    disturbs its siblings.
 */
import { createLogger } from "@/lib/logger";
import { freeze } from "@/server/billing/services/freeze";
import { consume } from "@/server/billing/services/consume";
import { unfreeze } from "@/server/billing/services/unfreeze";
import { getBalance } from "@/server/billing/services/get-balance";
import { headshotConfig } from "./config";

const logger = createLogger("headshots-credits");

/** Business type reported to the billing ledger for headshot holds. */
const HEADSHOT_BUSINESS_TYPE = "TASK" as const;

export interface HeadshotCreditContext {
  userId: string;
  imageId: string;
  batchId: string;
  position: number;
}

/**
 * Reserves one credit for a single image.
 *
 * Returns `true` when the hold is in place — including when Velobase reports an
 * idempotent replay, which is exactly what a retried request looks like.
 */
export async function freezeImageCredit(
  ctx: HeadshotCreditContext,
): Promise<{ frozen: boolean; isIdempotentReplay: boolean }> {
  const result = await freeze({
    userId: ctx.userId,
    businessId: ctx.imageId,
    businessType: HEADSHOT_BUSINESS_TYPE,
    amount: headshotConfig.creditsPerImage,
    description: `CrispShot headshot ${ctx.position + 1}`,
    unfreezeAfterSeconds: headshotConfig.freezeTtlSeconds,
  });

  logger.info(
    {
      imageId: ctx.imageId,
      batchId: ctx.batchId,
      amount: result.totalAmount,
      isIdempotentReplay: result.isIdempotentReplay,
    },
    "Froze headshot credit",
  );

  return { frozen: true, isIdempotentReplay: result.isIdempotentReplay };
}

/** Charges the reserved credit once the image has actually been produced. */
export async function consumeImageCredit(
  ctx: HeadshotCreditContext,
): Promise<{ isIdempotentReplay: boolean }> {
  const result = await consume({
    businessId: ctx.imageId,
    actualAmount: headshotConfig.creditsPerImage,
  });

  logger.info(
    {
      imageId: ctx.imageId,
      batchId: ctx.batchId,
      amount: result.totalAmount,
      isIdempotentReplay: result.isIdempotentReplay,
    },
    "Consumed headshot credit",
  );

  return { isIdempotentReplay: result.isIdempotentReplay };
}

/** Releases the reserved credit when the image failed or was cancelled. */
export async function unfreezeImageCredit(
  ctx: HeadshotCreditContext,
): Promise<{ isIdempotentReplay: boolean }> {
  const result = await unfreeze({ businessId: ctx.imageId });

  logger.info(
    {
      imageId: ctx.imageId,
      batchId: ctx.batchId,
      amount: result.totalAmount,
      isIdempotentReplay: result.isIdempotentReplay,
    },
    "Unfroze headshot credit",
  );

  return { isIdempotentReplay: result.isIdempotentReplay };
}

export interface HeadshotCreditSummary {
  available: number;
  frozen: number;
  used: number;
  total: number;
}

/** Available / frozen / used balance, surfaced to the credits UI. */
export async function getCreditSummary(
  userId: string,
): Promise<HeadshotCreditSummary> {
  const balance = await getBalance({ userId });
  return {
    available: balance.totalSummary.available,
    frozen: balance.totalSummary.frozen,
    used: balance.totalSummary.used,
    total: balance.totalSummary.total,
  };
}
