/**
 * Module worker contribution tests
 *
 * Verifies module mode resolution and the worker startup contribution boundary.
 *
 * Usage: npx tsx scripts/tests/integrations/queue/test-module-workers.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  ModuleStateError,
  parseModuleMode,
  resolveModuleStates,
  type ModuleDefinition,
} from "../../../../src/server/modules/manifest";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.log(`  FAIL ${label}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

const definitions = [
  {
    id: "lark",
    kind: "integration",
    label: "Lark",
    modeEnv: "LARK_MODE",
    config: ["LARK_APP_ID", "LARK_APP_SECRET"],
  },
  {
    id: "stripe",
    kind: "integration",
    label: "Stripe",
    modeEnv: "STRIPE_MODE",
    config: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    id: "nowpayments",
    kind: "integration",
    label: "NowPayments",
    modeEnv: "NOWPAYMENTS_MODE",
    config: ["NOWPAYMENTS_API_KEY", "NOWPAYMENTS_IPN_SECRET"],
  },
  {
    id: "payment-reconciliation",
    kind: "integration",
    label: "Payment Reconciliation",
    modeEnv: "PAYMENT_RECONCILIATION_MODE",
    dependencies: [
      { anyOf: ["stripe", "nowpayments"], name: "payment provider" },
      "lark",
    ],
  },
  {
    id: "google-ads",
    kind: "integration",
    label: "Google Ads",
    modeEnv: "GOOGLE_ADS_MODE",
    config: ["GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN"],
  },
  {
    id: "touch",
    kind: "feature",
    label: "Touch",
    modeEnv: "TOUCH_MODE",
  },
  {
    id: "support-automation",
    kind: "feature",
    label: "Support Automation",
    modeEnv: "SUPPORT_AUTOMATION_MODE",
    config: [
      "SUPPORT_EMAIL_ADDRESS",
      "SUPPORT_EMAIL_PASSWORD",
      "SUPPORT_IMAP_HOST",
      "SUPPORT_SMTP_HOST",
      "OPENROUTER_API_KEY",
    ],
  },
  {
    id: "conversion-alert",
    kind: "feature",
    label: "Conversion Alert",
    modeEnv: "CONVERSION_ALERT_MODE",
    dependencies: ["lark"],
  },
  {
    id: "ai-chat",
    kind: "feature",
    label: "AI Chat",
    modeEnv: "AI_CHAT_MODE",
    config: [
      {
        anyOf: ["ANTHROPIC_API_KEY", "OPENROUTER_API_KEY", "OPENAI_API_KEY"],
        name: "AI provider key",
      },
    ],
  },
] satisfies readonly ModuleDefinition[];

function state(env: Record<string, string | undefined>, id: string) {
  const states = resolveModuleStates(definitions, env);
  const item = states.find((s) => s.id === id);
  if (!item) throw new Error(`Missing state: ${id}`);
  return item;
}

function testModeResolution() {
  console.log("\n== Module mode resolution ==\n");

  assert("default mode is auto", parseModuleMode(undefined) === "auto");
  assert("explicit off parses", parseModuleMode("off") === "off");

  try {
    parseModuleMode("enabled");
    assert("invalid mode throws", false);
  } catch {
    assert("invalid mode throws", true);
  }

  assert("config-free feature auto-enables", state({}, "touch").enabled);
  assert(
    "off mode overrides config-free feature",
    !state({ TOUCH_MODE: "off" }, "touch").enabled,
  );
  assert(
    "missing integration config disables auto mode",
    !state({}, "google-ads").enabled &&
      state({}, "google-ads").reason === "missing_config",
  );
  assert(
    "support automation auto-disables without mailbox and AI config",
    !state({}, "support-automation").enabled &&
      state({}, "support-automation").missingEnv.includes(
        "SUPPORT_EMAIL_ADDRESS",
      ) &&
      state({}, "support-automation").missingEnv.includes(
        "SUPPORT_EMAIL_PASSWORD",
      ) &&
      state({}, "support-automation").missingEnv.includes("OPENROUTER_API_KEY"),
  );
  assert(
    "support automation enables when mailbox and AI config are present",
    state(
      {
        SUPPORT_EMAIL_ADDRESS: "support@example.com",
        SUPPORT_EMAIL_PASSWORD: "password",
        SUPPORT_IMAP_HOST: "imap.example.com",
        SUPPORT_SMTP_HOST: "smtp.example.com",
        OPENROUTER_API_KEY: "sk-or",
      },
      "support-automation",
    ).enabled,
  );

  try {
    resolveModuleStates(definitions, { GOOGLE_ADS_MODE: "on" });
    assert("forced missing config throws", false);
  } catch (error) {
    assert("forced missing config throws", error instanceof ModuleStateError);
  }

  try {
    resolveModuleStates(definitions, { SUPPORT_AUTOMATION_MODE: "on" });
    assert("forced support automation config throws", false);
  } catch (error) {
    assert(
      "forced support automation config throws",
      error instanceof ModuleStateError,
    );
  }
}

function testDependencyResolution() {
  console.log("\n== Module dependencies ==\n");

  const larkEnv = {
    LARK_APP_ID: "app",
    LARK_APP_SECRET: "secret",
  };
  assert(
    "conversion alert enables when Lark is enabled",
    state(larkEnv, "conversion-alert").enabled,
  );
  assert(
    "conversion alert disables when Lark is missing",
    !state({}, "conversion-alert").enabled &&
      state({}, "conversion-alert").missingDependencies.includes("lark"),
  );

  const paymentEnv = {
    ...larkEnv,
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec",
  };
  assert(
    "payment reconciliation enables with payment provider and Lark",
    state(paymentEnv, "payment-reconciliation").enabled,
  );
  assert(
    "payment reconciliation requires Lark delivery",
    !state(
      {
        STRIPE_SECRET_KEY: "sk_test",
        STRIPE_WEBHOOK_SECRET: "whsec",
      },
      "payment-reconciliation",
    ).enabled,
  );
  assert(
    "payment reconciliation requires a payment provider",
    state(larkEnv, "payment-reconciliation").missingDependencies.includes(
      "payment provider",
    ),
  );
}

function testWorkerStartupBoundary() {
  console.log("\n== Worker startup boundary ==\n");

  const startFile = readFileSync(
    join(process.cwd(), "src/workers/start.ts"),
    "utf8",
  );

  assert(
    "worker startup collects module contributions",
    startFile.includes("collectEnabledWorkerContributions"),
  );
  assert(
    "worker startup reconciles disabled schedulers",
    startFile.includes("collectDisabledSchedulerContributions"),
  );
  assert(
    "worker startup does not import concrete feature workers",
    !startFile.includes("./features/") &&
      !startFile.includes("./integrations/"),
  );
}

function testCatalogGuardrails() {
  console.log("\n== Catalog guardrails ==\n");

  const catalogFile = readFileSync(
    join(process.cwd(), "src/server/modules/catalog.ts"),
    "utf8",
  );

  assert(
    "support automation declares mailbox config",
    catalogFile.includes('"SUPPORT_EMAIL_ADDRESS"') &&
      catalogFile.includes('"SUPPORT_EMAIL_PASSWORD"') &&
      catalogFile.includes('"SUPPORT_IMAP_HOST"') &&
      catalogFile.includes('"SUPPORT_SMTP_HOST"'),
  );
  assert(
    "support automation declares support agent key config",
    catalogFile.includes('"OPENROUTER_API_KEY"'),
  );
}

function main() {
  testModeResolution();
  testDependencyResolution();
  testWorkerStartupBoundary();
  testCatalogGuardrails();

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
