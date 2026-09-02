import { z } from "zod";
import { HEADSHOT_STYLE_KEYS } from "../styles";

/**
 * Router input schemas. `userId` is never accepted from the client — every
 * procedure derives it from the session.
 */

const storageKeySchema = z
  .string()
  .min(1)
  .max(512)
  // Storage keys are server-generated; rejecting traversal and absolute forms
  // keeps a tampered key from escaping the caller's own prefix.
  .refine((key) => !key.includes("..") && !key.startsWith("/"), {
    message: "Invalid storage key",
  });

export const createBatchInputSchema = z.object({
  styleKey: z.enum(HEADSHOT_STYLE_KEYS),
  sourceStorageKey: storageKeySchema,
  sourceImageUrl: z.string().url().max(2048),
  /**
   * Development-only: forces the first image of the batch to fail so the
   * freeze -> unfreeze refund path can be demonstrated. Silently ignored
   * unless the server has explicitly opted in and is not in production.
   */
  devForceFailure: z.boolean().optional().default(false),
});

export const getBatchInputSchema = z.object({
  batchId: z.string().min(1).max(64),
});

export const listBatchesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().nullish(),
});

export const listImagesInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().nullish(),
  batchId: z.string().min(1).max(64).optional(),
});

export const getDownloadUrlInputSchema = z.object({
  imageId: z.string().min(1).max(64),
});

export type CreateBatchInput = z.infer<typeof createBatchInputSchema>;
export type ListBatchesInput = z.infer<typeof listBatchesInputSchema>;
export type ListImagesInput = z.infer<typeof listImagesInputSchema>;
