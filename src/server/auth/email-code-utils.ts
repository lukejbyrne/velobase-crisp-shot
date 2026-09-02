import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const EMAIL_CODE_TTL_SECONDS = 5 * 60;
export const EMAIL_CODE_DIGITS = 6;
export const EMAIL_CODE_MAX_ATTEMPTS = 5;

export function normalizeEmailCodeInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, EMAIL_CODE_DIGITS);
}

export function generateEmailLoginCode(): string {
  const max = 10 ** EMAIL_CODE_DIGITS;
  return randomInt(0, max).toString().padStart(EMAIL_CODE_DIGITS, "0");
}

export function hashEmailLoginCode(params: {
  email: string;
  code: string;
  secret: string;
}): string {
  return createHmac("sha256", params.secret)
    .update(params.email.toLowerCase().trim(), "utf8")
    .update(":", "utf8")
    .update(params.code, "utf8")
    .digest("hex");
}

export function isEqualEmailCodeHash(
  actual: string,
  expected: string,
): boolean {
  const actualBuffer = Buffer.from(actual, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function formatEmailLoginCode(code: string): string {
  return code.replace(/^(\d{3})(\d{3})$/, "$1 $2");
}
