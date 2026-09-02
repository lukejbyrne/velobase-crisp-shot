import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import { normalizeBillingDetail } from './sdk-details'
import type { FreezeParams, FreezeOutput } from '../types'

export async function freeze(params: FreezeParams): Promise<FreezeOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })
  if (params.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be greater than 0' })

  const vb = getVelobase()

  const result = await vb.billing.freeze({
    customerId: params.userId,
    amount: params.amount,
    transactionId: params.businessId,
    wallet: params.wallet,
    businessType: params.businessType,
    description: params.description ?? undefined,
    unfreezeAfterSeconds: params.unfreezeAfterSeconds,
    consumeAfterSeconds: params.consumeAfterSeconds,
  })

  return {
    totalAmount: result.frozenAmount,
    freezeDetails: result.freezeDetails.map((d) => ({ freezeId: params.businessId, ...normalizeBillingDetail(d) })),
    unfreezeAfter: result.unfreezeAfter,
    consumeAfter: result.consumeAfter,
    isIdempotentReplay: result.isIdempotentReplay,
  }
}
