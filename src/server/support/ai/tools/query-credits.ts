/**
 * 查询 Credits 余额工具（via Velobase）
 */

import { getVelobase } from "@/server/billing/velobase";
import { isVelobaseError } from "@velobaseai/billing";

export interface CreditsInfo {
  available: number;
  used: number;
  frozen: number;
  total: number;
  accounts: Array<{
    type: string;
    available: number;
    expiresAt?: Date;
  }>;
}

export async function queryCredits(userId: string): Promise<CreditsInfo> {
  const vb = getVelobase();

  try {
    const customer = await vb.customers.get(userId);
    const totals = Object.values(customer.wallets).reduce(
      (acc, wallet) => ({
        available: acc.available + wallet.available,
        used: acc.used + wallet.used,
        frozen: acc.frozen + wallet.frozen,
        total: acc.total + wallet.total,
      }),
      { available: 0, used: 0, frozen: 0, total: 0 },
    );

    return {
      ...totals,
      accounts: Object.values(customer.wallets).flatMap((wallet) =>
        wallet.sources.map((source) => ({
          type: source.source,
          available: source.available,
          expiresAt: source.expiresAt ? new Date(source.expiresAt) : undefined,
        })),
      ),
    };
  } catch (err) {
    if (isVelobaseError(err) && err.isType("not_found")) {
      return { available: 0, used: 0, frozen: 0, total: 0, accounts: [] };
    }
    throw err;
  }
}
