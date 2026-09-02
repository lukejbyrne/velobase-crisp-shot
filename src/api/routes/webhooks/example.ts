/**
 * Example Webhook Route (Hono)
 *
 * Demonstrates the recommended pattern for writing webhook handlers in the
 * standalone API service. Replace or remove this file once a real webhook is
 * implemented.
 *
 * Key patterns shown:
 *  1. Raw-body access for signature verification
 *  2. Idempotency via a unique event ID
 *  3. Always return 200 to the caller (even on processing errors) so the
 *     provider does not keep retrying.
 */
import { Hono } from "hono";
import { createLogger } from "@/lib/logger";

const log = createLogger("webhook:example");

export const exampleWebhookRoutes = new Hono();

exampleWebhookRoutes.post("/example", async (c) => {
  const rawBody = await c.req.text();

  // 1. Signature verification (placeholder)
  const signature = c.req.header("x-webhook-signature") ?? "";
  if (!verifySignature(rawBody, signature)) {
    log.warn("Invalid webhook signature");
    return c.json({ received: false, error: "invalid signature" }, 401);
  }

  // 2. Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    log.warn("Malformed webhook payload");
    return c.json({ received: false, error: "invalid json" }, 400);
  }

  // 3. Idempotency check
  const eventId = payload.event_id as string | undefined;
  if (eventId && isAlreadyProcessed(eventId)) {
    log.info({ eventId }, "Duplicate webhook event, skipping");
    return c.json({ received: true, duplicate: true });
  }

  // 4. Process the event
  try {
    log.info({ eventId, type: payload.type }, "Processing webhook event");
    // ... business logic here ...
  } catch (err) {
    log.error({ error: err, eventId }, "Webhook processing failed");
    // Still return 200 to prevent provider retries
  }

  return c.json({ received: true });
});

// --- Helpers (replace with real implementations) ----------------------------

function verifySignature(_body: string, _signature: string): boolean {
  // TODO: implement HMAC verification for your webhook provider
  return true;
}

const processedEvents = new Set<string>();

function isAlreadyProcessed(eventId: string): boolean {
  if (processedEvents.has(eventId)) return true;
  processedEvents.add(eventId);
  // Prevent unbounded growth in dev — production should use Redis or DB
  if (processedEvents.size > 10000) processedEvents.clear();
  return false;
}
