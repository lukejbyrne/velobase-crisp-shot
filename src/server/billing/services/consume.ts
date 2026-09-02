import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import { normalizeBillingDetail } from './sdk-details'
import type { ConsumeParams, ConsumeOutput } from '../types'

export async function consume(params: ConsumeParams): Promise<ConsumeOutput> {
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })

  const vb = getVelobase()

  const result = await vb.billing.consume({
    transactionId: params.businessId,
    actualAmount: params.actualAmount,
  })

  return {
    totalAmount: result.consumedAmount,
    returnedAmount: (result.returnedAmount ?? 0) > 0 ? result.returnedAmount : undefined,
    overageAmount: (result.overageAmount ?? 0) > 0 ? result.overageAmount : undefined,
    consumeDetails: result.consumeDetails.map((d) => ({ freezeId: params.businessId, ...normalizeBillingDetail(d) })),
    consumedAt: result.consumedAt,
    isIdempotentReplay: result.isIdempotentReplay,
  }
}
