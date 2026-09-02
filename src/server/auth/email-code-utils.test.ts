import assert from "node:assert/strict";
import test from "node:test";
import {
  formatEmailLoginCode,
  generateEmailLoginCode,
  hashEmailLoginCode,
  isEqualEmailCodeHash,
  normalizeEmailCodeInput,
} from "./email-code-utils";

void test("generateEmailLoginCode returns six digits", () => {
  for (let i = 0; i < 25; i += 1) {
    assert.match(generateEmailLoginCode(), /^\d{6}$/);
  }
});

void test("normalizeEmailCodeInput keeps only six digits", () => {
  assert.equal(normalizeEmailCodeInput(" 12a 34-567 "), "123456");
});

void test("hashEmailLoginCode is deterministic and scoped by email", () => {
  const secret = "test-secret";
  const first = hashEmailLoginCode({
    email: "User@example.com",
    code: "123456",
    secret,
  });
  const second = hashEmailLoginCode({
    email: "user@example.com",
    code: "123456",
    secret,
  });
  const otherEmail = hashEmailLoginCode({
    email: "other@example.com",
    code: "123456",
    secret,
  });

  assert.equal(first, second);
  assert.notEqual(first, otherEmail);
  assert.match(first, /^[a-f0-9]{64}$/);
});

void test("isEqualEmailCodeHash uses constant-time compatible hash comparison", () => {
  const hash = hashEmailLoginCode({
    email: "user@example.com",
    code: "123456",
    secret: "test-secret",
  });

  assert.equal(isEqualEmailCodeHash(hash, hash), true);
  const altered = `${hash.slice(0, -1)}${hash.endsWith("0") ? "1" : "0"}`;
  assert.equal(isEqualEmailCodeHash(hash, altered), false);
});

void test("formatEmailLoginCode groups code for display", () => {
  assert.equal(formatEmailLoginCode("123456"), "123 456");
});
