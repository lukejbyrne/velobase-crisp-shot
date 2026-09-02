import assert from "node:assert/strict";
import test, { mock } from "node:test";

type MockModule = (
  specifier: string,
  options: { namedExports: Record<string, unknown> },
) => void;

const mockModule = (mock as unknown as { module: MockModule }).module.bind(
  mock,
);

const USER_ID = "user_1";
const OTHER_USER_ID = "user_2";

// --- Recorded calls -------------------------------------------------------

let freezeCalls: { imageId: string }[] = [];
let unfreezeCalls: { imageId: string }[] = [];
let enqueuedImageIds: string[] = [];
let emittedEvents: { event: string; payload: unknown }[] = [];
let creditSummary = { available: 100, frozen: 0, used: 0, total: 100 };
let freezeShouldFailAfter: number | null = null;
let moduleEnabled = true;

// --- Minimal in-memory database ------------------------------------------

interface FakeImage {
  id: string;
  batchId: string;
  userId: string;
  position: number;
  status: string;
  creditState: string;
  creditAmount: number;
  forcedFailure: boolean;
  imageUrl: string | null;
  storageKey: string | null;
  errorMessage: string | null;
  completedAt: Date | null;
  createdAt: Date;
}

interface FakeBatch {
  id: string;
  userId: string;
  styleKey: string;
  status: string;
  sourceImageUrl: string;
  sourceStorageKey: string;
  requestedCount: number;
  completedCount: number;
  failedCount: number;
  creditsPerImage: number;
  provider: string;
  model: string;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

let batches: FakeBatch[] = [];
let images: FakeImage[] = [];
let idCounter = 0;

const nextId = (prefix: string) => `${prefix}_${++idCounter}`;

function withImages(batch: FakeBatch) {
  return {
    ...batch,
    images: images
      .filter((image) => image.batchId === batch.id)
      .sort((a, b) => a.position - b.position),
  };
}

// `src/env.js` is mocked rather than skipping validation: SKIP_ENV_VALIDATION
// bypasses the zod schema entirely, which would also drop its defaults.
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
      headshotBatch: {
        count: async ({
          where,
        }: {
          where: { userId: string; status: { in: string[] } };
        }) =>
          batches.filter(
            (batch) =>
              batch.userId === where.userId &&
              where.status.in.includes(batch.status),
          ).length,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          const batch: FakeBatch = {
            id: nextId("batch"),
            userId: data.userId as string,
            styleKey: data.styleKey as string,
            status: data.status as string,
            sourceImageUrl: data.sourceImageUrl as string,
            sourceStorageKey: data.sourceStorageKey as string,
            requestedCount: data.requestedCount as number,
            completedCount: 0,
            failedCount: 0,
            creditsPerImage: data.creditsPerImage as number,
            provider: data.provider as string,
            model: data.model as string,
            errorMessage: null,
            startedAt: null,
            completedAt: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
          };
          batches.push(batch);

          const nested = data.images as { create: Record<string, unknown>[] };
          for (const row of nested.create) {
            images.push({
              id: nextId("image"),
              batchId: batch.id,
              userId: row.userId as string,
              position: row.position as number,
              status: row.status as string,
              creditState: row.creditState as string,
              creditAmount: row.creditAmount as number,
              forcedFailure: row.forcedFailure as boolean,
              imageUrl: null,
              storageKey: null,
              errorMessage: null,
              completedAt: null,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            });
          }
          return withImages(batch);
        },
        findUnique: async ({ where }: { where: { id: string } }) => {
          const batch = batches.find((item) => item.id === where.id);
          return batch ? withImages(batch) : null;
        },
        findFirst: async ({
          where,
        }: {
          where: { id: string; userId: string };
        }) => {
          const batch = batches.find(
            (item) => item.id === where.id && item.userId === where.userId,
          );
          return batch ? withImages(batch) : null;
        },
        findMany: async ({ where }: { where: { userId: string } }) =>
          batches
            .filter((batch) => batch.userId === where.userId)
            .map(withImages),
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const batch = batches.find((item) => item.id === where.id);
          if (batch) Object.assign(batch, data);
          return batch;
        },
        updateMany: async () => ({ count: 0 }),
      },
      headshotImage: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          images.find((image) => image.id === where.id) ?? null,
        findFirst: async ({
          where,
        }: {
          where: { id: string; userId: string; status?: string };
        }) => {
          const image = images.find(
            (item) =>
              item.id === where.id &&
              item.userId === where.userId &&
              (!where.status || item.status === where.status),
          );
          if (!image) return null;
          // Mirrors the `include: { batch: ... }` the service asks for.
          const batch = batches.find((item) => item.id === image.batchId);
          return { ...image, batch: { styleKey: batch?.styleKey ?? "" } };
        },
        findMany: async () => [],
        update: async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const image = images.find((item) => item.id === where.id);
          if (image) Object.assign(image, data);
          return image;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { batchId: string; status: string };
          data: Record<string, unknown>;
        }) => {
          let count = 0;
          for (const image of images) {
            if (
              image.batchId === where.batchId &&
              image.status === where.status
            ) {
              Object.assign(image, data);
              count += 1;
            }
          }
          return { count };
        },
      },
    },
  },
});

mockModule(new URL("./credits.ts", import.meta.url).href, {
  namedExports: {
    freezeImageCredit: async ({ imageId }: { imageId: string }) => {
      if (
        freezeShouldFailAfter !== null &&
        freezeCalls.length >= freezeShouldFailAfter
      ) {
        throw new Error("insufficient balance");
      }
      freezeCalls.push({ imageId });
      return { frozen: true, isIdempotentReplay: false };
    },
    consumeImageCredit: async () => ({ isIdempotentReplay: false }),
    unfreezeImageCredit: async ({ imageId }: { imageId: string }) => {
      unfreezeCalls.push({ imageId });
      return { isIdempotentReplay: false };
    },
    getCreditSummary: async () => creditSummary,
  },
});

mockModule(new URL("../worker/queue.ts", import.meta.url).href, {
  namedExports: {
    enqueueHeadshotImage: async (imageId: string) => {
      enqueuedImageIds.push(imageId);
    },
    HEADSHOT_GENERATION_MAX_ATTEMPTS: 3,
  },
});

mockModule(new URL("../../../server/events/bus.ts", import.meta.url).href, {
  namedExports: {
    appEvents: {
      emit: async (event: string, payload: unknown) => {
        emittedEvents.push({ event, payload });
      },
    },
  },
});

mockModule(new URL("../../../server/storage.ts", import.meta.url).href, {
  namedExports: {
    getStorageSignedUrl: async (key: string) =>
      `https://signed.example/${key}?token=abc`,
  },
});

mockModule(new URL("../../../config/modules.ts", import.meta.url).href, {
  namedExports: {
    isModuleEnabled: () => moduleEnabled,
  },
});

const {
  createBatch,
  getBatch,
  getDownloadUrl,
  recomputeBatchStatus,
  settleImageFailure,
  releaseImageCredit,
  recordImageSuccess,
} = await import("./service");

function reset() {
  batches = [];
  images = [];
  idCounter = 0;
  freezeCalls = [];
  unfreezeCalls = [];
  enqueuedImageIds = [];
  emittedEvents = [];
  creditSummary = { available: 100, frozen: 0, used: 0, total: 100 };
  freezeShouldFailAfter = null;
  moduleEnabled = true;
}

const VALID_INPUT = {
  userId: USER_ID,
  styleKey: "corporate",
  sourceStorageKey: `${USER_ID}/headshot-sources/abc.png`,
  sourceImageUrl: "https://cdn.example.com/portrait.png",
};

void test("createBatch reserves one credit per image and enqueues each one", async () => {
  reset();

  const batch = await createBatch(VALID_INPUT);

  assert.equal(batch.images.length, 4);
  assert.equal(freezeCalls.length, 4);
  assert.equal(enqueuedImageIds.length, 4);
  assert.deepEqual(
    freezeCalls.map((call) => call.imageId).sort(),
    batch.images.map((image) => image.id).sort(),
  );
  assert.ok(batch.images.every((image) => image.creditState === "FROZEN"));
  assert.ok(batch.images.every((image) => image.status === "QUEUED"));
});

void test("createBatch rejects a source photo owned by another user", async () => {
  reset();

  await assert.rejects(
    createBatch({
      ...VALID_INPUT,
      sourceStorageKey: `${OTHER_USER_ID}/headshot-sources/abc.png`,
    }),
    (error: unknown) => {
      assert.equal((error as { code?: unknown }).code, "FORBIDDEN");
      return true;
    },
  );
  assert.equal(freezeCalls.length, 0);
});

void test("createBatch refuses to start when the balance is short", async () => {
  reset();
  creditSummary = { available: 3, frozen: 0, used: 0, total: 3 };

  await assert.rejects(createBatch(VALID_INPUT), (error: unknown) => {
    assert.equal((error as { code?: unknown }).code, "PRECONDITION_FAILED");
    assert.match(
      (error as { message: string }).message,
      /INSUFFICIENT_CREDITS/,
    );
    return true;
  });
  assert.equal(freezeCalls.length, 0);
});

void test("createBatch releases earlier reservations when a later freeze fails", async () => {
  reset();
  // Balance looks fine, but the ledger rejects the third hold.
  freezeShouldFailAfter = 2;

  await assert.rejects(createBatch(VALID_INPUT), (error: unknown) => {
    assert.equal((error as { code?: unknown }).code, "PRECONDITION_FAILED");
    return true;
  });

  assert.equal(freezeCalls.length, 2);
  assert.deepEqual(
    unfreezeCalls.map((call) => call.imageId),
    freezeCalls.map((call) => call.imageId),
  );
  assert.equal(enqueuedImageIds.length, 0);
  assert.equal(batches[0]?.status, "FAILED");
});

void test("createBatch rejects an unknown style before touching billing", async () => {
  reset();

  await assert.rejects(
    createBatch({ ...VALID_INPUT, styleKey: "not-a-style" }),
    (error: unknown) => {
      assert.equal((error as { code?: unknown }).code, "BAD_REQUEST");
      return true;
    },
  );
  assert.equal(freezeCalls.length, 0);
});

void test("createBatch is blocked when the module is disabled", async () => {
  reset();
  moduleEnabled = false;

  await assert.rejects(createBatch(VALID_INPUT), (error: unknown) => {
    assert.equal((error as { code?: unknown }).code, "PRECONDITION_FAILED");
    return true;
  });
});

void test("createBatch stops a user from queuing unlimited batches", async () => {
  reset();

  await createBatch(VALID_INPUT);
  await createBatch(VALID_INPUT);
  await createBatch(VALID_INPUT);

  await assert.rejects(createBatch(VALID_INPUT), (error: unknown) => {
    assert.equal((error as { code?: unknown }).code, "TOO_MANY_REQUESTS");
    return true;
  });
});

void test("getBatch does not expose another user's batch", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);

  await assert.rejects(
    getBatch({ userId: OTHER_USER_ID, batchId: batch.id }),
    (error: unknown) => {
      assert.equal((error as { code?: unknown }).code, "NOT_FOUND");
      return true;
    },
  );
});

void test("settleImageFailure marks the image failed and returns its credit", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);
  const target = batch.images[0]!;
  unfreezeCalls = [];

  await settleImageFailure({ imageId: target.id, message: "provider error" });

  const stored = images.find((image) => image.id === target.id)!;
  assert.equal(stored.status, "FAILED");
  assert.equal(stored.creditState, "UNFROZEN");
  assert.equal(stored.errorMessage, "provider error");
  assert.deepEqual(unfreezeCalls, [{ imageId: target.id }]);
});

void test("releasing a credit twice does not unfreeze twice", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);
  const target = batch.images[0]!;
  unfreezeCalls = [];

  await releaseImageCredit(target.id);
  await releaseImageCredit(target.id);

  assert.equal(unfreezeCalls.length, 1);
});

void test("a consumed credit is never released by a later failure settlement", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);
  const target = batch.images[0]!;
  const stored = images.find((image) => image.id === target.id)!;
  stored.creditState = "CONSUMED";
  unfreezeCalls = [];

  await settleImageFailure({ imageId: target.id, message: "late failure" });

  assert.equal(unfreezeCalls.length, 0);
  assert.equal(stored.creditState, "CONSUMED");
});

void test("recomputeBatchStatus derives counters and completes the batch once", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);

  for (const [index, image] of batch.images.entries()) {
    const stored = images.find((item) => item.id === image.id)!;
    if (index === 0) {
      stored.status = "FAILED";
    } else {
      stored.status = "COMPLETED";
    }
  }

  emittedEvents = [];
  await recomputeBatchStatus(batch.id);
  await recomputeBatchStatus(batch.id);

  const stored = batches.find((item) => item.id === batch.id)!;
  assert.equal(stored.status, "COMPLETED");
  assert.equal(stored.completedCount, 3);
  assert.equal(stored.failedCount, 1);

  const completedEvents = emittedEvents.filter(
    (entry) => entry.event === "headshot_batch:completed",
  );
  assert.equal(completedEvents.length, 1);
});

void test("a batch where every image failed is reported as failed", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);
  for (const image of batch.images) {
    images.find((item) => item.id === image.id)!.status = "FAILED";
  }

  await recomputeBatchStatus(batch.id);

  assert.equal(batches.find((item) => item.id === batch.id)!.status, "FAILED");
});

void test("getDownloadUrl signs only the caller's own completed image", async () => {
  reset();
  const batch = await createBatch(VALID_INPUT);
  const target = batch.images[0]!;
  await recordImageSuccess({
    imageId: target.id,
    imageUrl: "https://cdn.example.com/out.png",
    storageKey: `${USER_ID}/generated-images/task/0.png`,
  });

  const result = await getDownloadUrl({
    userId: USER_ID,
    imageId: target.id,
  });
  assert.match(result.url, /^https:\/\/signed\.example\//);
  assert.match(result.filename, /^crispshot-corporate-1\.png$/);

  await assert.rejects(
    getDownloadUrl({ userId: OTHER_USER_ID, imageId: target.id }),
    (error: unknown) => {
      assert.equal((error as { code?: unknown }).code, "NOT_FOUND");
      return true;
    },
  );
});
