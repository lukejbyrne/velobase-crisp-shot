import { db } from "@/server/db";
import { SIGNUP_DISABLED } from "@/config/decommission";
import { normalizeEmail } from "./normalize-email";

export async function ensureSignupEnabledOrExistingUser(
  email: string,
): Promise<void> {
  if (!SIGNUP_DISABLED) return;

  const e = email.toLowerCase().trim();
  const normalized = normalizeEmail(e);
  const existing = await db.user.findFirst({
    where: {
      OR: [{ email: e }, { canonicalEmail: normalized }],
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("SIGNUP_DISABLED:Sign up is temporarily disabled.");
  }
}
