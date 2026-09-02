import assert from "node:assert/strict";
import test, { mock } from "node:test";

type MockModule = (
  specifier: string,
  options: { namedExports: Record<string, unknown> },
) => void;

const mockModule = (mock as unknown as { module: MockModule }).module.bind(
  mock,
);

let blockedUser: { isBlocked: boolean; blockedReason?: string } | null = null;
let disposable = false;

mockModule(new URL("../../../env.js", import.meta.url).href, {
  namedExports: { env: { NODE_ENV: "test", TURNSTILE_SECRET_KEY: undefined } },
});

mockModule(new URL("../../db.ts", import.meta.url).href, {
  namedExports: {
    db: { user: { findUnique: async () => blockedUser } },
  },
});

mockModule(new URL("../../auth/disposable-domains.ts", import.meta.url).href, {
  namedExports: {
    isDisposableEmail: () => disposable,
    getEmailDomain: (e: string) => e.split("@")[1],
  },
});

mockModule(new URL("../../auth/turnstile.ts", import.meta.url).href, {
  namedExports: { verifyTurnstileToken: async () => ({ success: true }) },
});

mockModule("next/headers", {
  namedExports: { cookies: async () => ({ get: () => undefined }) },
});

const { guardEmail } = await import("./email-guard");

function reset() {
  blockedUser = null;
  disposable = false;
}

void test("ordinary Gmail addresses with dots are allowed", async () => {
  reset();
  // Previously rejected: more than one dot was treated as a "dot trick".
  await guardEmail("luke.j.byrne@gmail.com", "1.2.3.4");
  await guardEmail("first.middle.last@gmail.com", "1.2.3.4");
});

void test("Gmail plus-aliases are allowed", async () => {
  reset();
  // Safe because every variant normalises to one unique canonicalEmail.
  await guardEmail("luke+crispshot@gmail.com", "1.2.3.4");
});

void test("googlemail variants are allowed too", async () => {
  reset();
  await guardEmail("luke.j.byrne@googlemail.com", "1.2.3.4");
});

void test("non-Gmail addresses are unaffected", async () => {
  reset();
  await guardEmail("hello@lukejbyrne.com", "1.2.3.4");
});

void test("disposable domains are still blocked", async () => {
  reset();
  disposable = true;
  await assert.rejects(
    guardEmail("throwaway@mailinator.com", "1.2.3.4"),
    /DISPOSABLE_EMAIL/,
  );
});

void test("blocked accounts are still rejected", async () => {
  reset();
  blockedUser = { isBlocked: true };
  await assert.rejects(
    guardEmail("someone@gmail.com", "1.2.3.4"),
    /BLOCKED_USER/,
  );
});

void test("a deleted account reports itself as deleted", async () => {
  reset();
  blockedUser = { isBlocked: true, blockedReason: "USER_REQUESTED" };
  await assert.rejects(
    guardEmail("someone@gmail.com", "1.2.3.4"),
    /ACCOUNT_DELETED/,
  );
});

void test("absurdly long local parts are still rejected", async () => {
  reset();
  await assert.rejects(
    guardEmail("a".repeat(65) + "@gmail.com", "1.2.3.4"),
    /SUSPICIOUS_EMAIL/,
  );
});
