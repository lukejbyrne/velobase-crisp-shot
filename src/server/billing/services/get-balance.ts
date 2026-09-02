import { TRPCError } from '@trpc/server'
import { getVelobase } from '../velobase'
import { isVelobaseError } from '@velobaseai/billing'
import type { GetBalanceParams, GetBalanceOutput, AccountSummary } from '../types'

export async function getBalance(params: GetBalanceParams): Promise<GetBalanceOutput> {
  if (!params.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'userId is required' })

  const vb = getVelobase()

  try {
    const customer = await vb.customers.get(params.userId)

    const walletEntries = Object.entries(customer.wallets)
      .filter(([wallet]) => !params.wallet || wallet === params.wallet)

    const summaries: AccountSummary[] = walletEntries.flatMap(([wallet, balance]) =>
      balance.sources
        .filter((source) => source.available > 0)
        .map((source) => ({
          wallet,
          source: source.source,
          total: source.total,
          used: source.used,
          frozen: source.frozen,
          available: source.available,
          startsAt: source.startsAt ? new Date(source.startsAt) : null,
          expiresAt: source.expiresAt ? new Date(source.expiresAt) : null,
        })),
    )

    const totals = walletEntries.reduce(
      (acc, [, balance]) => ({
        total: acc.total + balance.total,
        used: acc.used + balance.used,
        frozen: acc.frozen + balance.frozen,
        available: acc.available + balance.available,
      }),
      { total: 0, used: 0, frozen: 0, available: 0 },
    )

    return {
      totalSummary: totals,
      accounts: summaries,
    }
  } catch (err) {
    if (isVelobaseError(err) && err.isType('not_found')) {
      return {
        totalSummary: { total: 0, used: 0, frozen: 0, available: 0 },
        accounts: [],
      }
    }
    throw err
  }
}
