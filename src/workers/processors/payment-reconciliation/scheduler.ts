/**
 * Payment Reconciliation Scheduler
 *
 * 每小时整点触发；processor 内部在 LA 00:00 只发天报。
 */
import { paymentReconciliationQueue } from "@/workers/queues/payment-reconciliation.queue";
import { createLogger } from "@/lib/logger";
import { defineRepeatableScheduler } from "@/workers/scheduler";

const logger = createLogger("payment-reconciliation-scheduler");

export const paymentReconciliationScheduler = defineRepeatableScheduler({
  id: "payment.reconciliation",
  queue: paymentReconciliationQueue,
  jobName: "hourly-reconcile",
  data: { type: "hourly-reconcile" as const },
  options: {
    repeat: { pattern: "0 * * * *" },
    jobId: "payment-reconciliation-hourly",
  },
  logger,
  readyMessage:
    "✅ Payment reconciliation scheduler registered: hourly (minute 0)",
});

export async function registerPaymentReconciliationScheduler(): Promise<void> {
  await paymentReconciliationScheduler.register();
}
