import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Enkripsi kolom sensitif (mis. NIK) dengan AES-256-GCM sebelum disimpan ke PostgreSQL.
 * Kunci diambil dari env ENCRYPTION_KEY (base64 dari 32 byte acak).
 * Format simpan: `v1:<iv_b64>:<tag_b64>:<cipher_b64>`
 * Data ini TIDAK pernah dikirim on-chain / ke IPFS publik.
 */
export function loadEncryptionKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  const raw = env.ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY harus base64 dari 32 byte (AES-256)");
  }
  return key;
}

export function encryptSensitive(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSensitive(payload: string, key: Buffer): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Format ciphertext tidak valid");
  }
  const [, ivB64, tagB64, cipherB64] = parts;
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(cipherB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
