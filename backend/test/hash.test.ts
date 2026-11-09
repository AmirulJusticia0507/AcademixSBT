import { describe, expect, it } from "vitest";
import { hashDocument, hashesMatch, normalizeHash, sha256Hex } from "../src/lib/hash";

describe("hash", () => {
  it("menghitung SHA-256 sesuai vektor uji standar", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("hashDocument memberi prefix sha256:", () => {
    const hash = hashDocument(Buffer.from("ijazah"));
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("normalisasi hash mengabaikan prefix dan kapitalisasi", () => {
    expect(normalizeHash("SHA256:ABCDEF")).toBe("abcdef");
    expect(normalizeHash("abcdef")).toBe("abcdef");
  });

  it("hashesMatch membandingkan hash yang setara", () => {
    const hash = hashDocument(Buffer.from("dokumen"));
    expect(hashesMatch(hash, hash.toUpperCase())).toBe(true);
    expect(hashesMatch(hash, hash.replace(/^sha256:/, ""))).toBe(true);
    expect(hashesMatch(hash, hashDocument(Buffer.from("lain")))).toBe(false);
  });
});
