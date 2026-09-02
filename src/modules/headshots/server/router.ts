import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  createBatchInputSchema,
  getBatchInputSchema,
  getDownloadUrlInputSchema,
  listBatchesInputSchema,
  listImagesInputSchema,
} from "./schema";
import {
  createBatch,
  getBatch,
  getCredits,
  getDownloadUrl,
  getGenerationSettings,
  listBatches,
  listImages,
  listStyles,
} from "./service";

export const headshotsRouter = createTRPCRouter({
  /** Style catalogue and batch settings for the landing page and the studio. */
  settings: publicProcedure.query(() => ({
    styles: listStyles(),
    ...getGenerationSettings(),
  })),

  /** Available / frozen / used credits for the signed-in user. */
  credits: protectedProcedure.query(async ({ ctx }) => {
    return getCredits(ctx.session.user.id);
  }),

  createBatch: protectedProcedure
    .input(createBatchInputSchema)
    .mutation(async ({ ctx, input }) => {
      return createBatch({
        userId: ctx.session.user.id,
        styleKeys: input.styleKeys,
        sourceStorageKey: input.sourceStorageKey,
        sourceImageUrl: input.sourceImageUrl,
        devForceFailure: input.devForceFailure,
      });
    }),

  getBatch: protectedProcedure
    .input(getBatchInputSchema)
    .query(async ({ ctx, input }) => {
      return getBatch({ userId: ctx.session.user.id, batchId: input.batchId });
    }),

  listBatches: protectedProcedure
    .input(listBatchesInputSchema)
    .query(async ({ ctx, input }) => {
      return listBatches({
        userId: ctx.session.user.id,
        limit: input.limit,
        cursor: input.cursor,
      });
    }),

  listImages: protectedProcedure
    .input(listImagesInputSchema)
    .query(async ({ ctx, input }) => {
      return listImages({
        userId: ctx.session.user.id,
        limit: input.limit,
        cursor: input.cursor,
        batchId: input.batchId,
      });
    }),

  /** Short-lived signed download URL, authorised against the caller's own row. */
  getDownloadUrl: protectedProcedure
    .input(getDownloadUrlInputSchema)
    .mutation(async ({ ctx, input }) => {
      return getDownloadUrl({
        userId: ctx.session.user.id,
        imageId: input.imageId,
      });
    }),
});
