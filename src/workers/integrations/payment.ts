import type { WorkerContribution } from "../types";
import { orderCompensationQueue } from "../queues/order-compensation.queue";
import { subscriptionCompensationQueue } from "../queues/subscription-compensation.queue";
import { paymentReconciliationQueue } from "../queues/payment-reconciliation.queue";
import {
  orderCompensationScheduler,
  processOrderCompensationJob,
} from "../processors/order-compensation";
import {
  processSubscriptionCompensationJob,
  subscriptionCompensationScheduler,
} from "../processors/subscription-compensation";
import {
  paymentReconciliationScheduler,
  processPaymentReconciliation,
} from "../processors/payment-reconciliation";

const orderCompensationContribution: WorkerContribution = {
  id: "payment.order-compensation",
  queue: orderCompensationQueue,
  processor: processOrderCompensationJob,
  options: {
    concurrency: 1,
    lockDuration: 300000,
  },
  scheduler: orderCompensationScheduler,
};

export function getStripeWorkerContributions(): WorkerContribution[] {
  return [
    orderCompensationContribution,
    {
      id: "payment.subscription-compensation",
      queue: subscriptionCompensationQueue,
      processor: processSubscriptionCompensationJob,
      options: {
        concurrency: 1,
        lockDuration: 300000,
      },
      scheduler: subscriptionCompensationScheduler,
    },
  ];
}

export function getNowPaymentsWorkerContributions(): WorkerContribution[] {
  return [orderCompensationContribution];
}

export function getPaymentReconciliationWorkerContributions(): WorkerContribution[] {
  return [
    {
      id: "payment.reconciliation",
      queue: paymentReconciliationQueue,
      processor: processPaymentReconciliation,
      options: {
        concurrency: 1,
        lockDuration: 300000,
      },
      scheduler: paymentReconciliationScheduler,
    },
  ];
}
