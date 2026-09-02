import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AUTH_EVENTS } from "@/analytics/events/auth";
import { getServerPostHog } from "@/analytics/server";
import { APP_NAME } from "@/config/brand";
import { createLogger } from "@/lib/logger";
import { checkAuthRateLimit } from "@/server/ratelimit";
import { ensureSignupEnabledOrExistingUser } from "@/server/auth/signup-policy";
import { createEmailLoginCode } from "@/server/auth/email-code";
import { EMAIL_CODE_TTL_SECONDS } from "@/server/auth/email-code-utils";
import { getClientIpFromHeaders } from "@/server/features/cdn-adapters";
import {
  sendEmail,
  EmailCodeTemplate,
  renderEmailCodeHtml,
} from "@/server/email";

const logger = createLogger("auth:email-code-request");

const requestSchema = z.object({
  email: z.string().email(),
});

function errorResponse(errorCode: string, status: number) {
  return NextResponse.json({ ok: false, errorCode }, { status });
}

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return errorResponse("invalid_email", 400);
  }

  const email = parsed.data.email.toLowerCase().trim();
  const ip = getClientIpFromHeaders(request.headers);

  const rateLimitResult = await checkAuthRateLimit(email, ip);
  if (!rateLimitResult.allowed) {
    logger.warn(
      { email, ip, reason: rateLimitResult.reason },
      "Auth rate limit exceeded",
    );
    return NextResponse.json(
      {
        ok: false,
        errorCode: "rate_limited",
        retryAfter: rateLimitResult.retryAfter,
      },
      { status: 429 },
    );
  }

  try {
    await ensureSignupEnabledOrExistingUser(email);

    const { guardEmail } = await import("@/server/features/anti-abuse");
    await guardEmail(email, ip);

    const { code, expiresAt } = await createEmailLoginCode(email);
    const expiresInMinutes = Math.round(EMAIL_CODE_TTL_SECONDS / 60);

    await sendEmail({
      to: email,
      subject: `Your ${APP_NAME} sign-in code`,
      react: EmailCodeTemplate({ code, expiresInMinutes }),
      html: renderEmailCodeHtml(code, expiresInMinutes),
      text: `Sign in to ${APP_NAME}\n\nYour verification code is ${code}.\n\nThis code expires in ${expiresInMinutes} minutes.`,
    });

    const posthog = getServerPostHog();
    if (posthog) {
      posthog.capture({
        distinctId: email,
        event: AUTH_EVENTS.EMAIL_SENT,
        properties: { success: true, method: "email_code" },
      });
      void posthog.shutdown();
    }

    return NextResponse.json({ ok: true, expiresAt });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(
      { email, errorMessage: message },
      "Failed to request email login code",
    );

    const posthog = getServerPostHog();
    if (posthog) {
      posthog.capture({
        distinctId: email,
        event: AUTH_EVENTS.EMAIL_SENT,
        properties: {
          success: false,
          method: "email_code",
          error_reason: message,
        },
      });
      void posthog.shutdown();
    }

    if (message.startsWith("SIGNUP_DISABLED"))
      return errorResponse("signup_disabled", 403);
    if (message.startsWith("DISPOSABLE_EMAIL"))
      return errorResponse("disposable_email", 400);
    if (
      message.startsWith("GMAIL_ALIAS_DETECTED") ||
      message.startsWith("SUSPICIOUS_EMAIL")
    ) {
      return errorResponse("invalid_email", 400);
    }
    if (message.startsWith("TURNSTILE"))
      return errorResponse("turnstile_required", 400);
    if (
      message.startsWith("BLOCKED_USER") ||
      message.startsWith("ACCOUNT_DELETED")
    ) {
      return errorResponse("blocked", 403);
    }

    return errorResponse("send_failed", 500);
  }
}
