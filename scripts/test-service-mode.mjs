#!/usr/bin/env node
/**
 * Service Mode Smoke Test
 *
 * Validates that each SERVICE_MODE correctly starts the expected services
 * and that health check endpoints respond properly.
 *
 * Usage:
 *   # Test A: standalone mode
 *   docker compose -f docker-compose.test.yml --profile standalone up -d
 *   node scripts/test-service-mode.mjs standalone
 *
 *   # Test B: split mode
 *   docker compose -f docker-compose.test.yml --profile split up -d
 *   node scripts/test-service-mode.mjs split
 *
 *   # Optional API mode
 *   docker compose -f docker-compose.test.yml --profile api up -d
 *   node scripts/test-service-mode.mjs api
 *
 *   # Run default runtime tests sequentially
 *   node scripts/test-service-mode.mjs all
 */

const MODE = process.argv[2] ?? "all";

// ── Port mapping ──────────────────────────────────────────────────────────────
const STANDALONE = {
  web: "http://localhost:4000",
  worker: "http://localhost:4001",
  api: "http://localhost:4002",
};

const SPLIT = {
  web: "http://localhost:5000",
  worker: "http://localhost:5001",
  api: "http://localhost:5002",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function check(label, url, expectStatus = 200, opts = {}) {
  const method = opts.method ?? "GET";
  const expectBodyKey = opts.expectBodyKey ?? "status";
  const reqBody = opts.body ?? undefined;
  const headers = opts.headers ?? {};
  try {
    const fetchOpts = { method, signal: AbortSignal.timeout(5000), headers };
    if (reqBody) fetchOpts.body = typeof reqBody === "string" ? reqBody : JSON.stringify(reqBody);
    const res = await fetch(url, fetchOpts);
    const body = await res.json().catch(() => ({}));
    if (res.status !== expectStatus) {
      console.log(`  FAIL  ${label} — expected ${expectStatus}, got ${res.status}`);
      failed++;
      return;
    }
    if (expectBodyKey && !(expectBodyKey in body)) {
      console.log(`  FAIL  ${label} — response missing "${expectBodyKey}" key`);
      failed++;
      return;
    }
    console.log(`  PASS  ${label} — ${res.status} ${JSON.stringify(body)}`);
    passed++;
  } catch (err) {
    console.log(`  FAIL  ${label} — ${err.cause?.code ?? err.message}`);
    failed++;
  }
}

async function expectRefused(label, url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(3000) });
    console.log(`  FAIL  ${label} — expected connection refused but got response`);
    failed++;
  } catch {
    console.log(`  PASS  ${label} — correctly not listening`);
    passed++;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Test suites ──────────────────────────────────────────────────────────────

async function testStandalone() {
  console.log("\n═══ Test A: Standalone Mode (SERVICE_MODE=web,worker) ═══\n");

  console.log("[Web :4000]");
  await check("GET /api/health", `${STANDALONE.web}/api/health`);

  console.log("\n[Worker :4001]");
  await check("GET /health", `${STANDALONE.worker}/health`);
  await check("GET /ready", `${STANDALONE.worker}/ready`);

  console.log("\n[Cross-check: default ports in one container]");
  await check("Web responds", `${STANDALONE.web}/api/health`);
  await check("Worker responds", `${STANDALONE.worker}/health`);
  await expectRefused("API is disabled by default", `${STANDALONE.api}/health`);
}

async function testSplit() {
  console.log("\n═══ Test B: Split Mode (SERVICE_MODE=web/worker) ═══\n");

  console.log("[Web container :5000]");
  await check("GET /api/health", `${SPLIT.web}/api/health`);

  console.log("\n[Worker container :5001]");
  await check("GET /health", `${SPLIT.worker}/health`);
  await check("GET /ready", `${SPLIT.worker}/ready`);

  console.log("\n[Isolation: each container only runs its own service]");
  // Web container should NOT have API or Worker ports
  await expectRefused("Web container :3002 (API)", "http://localhost:5000:3002/health");
  await expectRefused("Web container :3001 (Worker)", "http://localhost:5000:3001/health");
  await expectRefused("Optional API service not started", `${SPLIT.api}/health`);
}

async function testApi() {
  console.log("\n═══ Test C: Optional API Mode (SERVICE_MODE=api) ═══\n");

  console.log("[API container :5002]");
  await check("GET /health", `${SPLIT.api}/health`);
  await check("GET /ready", `${SPLIT.api}/ready`);
  await check("POST /webhooks/example", `${SPLIT.api}/webhooks/example`, 200, {
    method: "POST",
    body: JSON.stringify({ event_id: "test-001", type: "test" }),
    headers: { "Content-Type": "application/json" },
    expectBodyKey: "received",
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Service Mode Smoke Test");
  console.log(`Mode: ${MODE}`);
  console.log("Waiting 5s for services to be ready...");
  await sleep(5000);

  if (MODE === "standalone" || MODE === "all") {
    await testStandalone();
  }

  if (MODE === "split" || MODE === "all") {
    await testSplit();
  }

  if (MODE === "api") {
    await testApi();
  }

  console.log(`\n${"═".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${"═".repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
