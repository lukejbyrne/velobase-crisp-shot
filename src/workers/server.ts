import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import fastify, { type FastifyInstance } from "fastify";
import type { Queue } from "bullmq";

/**
 * Creates the Fastify HTTP server for the Worker process.
 *
 * @param queues - Queue instances to expose via Bull Board. When omitted the
 *   board is created with an empty list (useful for testing).
 */
export async function createServer(
  queues: Queue[] = [],
): Promise<FastifyInstance> {
  const server = fastify();

  // Bull Board Setup
  const serverAdapter = new FastifyAdapter();
  serverAdapter.setBasePath("/_worker/queues");

  createBullBoard({
    queues: queues.map((q) => new BullMQAdapter(q)),
    serverAdapter,
  });

  await server.register(serverAdapter.registerPlugin(), {
    prefix: "/_worker/queues",
  });

  // Health & Readiness Checks
  const health = async () => {
    return { status: "ok", timestamp: new Date().toISOString() };
  };

  server.get("/health", health);
  server.get("/healthz", health);

  server.get("/ready", async () => {
    return { status: "ready", timestamp: new Date().toISOString() };
  });

  return server;
}
