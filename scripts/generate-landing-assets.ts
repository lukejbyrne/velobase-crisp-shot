/**
 * Generates the landing page's headshot imagery through Kie.ai.
 *
 * The landing page ships with SVG illustrations so it renders before any
 * provider is configured. This script replaces them with real generated
 * headshots in every style, produced from one source portrait — the same
 * pipeline a customer goes through, which is the honest way to show results.
 *
 * Usage:
 *   KIE_API=... tsx scripts/generate-landing-assets.ts <source-image-url>
 *
 * The source must be a publicly fetchable URL: Kie downloads it server-side.
 * Outputs land in public/landing/<style-key>.png.
 */
/* eslint-disable no-console */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  HEADSHOT_STYLES,
  buildHeadshotPrompt,
  HEADSHOT_NEGATIVE_PROMPT,
} from "../src/modules/headshots/styles";

const API_KEY = process.env.KIE_API;
const BASE_URL = process.env.KIE_BASE_URL ?? "https://api.kie.ai";
const MODEL = process.env.HEADSHOT_IMAGE_MODEL ?? "gpt-image-2-image-to-image";
const OUT_DIR = join(process.cwd(), "public", "landing");

const sourceUrl = process.argv[2];

if (!API_KEY) {
  console.error("KIE_API is not set.");
  process.exit(1);
}
if (!sourceUrl?.startsWith("http")) {
  console.error(
    "Pass a publicly reachable source image URL:\n" +
      "  tsx scripts/generate-landing-assets.ts https://example.com/portrait.jpg",
  );
  process.exit(1);
}

type Envelope<T> = { code?: number; msg?: string; data?: T };

async function kie<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const body = (await response.json()) as Envelope<T>;
  if (!response.ok || (body.code && body.code !== 200)) {
    throw new Error(
      `Kie ${path} failed: ${response.status} ${body.msg ?? ""}`.trim(),
    );
  }
  if (!body.data) throw new Error(`Kie ${path} returned no data`);
  return body.data;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generate(styleKey: string, position: number): Promise<string> {
  const { taskId } = await kie<{ taskId: string }>("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt: `${buildHeadshotPrompt(styleKey, position)} Avoid: ${HEADSHOT_NEGATIVE_PROMPT}`,
        input_urls: [sourceUrl],
        aspect_ratio: "1:1",
        // 1:1 cannot reach 4K on Kie; 2K is the ceiling for a square crop.
        resolution: "2K",
      },
    }),
  });

  // Poll until the task settles rather than relying on a callback URL, which
  // would need a public endpoint for a one-off script.
  for (let attempt = 0; attempt < 90; attempt += 1) {
    await wait(4000);
    const info = await kie<{
      state: string;
      resultJson?: string;
      failMsg?: string;
    }>(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);

    if (info.state === "success") {
      const parsed = JSON.parse(info.resultJson ?? "{}") as {
        resultUrls?: string[];
      };
      const url = parsed.resultUrls?.[0];
      if (!url) throw new Error(`${styleKey}: succeeded with no result URL`);
      return url;
    }
    if (info.state === "fail") {
      throw new Error(`${styleKey}: ${info.failMsg ?? "generation failed"}`);
    }
  }
  throw new Error(`${styleKey}: timed out`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(
    `Generating ${HEADSHOT_STYLES.length} styles from ${sourceUrl}\n`,
  );

  // All styles run concurrently: they are independent tasks and Kie queues
  // them server-side anyway.
  const results = await Promise.allSettled(
    HEADSHOT_STYLES.map(async (style, index) => {
      const url = await generate(style.key, index);
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      const file = join(OUT_DIR, `${style.key}.png`);
      await writeFile(file, bytes);
      console.log(
        `  ok   ${style.key.padEnd(18)} ${Math.round(bytes.length / 1024)} KB`,
      );
      return style.key;
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  for (const f of failed) {
    console.error(`  FAIL ${(f as PromiseRejectedResult).reason}`);
  }
  console.log(
    `\n${results.length - failed.length}/${results.length} generated into public/landing/`,
  );
  if (failed.length) process.exitCode = 1;
}

void main();
