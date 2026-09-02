/**
 * Cloudflare Turnstile Integration Test
 *
 * 验证 Turnstile siteverify API 在当前环境下可用。
 * 需要配置 TURNSTILE_SECRET_KEY 环境变量，未配置则测试失败。
 *
 * Usage: npx tsx scripts/tests/integrations/security/test-turnstile.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

let passed = 0;
let failed = 0;

async function callSiteverify(
  secret: string,
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; "error-codes"?: string[]; httpStatus: number; [key: string]: unknown }> {
  const formData = new URLSearchParams();
  formData.append("secret", secret);
  formData.append("response", token);
  if (remoteIp) formData.append("remoteip", remoteIp);

  const res = await fetch(SITEVERIFY_URL, { method: "POST", body: formData });
  const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
  return { ...data, httpStatus: res.status };
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function run() {
  console.log("=== Cloudflare Turnstile Integration Test ===\n");

  // ── 前置检查：环境变量必须配置 ──
  if (!TURNSTILE_SECRET_KEY) {
    console.error("❌ TURNSTILE_SECRET_KEY not configured in .env");
    console.error("   Turnstile is not usable in this environment. Test failed.\n");
    console.error("   To configure: Cloudflare Dashboard → Turnstile → Add Site → copy Secret Key");
    process.exit(1);
  }

  console.log(`TURNSTILE_SECRET_KEY: ${TURNSTILE_SECRET_KEY.substring(0, 6)}...${TURNSTILE_SECRET_KEY.slice(-4)}\n`);

  // ── Test 1: Real key rejects invalid token ──
  console.log("Test 1: Real key rejects invalid token");
  try {
    const result = await callSiteverify(TURNSTILE_SECRET_KEY, "dummy-invalid-token");
    assert(result.success === false, "Returns success: false for invalid token");
    assert(result.httpStatus === 200, `HTTP status is 200 (got ${result.httpStatus})`);
  } catch (e) {
    assert(false, "API call should not throw", (e as Error).message);
  }

  // ── Test 2: Real key rejects empty token ──
  console.log("\nTest 2: Real key rejects empty token");
  try {
    const result = await callSiteverify(TURNSTILE_SECRET_KEY, "");
    assert(result.success === false, "Returns success: false for empty token");
  } catch (e) {
    assert(false, "API call should not throw", (e as Error).message);
  }

  // ── Test 3: Real key with remoteip parameter ──
  console.log("\nTest 3: Real key accepts remoteip parameter");
  try {
    const result = await callSiteverify(TURNSTILE_SECRET_KEY, "dummy-token", "203.0.113.1");
    assert(result.httpStatus === 200, "API returns 200 with remoteip");
    assert(result.success === false, "Still rejects invalid token");
  } catch (e) {
    assert(false, "API call should not throw", (e as Error).message);
  }

  // ── Test 4: Invalid secret key is rejected ──
  console.log("\nTest 4: Invalid secret key is rejected");
  try {
    const result = await callSiteverify("invalid-secret-key", "XXXX.DUMMY.TOKEN.XXXX");
    assert(result.success === false, `Returns success: false (HTTP ${result.httpStatus})`);
  } catch (e) {
    assert(false, "API call should not throw", (e as Error).message);
  }

  // ── Test 5: Error codes are present on failure ──
  console.log("\nTest 5: Failure response includes error-codes");
  try {
    const result = await callSiteverify(TURNSTILE_SECRET_KEY, "bad-token");
    assert(result.success === false, "Returns success: false");
    assert(
      Array.isArray(result["error-codes"]) && result["error-codes"].length > 0,
      `Has error-codes: [${(result["error-codes"] ?? []).join(", ")}]`
    );
  } catch (e) {
    assert(false, "API call should not throw", (e as Error).message);
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"=".repeat(40)}`);

  process.exit(failed > 0 ? 1 : 0);
}

void run();
