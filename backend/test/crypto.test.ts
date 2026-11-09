import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSensitive, encryptSensitive } from "../src/lib/crypto";

describe("crypto sensitif (AES-256-GCM)", () => {
  const key = randomBytes(32);

  it("encrypt -> decrypt kembali ke plaintext", () => {
    const cipher = encryptSensitive("3201234567890001", key);
    expect(cipher).not.toContain("3201234567890001");
    expect(decryptSensitive(cipher, key)).toBe("3201234567890001");
  });

  it("ciphertext berbeda untuk plaintext sama (IV acak)", () => {
    expect(encryptSensitive("sama", key)).not.toBe(encryptSensitive("sama", key));
  });

  it("gagal decrypt dengan kunci yang salah", () => {
    const cipher = encryptSensitive("rahasia", key);
    expect(() => decryptSensitive(cipher, randomBytes(32))).toThrow();
  });
});
