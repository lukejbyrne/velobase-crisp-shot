import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import { normalizeBillingDetail } from './sdk-details'
import type { BillingBusinessType } from '../types'

export type PostConsumeParams = {
  userId: string
  wallet?: string
  amount: number
  businessId: string
  businessType?: BillingBusinessType
  referenceId?: string
  description?: string
}

export type PostConsumeDetail = {
  accountId?: string
  wallet: string
  source: string
  amount: number
}

export type PostConsumeOutput = {
  totalAmount: number
  consumeDetails: PostConsumeDetail[]
  consumedAt: string
}

export async function postConsume(params: PostConsumeParams): Promise<PostConsumeOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })
  if (!params.businessId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'businessId is required' })
  if (!params.amount || params.amount <= 0) throw new TRPCError({ code: 'BAD_REQUEST', message: 'amount must be greater than 0' })

  const vb = getVelobase()

  const result = await vb.billing.deduct({
    customerId: params.userId,
    amount: params.amount,
    transactionId: params.businessId,
    wallet: params.wallet,
    businessType: params.businessType,
    description: params.description ?? undefined,
  })

  return {
    totalAmount: result.deductedAmount,
    consumeDetails: result.deductDetails.map(normalizeBillingDetail),
    consumedAt: result.deductedAt,
  }
}
