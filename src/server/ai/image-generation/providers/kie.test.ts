import assert from "node:assert/strict";
import test, { mock } from "node:test";

type MockModule = (
  specifier: string,
  options: { namedExports: Record<string, unknown> },
) => void;

const mockModule = (mock as unknown as { module: MockModule }).module.bind(
  mock,
);

mockModule(new URL("../../../../env.js", import.meta.url).href, {
  namedExports: {
    env: {
      NODE_ENV: "test",
      KIE_API: "test-key",
      KIE_BASE_URL: "https://api.kie.ai",
      KIE_REQUEST_TIMEOUT_MS: 30000,
    },
  },
});

const { KieProvider, mapState, parseResultUrls, clampResolution } =
  await import("./kie");

/** The stub only ever receives a JSON string body, unlike the wider BodyInit. */
type StubInit = Omit<RequestInit, "body"> & { body?: string };

/** Captures outgoing requests and replays a scripted response. */
function stubFetch(responses: { status?: number; body: unknown }[]): {
  calls: { url: string; init: StubInit }[];
} {
  const calls: { url: string; init: StubInit }[] = [];
  let index = 0;
  globalThis.fetch = (async (url: string | URL, init: StubInit = {}) => {
    calls.push({ url: String(url), init });
    const next = responses[Math.min(index, responses.length - 1)]!;
    index += 1;
    return {
      ok: (next.status ?? 200) < 400,
      status: next.status ?? 200,
      statusText: "",
      text: async () => JSON.stringify(next.body),
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { calls };
}

const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

void test("createPrediction posts the documented createTask shape", async () => {
  const { calls } = stubFetch([
    { body: { code: 200, data: { taskId: "t_1" } } },
  ]);

  const provider = new KieProvider();
  const result = await provider.createPrediction({
    model: "gpt-image-2-image-to-image",
    operation: "edit-image",
    prompt: "a professional headshot",
    aspectRatio: "1:1",
    resolution: "2k",
    imageUrls: ["https://cdn.example.com/portrait.png"],
  });

  const call = calls[0]!;
  assert.equal(call.url, "https://api.kie.ai/api/v1/jobs/createTask");
  assert.equal(call.init.method, "POST");

  const body = JSON.parse(call.init.body ?? "{}") as {
    model: string;
    input: Record<string, unknown>;
  };
  assert.equal(body.model, "gpt-image-2-image-to-image");
  assert.equal(body.input.prompt, "a professional headshot");
  assert.deepEqual(body.input.input_urls, [
    "https://cdn.example.com/portrait.png",
  ]);
  assert.equal(body.input.aspect_ratio, "1:1");
  // Kie expects uppercase resolution tokens.
  assert.equal(body.input.resolution, "2K");

  assert.equal(result.providerTaskId, "t_1");
  assert.equal(result.status, "queued");
});

void test("createPrediction sends the bearer token", async () => {
  const { calls } = stubFetch([
    { body: { code: 200, data: { taskId: "t_1" } } },
  ]);
  await new KieProvider().createPrediction({
    model: "m",
    operation: "text-to-image",
    prompt: "p",
  });
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
});

void test("a succeeded task exposes its result urls", async () => {
  stubFetch([
    {
      body: {
        code: 200,
        data: {
          taskId: "t_1",
          model: "gpt-image-2-image-to-image",
          state: "success",
          resultJson: JSON.stringify({
            resultUrls: ["https://cdn.kie.ai/out-1.png"],
          }),
        },
      },
    },
  ]);

  const result = await new KieProvider().getPrediction("t_1");
  assert.equal(result.status, "succeeded");
  assert.deepEqual(result.outputs, ["https://cdn.kie.ai/out-1.png"]);
  assert.equal(result.error, undefined);
});

void test("a failed task surfaces the provider message and no outputs", async () => {
  stubFetch([
    {
      body: {
        code: 200,
        data: {
          taskId: "t_1",
          state: "fail",
          failCode: "500",
          failMsg: "content policy violation",
          resultJson: "",
        },
      },
    },
  ]);

  const result = await new KieProvider().getPrediction("t_1");
  assert.equal(result.status, "failed");
  assert.equal(result.error, "content policy violation");
  assert.deepEqual(result.outputs, []);
});

void test("an in-flight task reports running without outputs", async () => {
  stubFetch([
    { body: { code: 200, data: { taskId: "t_1", state: "generating" } } },
  ]);
  const result = await new KieProvider().getPrediction("t_1");
  assert.equal(result.status, "running");
  assert.deepEqual(result.outputs, []);
});

void test("a non-200 envelope on a 200 response is treated as an error", async () => {
  stubFetch([
    { status: 200, body: { code: 402, msg: "insufficient credits" } },
  ]);
  await assert.rejects(
    new KieProvider().getPrediction("t_1"),
    (error: unknown) => {
      assert.match((error as Error).message, /insufficient credits/);
      return true;
    },
  );
});

void test("a missing task id is rejected rather than returned empty", async () => {
  stubFetch([{ body: { code: 200, data: {} } }]);
  await assert.rejects(
    new KieProvider().createPrediction({
      model: "m",
      operation: "text-to-image",
      prompt: "p",
    }),
    /did not return a task id/,
  );
});

void test("mapState covers every documented Kie state", () => {
  assert.equal(mapState("waiting"), "queued");
  assert.equal(mapState("queuing"), "queued");
  assert.equal(mapState("generating"), "running");
  assert.equal(mapState("success"), "succeeded");
  assert.equal(mapState("fail"), "failed");
  assert.equal(mapState(undefined), "queued");
});

void test("parseResultUrls handles the nested json string and bad input", () => {
  assert.deepEqual(
    parseResultUrls(JSON.stringify({ resultUrls: ["a", "b"] })),
    ["a", "b"],
  );
  assert.deepEqual(parseResultUrls("not json"), []);
  assert.deepEqual(parseResultUrls(undefined), []);
  assert.deepEqual(parseResultUrls(JSON.stringify({ resultUrls: "x" })), []);
});

void test("capabilities advertise the edit operation the product needs", () => {
  const caps = new KieProvider().getCapabilities();
  assert.equal(caps.provider, "kie");
  assert.ok(caps.operations.includes("edit-image"));
  assert.equal(caps.supportsPricing, false);
});

void test("resolution is clamped to what Kie accepts for the ratio", () => {
  // Unset or auto ratio is 1K-only.
  assert.equal(clampResolution("4k", undefined), "1k");
  assert.equal(clampResolution("2k", "auto"), "1k");
  // 5:4 and 4:5 are 1K-only.
  assert.equal(clampResolution("4k", "5:4"), "1k");
  assert.equal(clampResolution("2k", "4:5"), "1k");
  // 1:1 cannot reach 4K.
  assert.equal(clampResolution("4k", "1:1"), "2k");
  // Otherwise untouched.
  assert.equal(clampResolution("4k", "16:9"), "4k");
  assert.equal(clampResolution("1k", "1:1"), "1k");
});

void test("a 4K request on a square ratio is downgraded, not rejected", async () => {
  const { calls } = stubFetch([{ body: { code: 200, data: { taskId: "t" } } }]);
  await new KieProvider().createPrediction({
    model: "gpt-image-2-image-to-image",
    operation: "edit-image",
    prompt: "p",
    aspectRatio: "1:1",
    resolution: "4k",
  });
  const body = JSON.parse(calls[0]!.init.body ?? "{}") as {
    input: Record<string, unknown>;
  };
  assert.equal(body.input.resolution, "2K");
});

void test("input_urls is capped at the documented maximum", async () => {
  const { calls } = stubFetch([{ body: { code: 200, data: { taskId: "t" } } }]);
  await new KieProvider().createPrediction({
    model: "m",
    operation: "image-to-image",
    prompt: "p",
    aspectRatio: "16:9",
    imageUrls: Array.from({ length: 20 }, (_, i) => `https://x/${i}.png`),
  });
  const body = JSON.parse(calls[0]!.init.body ?? "{}") as {
    input: { input_urls: string[] };
  };
  assert.equal(body.input.input_urls.length, 16);
});
