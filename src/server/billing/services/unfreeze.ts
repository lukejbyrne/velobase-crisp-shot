import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import { normalizeBillingDetail } from './sdk-details'
import type { UnfreezeParams, UnfreezeOutput } from '../types'

export async function unfreeze(params: UnfreezeParams): Promise<UnfreezeOutput> {
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })

  const vb = getVelobase()

  const result = await vb.billing.unfreeze({
    transactionId: params.businessId,
  })

  return {
    totalAmount: result.unfrozenAmount,
    unfreezeDetails: result.unfreezeDetails.map((d) => ({ freezeId: params.businessId, ...normalizeBillingDetail(d) })),
    unfrozenAt: result.unfrozenAt,
    isIdempotentReplay: result.isIdempotentReplay,
  }
}
