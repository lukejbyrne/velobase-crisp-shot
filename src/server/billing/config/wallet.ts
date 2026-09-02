/**
 * The wallet every credit operation uses unless a caller names another.
 *
 * The Velobase API defaults differently per endpoint: a deposit with no wallet
 * lands in "credits", while a freeze with no wallet looks in "default". Left
 * implicit, money is granted into one wallet and reserved from another, so
 * every spend fails with "insufficient balance" no matter the balance.
 *
 * Being explicit on both sides is what keeps them agreeing.
 */
export const DEFAULT_WALLET = "credits";
