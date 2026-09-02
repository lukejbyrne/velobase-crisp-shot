/**
 * 邮箱验证守卫（Email Guard）
 *
 * 在发送魔法链接之前，对邮箱地址进行多层风控校验。
 * 任何一层不通过则抛出错误，阻止验证邮件发送。
 *
 * 检测层级（按执行顺序）：
 * 1. 临时邮箱域名拦截 — 72000+ 已知临时邮箱域名
 * 2. Gmail 变体不再拦截：canonicalEmail 唯一约束已保证同一邮箱只对应一个账号
 * 3. 异常长度检测 — 超长邮箱地址
 * 4. 已封禁用户检测 — 复查数据库
 * 5. Cloudflare Turnstile 人机验证 — 防批量脚本
 */

import { db } from "@/server/db";
import { env } from "@/env";
import { createLogger } from "@/lib/logger";
import {
  isDisposableEmail,
  getEmailDomain,
} from "@/server/auth/disposable-domains";
import { verifyTurnstileToken } from "@/server/auth/turnstile";
import { cookies } from "next/headers";

const logger = createLogger("features:anti-abuse:email");

// ─── 策略常量（AI：修改这里来调整邮箱风控灵敏度） ────────────────────
/** 邮箱 local part 最大长度 */
const EMAIL_MAX_LOCAL_LENGTH = 64;
/** 是否启用 Turnstile 验证（依赖 env.TURNSTILE_SECRET_KEY 配置） */
const TURNSTILE_ENABLED = true;
// ────────────────────────────────────────────────────────────────────

/**
 * 对邮箱地址执行全部风控校验。
 *
 * 任何一层不通过则抛出 Error，message 格式为 `CODE:人类可读描述`。
 * 调用方可根据 `:` 前的 CODE 做分类处理。
 *
 * ```ts
 * import { guardEmail } from '@/server/features/anti-abuse'
 * await guardEmail(email, clientIp)
 * ```
 */
export async function guardEmail(
  rawEmail: string,
  remoteIp: string | null,
): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  if (!email.includes("@")) return;

  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return;

  // ── 层 1：临时邮箱域名 ──
  if (isDisposableEmail(email)) {
    const d = getEmailDomain(email);
    logger.warn(
      { email: email.substring(0, 3) + "***", domain: d },
      "Disposable email blocked",
    );
    throw new Error(
      "DISPOSABLE_EMAIL:This email domain is not supported. Please use a permanent email address.",
    );
  }

  // ── 层 2：Gmail 别名 ──
  // Gmail dot and +alias variants are NOT blocked. They all normalise to one
  // `canonicalEmail`, which is unique on the user table, so every variant of a
  // mailbox resolves to the same account — the multi-account abuse this once
  // guarded against is closed structurally. Blocking them only turned ordinary
  // addresses like first.middle.last@gmail.com away at signup.

  // ── 层 3：异常长度 ──
  if (localPart.length > EMAIL_MAX_LOCAL_LENGTH) {
    logger.warn({ email, length: localPart.length }, "Email too long blocked");
    throw new Error(
      "SUSPICIOUS_EMAIL:Email address is unusually long. Please use a standard email.",
    );
  }

  // ── 层 4：已封禁用户 ──
  const existingUser = await db.user.findUnique({
    where: { email },
    select: { id: true, isBlocked: true, blockedReason: true },
  });

  if (existingUser?.isBlocked) {
    if (existingUser.blockedReason === "USER_REQUESTED") {
      throw new Error("ACCOUNT_DELETED:Your account has been deleted.");
    }
    throw new Error("BLOCKED_USER:Your account has been suspended.");
  }

  // ── 层 5：Turnstile 人机验证 ──
  if (TURNSTILE_ENABLED && env.TURNSTILE_SECRET_KEY) {
    const cookieStore = await cookies();
    const token = cookieStore.get("cf_turnstile_token")?.value;

    if (!token) {
      throw new Error(
        "TURNSTILE_REQUIRED:Please complete the verification challenge.",
      );
    }

    const verifyResult = await verifyTurnstileToken(token, remoteIp);
    if (!verifyResult.success) {
      throw new Error(
        "TURNSTILE_FAILED:Verification failed, please try again.",
      );
    }
  }
}
