import { env } from "@/env";
import { createLogger } from "@/lib/logger";
import type {
  ImageGenerationEstimateInput,
  ImageGenerationStatus,
} from "../types";
import type {
  ImageGenerationProviderAdapter,
  ProviderCapabilities,
  ProviderImageGenerationInput,
  ProviderModel,
  ProviderPrediction,
} from "./types";
import { ImageGenerationProviderError } from "./types";

const logger = createLogger("kie-provider");

const KIE_PROVIDER_ID = "kie" as const;
const MAX_ATTEMPTS = 3;

/** Kie wraps every response in an envelope; `code` is its own status, not HTTP. */
type KieEnvelope<T> = {
  code?: number;
  msg?: string;
  data?: T;
};

type KieCreateTaskData = {
  taskId?: string;
};

type KieRecordInfoData = {
  taskId?: string;
  model?: string;
  state?: string;
  resultJson?: string;
  failCode?: string;
  failMsg?: string;
  costTime?: number;
  createTime?: number;
  completeTime?: number;
  progress?: number;
  creditsConsumed?: number;
};

/**
 * Kie.ai image generation provider.
 *
 * Kie is a task API: `createTask` returns a task id immediately and
 * `recordInfo` is polled until the task settles. That is the same shape the
 * framework's worker already drives for WaveSpeed, so this adapter only has to
 * translate names and unwrap Kie's response envelope.
 */
export class KieProvider implements ImageGenerationProviderAdapter {
  readonly id = KIE_PROVIDER_ID;

  constructor(
    private readonly config = {
      apiKey: env.KIE_API,
      baseUrl: env.KIE_BASE_URL,
      timeoutMs: env.KIE_REQUEST_TIMEOUT_MS,
    },
  ) {}

  async createPrediction(
    input: ProviderImageGenerationInput,
  ): Promise<ProviderPrediction> {
    const response = await this.request<KieCreateTaskData>(
      "/api/v1/jobs/createTask",
      {
        method: "POST",
        body: JSON.stringify({
          model: input.model,
          input: this.toKieInput(input),
        }),
      },
    );

    const taskId = response.data?.taskId;
    if (!taskId) {
      throw new ImageGenerationProviderError("Kie did not return a task id", {
        provider: KIE_PROVIDER_ID,
        providerRaw: response,
      });
    }

    return {
      provider: KIE_PROVIDER_ID,
      providerTaskId: taskId,
      model: input.model,
      // A freshly created task has no state yet; the worker polls from here.
      status: "queued",
      outputs: [],
      providerRaw: response,
    };
  }

  async getPrediction(providerTaskId: string): Promise<ProviderPrediction> {
    const response = await this.request<KieRecordInfoData>(
      `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(providerTaskId)}`,
      { method: "GET" },
    );

    const data = response.data ?? {};
    const status = mapState(data.state);
    const failMsg = data.failMsg?.trim();

    return {
      provider: KIE_PROVIDER_ID,
      providerTaskId: data.taskId ?? providerTaskId,
      model: data.model ?? "",
      status,
      outputs: status === "succeeded" ? parseResultUrls(data.resultJson) : [],
      error:
        status === "failed"
          ? // failCode alone is not human-readable, so prefer the message.
            (failMsg ??
            (data.failCode ? `Kie error ${data.failCode}` : undefined))
          : undefined,
      providerRaw: response,
      createdAt: data.createTime
        ? new Date(data.createTime).toISOString()
        : undefined,
      timings:
        typeof data.costTime === "number"
          ? { costTimeMs: data.costTime }
          : undefined,
    };
  }

  /**
   * Kie prices per model in its own credits and exposes no pricing endpoint, so
   * cost is left unknown rather than guessed. `creditsConsumed` on a finished
   * task is the accurate figure; the framework treats undefined as "no estimate".
   */
  async estimateCost(
    _input: ImageGenerationEstimateInput,
  ): Promise<number | undefined> {
    return undefined;
  }

  /** Kie has no model-listing endpoint; models are chosen by id from its docs. */
  async listModels(): Promise<ProviderModel[]> {
    return [];
  }

  getCapabilities(): ProviderCapabilities {
    return {
      provider: KIE_PROVIDER_ID,
      operations: ["text-to-image", "image-to-image", "edit-image"],
      outputFormats: ["png", "jpeg", "webp"],
      qualities: ["low", "medium", "high"],
      resolutions: ["1k", "2k", "4k"],
      supportsProviderOptions: true,
      supportsPricing: false,
      supportsModelListing: false,
    };
  }

  /**
   * Translates the framework's provider-neutral input into Kie's `input` object.
   * Unknown extras ride along through `providerOptions` so model-specific fields
   * do not need an adapter change.
   */
  private toKieInput(
    input: ProviderImageGenerationInput | ImageGenerationEstimateInput,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      ...input.providerOptions,
      prompt: input.prompt,
    };

    if (input.aspectRatio) payload.aspect_ratio = input.aspectRatio;
    // Kie expects uppercase resolution tokens (1K/2K/4K).
    if (input.resolution) payload.resolution = input.resolution.toUpperCase();
    if (input.imageUrls?.length) payload.input_urls = input.imageUrls;

    return payload;
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<KieEnvelope<T>> {
    if (!this.config.apiKey) {
      throw new ImageGenerationProviderError("KIE_API is not configured", {
        provider: KIE_PROVIDER_ID,
      });
    }

    const url = path.startsWith("http")
      ? path
      : `${this.config.baseUrl.replace(/\/$/, "")}${path}`;

    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(url, {
          ...init,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
            ...init.headers,
          },
          signal: AbortSignal.timeout(this.config.timeoutMs),
        });

        const text = await response.text();
        const parsed = safeJsonParse(text);

        if (!response.ok) {
          const retryable = response.status >= 500 || response.status === 429;
          const error = new ImageGenerationProviderError(
            `Kie request failed: ${response.status} ${response.statusText}`,
            {
              provider: KIE_PROVIDER_ID,
              httpStatus: response.status,
              retryable,
              providerRaw: parsed ?? text.slice(0, 500),
            },
          );
          if (!retryable || attempt === MAX_ATTEMPTS) throw error;
          lastError = error;
          await backoff(attempt);
          continue;
        }

        const envelope = (parsed ?? {}) as KieEnvelope<T>;

        // A 200 can still carry a non-200 envelope code.
        if (typeof envelope.code === "number" && envelope.code !== 200) {
          throw new ImageGenerationProviderError(
            envelope.msg ?? `Kie returned code ${envelope.code}`,
            {
              provider: KIE_PROVIDER_ID,
              code: envelope.code,
              providerRaw: envelope,
            },
          );
        }

        return envelope;
      } catch (error) {
        if (error instanceof ImageGenerationProviderError) throw error;
        lastError = error;
        if (attempt === MAX_ATTEMPTS) break;
        await backoff(attempt);
      }
    }

    logger.warn({ err: lastError, path }, "Kie request failed after retries");
    throw new ImageGenerationProviderError("Kie request failed", {
      provider: KIE_PROVIDER_ID,
      retryable: true,
      providerRaw: lastError instanceof Error ? lastError.message : undefined,
    });
  }
}

/** Kie task states map onto the framework's status vocabulary. */
export function mapState(state: string | undefined): ImageGenerationStatus {
  switch (state) {
    case "success":
      return "succeeded";
    case "fail":
      return "failed";
    case "generating":
      return "running";
    case "waiting":
    case "queuing":
      return "queued";
    default:
      return "queued";
  }
}

/**
 * `resultJson` is a JSON *string* nested inside the response, so it needs a
 * second parse. A malformed value yields no outputs rather than throwing, which
 * the caller already treats as a failed generation.
 */
export function parseResultUrls(resultJson: string | undefined): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as { resultUrls?: unknown };
    if (!Array.isArray(parsed.resultUrls)) return [];
    return parsed.resultUrls.filter(
      (url): url is string => typeof url === "string" && url.length > 0,
    );
  } catch {
    return [];
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function backoff(attempt: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, attempt * 500));
}
