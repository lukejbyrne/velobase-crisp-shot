import assert from "node:assert/strict";
import test, { mock } from "node:test";
import type { Job } from "bullmq";

type MockModule = (
  specifier: string,
  options: { namedExports: Record<string, unknown> },
) => void;

const mockModule = (mock as unknown as { module: MockModule }).module.bind(
  mock,
);

const USER_ID = "user_1";
const BATCH_ID = "batch_1";
const IMAGE_ID = "image_1";

interface FakeImage {
  id: string;
  batchId: string;
  userId: string;
  position: number;
  status: string;
  creditState: string;
  forcedFailure: boolean;
  imageGenerationTaskId: string | null;
  imageUrl: string | null;
  storageKey: string | null;
  errorMessage: string | null;
}

let image: FakeImage;
let batchRow: Record<string, unknown>;

let freezeCalls = 0;
let consumeCalls = 0;
let unfreezeCalls = 0;
let createTaskCalls: { idempotencyKey?: string; imageUrls?: string[] }[] = [];
let waitResult: {
  status: string;
  errorMessage?: string;
  assets: {
    status: string;
    publicUrl?: string;
    storageKey?: string;
    contentType?: string;
    byteLength?: number;
  }[];
} = { status: "succeeded", assets: [] };
let emittedEvents: string[] = [];
let recomputeCalls = 0;
let allowForcedFailure = false;
let consumeShouldFail = false;
let recomputeShouldFail = false;

mockModule(new URL("../../../env.js", import.meta.url).href, {
  namedExports: {
    env: {
      NODE_ENV: "test",
      HEADSHOT_IMAGE_PROVIDER: "kie",
      HEADSHOT_IMAGE_MODEL: "gpt-image-2-image-to-image",
      HEADSHOT_IMAGE_RESOLUTION: undefined,
      HEADSHOT_IMAGE_ASPECT_RATIO: "1:1",
      HEADSHOT_BATCH_SIZE: 4,
      HEADSHOT_FREEZE_TTL_SECONDS: 86400,
      HEADSHOT_DEV_ALLOW_FORCED_FAILURE: false,
    },
  },
});

mockModule(new URL("../../../server/db.ts", import.meta.url).href, {
  namedExports: {
    db: {
      headshotImage: {
        findUnique: async () => ({ ...image, batch: batchRow }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(image, data);
          return image;
        },
      },
    },
  },
});

mockModule(new URL("../server/credits.ts", import.meta.url).href, {
  namedExports: {
    freezeImageCredit: async () => {
      freezeCalls += 1;
      return { frozen: true, isIdempotentReplay: false };
    },
    consumeImageCredit: async () => {
      if (consumeShouldFail) throw new Error("velobase unavailable");
      consumeCalls += 1;
      return { isIdempotentReplay: false };
    },
    unfreezeImageCredit: async () => {
      unfreezeCalls += 1;
      return { isIdempotentReplay: false };
    },
    getCreditSummary: async () => ({
      available: 0,
      frozen: 0,
      used: 0,
      total: 0,
    }),
  },
});

mockModule(new URL("../server/config.ts", import.meta.url).href, {
  namedExports: {
    headshotConfig: {
      provider: "kie",
      model: "gpt-image-2-image-to-image",
      resolution: undefined,
      aspectRatio: "1:1",
      batchSize: 4,
      creditsPerImage: 1,
      freezeTtlSeconds: 86400,
      maxUploadBytes: 10 * 1024 * 1024,
      acceptedUploadTypes: ["image/png"],
    },
    isForcedFailureAllowed: () => allowForcedFailure,
    buildSourceStorageKey: (userId: string, id: string, ext: string) =>
      `${userId}/headshot-sources/${id}.${ext}`,
    isOwnedStorageKey: (key: string, userId: string) =>
      key.startsWith(`${userId}/`),
    HEADSHOT_STORAGE_PREFIX: "headshot-sources",
  },
});

mockModule(new URL("../server/service.ts", import.meta.url).href, {
  namedExports: {
    markImageProcessing: async () => {
      image.status = "PROCESSING";
    },
    markCreditConsumed: async () => {
      image.creditState = "CONSUMED";
    },
    recordImageSuccess: async (params: {
      imageUrl: string;
      storageKey?: string;
    }) => {
      image.status = "COMPLETED";
      image.imageUrl = params.imageUrl;
      image.storageKey = params.storageKey ?? null;
    },
    settleImageFailure: async (params: { message: string }) => {
      if (image.status === "COMPLETED") return;
      image.status = "FAILED";
      image.errorMessage = params.message;
      if (image.creditState === "FROZEN") {
        unfreezeCalls += 1;
        image.creditState = "UNFROZEN";
      }
    },
    releaseImageCredit: async () => {
      if (image.creditState === "FROZEN") {
        unfreezeCalls += 1;
        image.creditState = "UNFROZEN";
      }
    },
    recomputeBatchStatus: async () => {
      if (recomputeShouldFail) {
        recomputeShouldFail = false;
        throw new Error("transient database error");
      }
      recomputeCalls += 1;
    },
  },
});

mockModule(new URL("../../../server/events/bus.ts", import.meta.url).href, {
  namedExports: {
    appEvents: {
      emit: async (event: string) => {
        emittedEvents.push(event);
      },
    },
  },
});

mockModule(
  new URL("../../../server/ai/image-generation/index.ts", import.meta.url).href,
  {
    namedExports: {
      imageGeneration: {
        createTask: async (input: {
          idempotencyKey?: string;
          imageUrls?: string[];
        }) => {
          createTaskCalls.push(input);
          return { id: "task_1" };
        },
        waitForTask: async () => waitResult,
        getTask: async () => waitResult,
      },
    },
  },
);

const { processHeadshotGenerationJob, FORCED_FAILURE_MESSAGE } =
  await import("./processor");

function reset(overrides: Partial<FakeImage> = {}) {
  image = {
    id: IMAGE_ID,
    batchId: BATCH_ID,
    userId: USER_ID,
    position: 0,
    status: "QUEUED",
    creditState: "FROZEN",
    forcedFailure: false,
    imageGenerationTaskId: null,
    imageUrl: null,
    storageKey: null,
    errorMessage: null,
    ...overrides,
  };
  batchRow = {
    id: BATCH_ID,
    userId: USER_ID,
    styleKey: "corporate",
    model: "gpt-image-2-image-to-image",
    sourceImageUrl: "https://cdn.example.com/portrait.png",
  };
  freezeCalls = 0;
  consumeCalls = 0;
  unfreezeCalls = 0;
  createTaskCalls = [];
  emittedEvents = [];
  recomputeCalls = 0;
  allowForcedFailure = false;
  consumeShouldFail = false;
  recomputeShouldFail = false;
  waitResult = {
    status: "succeeded",
    assets: [
      {
        status: "succeeded",
        publicUrl: "https://cdn.example.com/out.png",
        storageKey: `${USER_ID}/generated-images/task_1/0.png`,
        contentType: "image/png",
        byteLength: 1234,
      },
    ],
  };
}

function makeJob(attemptsMade = 0): Job<{
  type: "generate-image";
  headshotImageId: string;
}> {
  return {
    data: { type: "generate-image", headshotImageId: IMAGE_ID },
    attemptsMade,
  } as Job<{ type: "generate-image"; headshotImageId: string }>;
}

void test("a successful render consumes exactly one credit", async () => {
  reset();

  await processHeadshotGenerationJob(makeJob());

  assert.equal(image.status, "COMPLETED");
  assert.equal(image.creditState, "CONSUMED");
  assert.equal(consumeCalls, 1);
  assert.equal(unfreezeCalls, 0);
  assert.ok(emittedEvents.includes("headshot_image:succeeded"));
});

void test("generation is keyed so a retry never renders twice", async () => {
  reset();

  await processHeadshotGenerationJob(makeJob());

  assert.equal(createTaskCalls.length, 1);
  assert.equal(createTaskCalls[0]?.idempotencyKey, `headshot_${IMAGE_ID}`);
  assert.deepEqual(createTaskCalls[0]?.imageUrls, [
    "https://cdn.example.com/portrait.png",
  ]);
});

void test("re-running a completed image does no work and does not re-charge", async () => {
  reset({ status: "COMPLETED", creditState: "CONSUMED" });

  await processHeadshotGenerationJob(makeJob());

  assert.equal(consumeCalls, 0);
  assert.equal(createTaskCalls.length, 0);
  assert.equal(unfreezeCalls, 0);
});

void test("a retry finishes only the billing half when the render already landed", async () => {
  reset({ status: "COMPLETED", creditState: "FROZEN" });

  await processHeadshotGenerationJob(makeJob());

  assert.equal(consumeCalls, 1);
  assert.equal(image.creditState, "CONSUMED");
  // Crucially, it does not pay the provider a second time.
  assert.equal(createTaskCalls.length, 0);
});

void test("a retry on an already-failed image only returns the credit", async () => {
  reset({ status: "FAILED", creditState: "FROZEN" });

  await processHeadshotGenerationJob(makeJob());

  assert.equal(unfreezeCalls, 1);
  assert.equal(image.creditState, "UNFROZEN");
  assert.equal(createTaskCalls.length, 0);
  assert.equal(consumeCalls, 0);
});

void test("a permanent provider failure returns the credit on the first attempt", async () => {
  reset();
  waitResult = {
    status: "failed",
    errorMessage: "provider said no",
    assets: [],
  };

  await processHeadshotGenerationJob(makeJob(0));

  assert.equal(image.status, "FAILED");
  assert.equal(image.creditState, "UNFROZEN");
  assert.equal(unfreezeCalls, 1);
  assert.equal(consumeCalls, 0);
  assert.ok(emittedEvents.includes("headshot_image:failed"));
});

void test("a transient failure is rethrown for retry and keeps the credit frozen", async () => {
  reset();
  waitResult = {
    status: "timed_out",
    errorMessage: "took too long",
    assets: [],
  };

  await assert.rejects(processHeadshotGenerationJob(makeJob(0)));

  assert.equal(image.status, "PROCESSING");
  assert.equal(image.creditState, "FROZEN");
  assert.equal(unfreezeCalls, 0);
});

void test("the final attempt settles a transient failure instead of retrying forever", async () => {
  reset();
  waitResult = {
    status: "timed_out",
    errorMessage: "took too long",
    assets: [],
  };

  // attemptsMade 2 + 1 === HEADSHOT_GENERATION_MAX_ATTEMPTS
  await processHeadshotGenerationJob(makeJob(2));

  assert.equal(image.status, "FAILED");
  assert.equal(image.creditState, "UNFROZEN");
  assert.equal(unfreezeCalls, 1);
});

void test("a task with no usable asset is refunded once retries are exhausted", async () => {
  reset();
  waitResult = { status: "succeeded", assets: [{ status: "failed" }] };

  // Only on the final attempt: earlier attempts re-poll, because the asset may
  // still be landing and refunding a good render would be worse.
  await processHeadshotGenerationJob(makeJob(2));

  assert.equal(image.status, "FAILED");
  assert.equal(image.creditState, "UNFROZEN");
  assert.equal(consumeCalls, 0);
});

void test("the forced failure switch refunds without calling the provider", async () => {
  reset({ forcedFailure: true });
  allowForcedFailure = true;

  await processHeadshotGenerationJob(makeJob(0));

  assert.equal(createTaskCalls.length, 0);
  assert.equal(image.status, "FAILED");
  assert.equal(image.errorMessage, FORCED_FAILURE_MESSAGE);
  assert.equal(image.creditState, "UNFROZEN");
});

void test("the forced failure flag is ignored when the server has not opted in", async () => {
  reset({ forcedFailure: true });
  allowForcedFailure = false;

  await processHeadshotGenerationJob(makeJob(0));

  assert.equal(image.status, "COMPLETED");
  assert.equal(image.creditState, "CONSUMED");
});

void test("an image with no reservation gets one before generating", async () => {
  reset({ creditState: "NONE" });

  await processHeadshotGenerationJob(makeJob());

  assert.equal(freezeCalls, 1);
  assert.equal(image.creditState, "CONSUMED");
});

void test("an image whose credit was already settled is skipped rather than re-billed", async () => {
  reset({ creditState: "UNFROZEN" });

  await processHeadshotGenerationJob(makeJob());

  assert.equal(createTaskCalls.length, 0);
  assert.equal(consumeCalls, 0);
  assert.equal(unfreezeCalls, 0);
  assert.equal(recomputeCalls, 1);
});

void test("a completed image whose charge keeps failing still unwedges its batch", async () => {
  reset({ status: "COMPLETED", creditState: "FROZEN" });
  consumeShouldFail = true;

  // Not the final attempt: rethrow so BullMQ retries.
  await assert.rejects(processHeadshotGenerationJob(makeJob(0)));
  assert.equal(recomputeCalls, 0);

  // Final attempt: give up on charging, but never leave the batch PROCESSING.
  await processHeadshotGenerationJob(makeJob(2));
  assert.equal(recomputeCalls, 1);
  assert.equal(image.status, "COMPLETED");
});

void test("a delivered image is never flipped to failed by a later error", async () => {
  reset();
  // Succeed the render, then fail the bookkeeping that follows it.
  recomputeShouldFail = true;

  await processHeadshotGenerationJob(makeJob(2));

  // The picture exists and was charged for; it must remain visible.
  assert.equal(image.status, "COMPLETED");
  assert.equal(image.creditState, "CONSUMED");
});

void test("a succeeded task with a late asset is retried, not refunded", async () => {
  reset();
  waitResult = { status: "succeeded", assets: [] };

  // Never permanent: refunding here would discard a render that worked.
  await assert.rejects(processHeadshotGenerationJob(makeJob(0)));
  assert.equal(image.status, "PROCESSING");
  assert.equal(image.creditState, "FROZEN");
  assert.equal(unfreezeCalls, 0);
});
