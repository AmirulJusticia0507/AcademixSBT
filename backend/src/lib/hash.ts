import { createHash } from "node:crypto";

/** Hitung hash SHA-256 sebuah buffer/file dan kembalikan format `sha256:<hex>`. */
export function sha256Hex(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Hash dokumen dengan prefix algoritma agar mudah dibandingkan di metadata. */
export function hashDocument(data: Buffer): string {
  return `sha256:${sha256Hex(data)}`;
}

/** Normalisasi hash agar perbandingan tidak sensitif prefix/spasi/huruf besar. */
export function normalizeHash(hash: string): string {
  const cleaned = hash.trim().toLowerCase();
  return cleaned.startsWith("sha256:") ? cleaned.slice("sha256:".length) : cleaned;
}

export function hashesMatch(left: string, right: string): boolean {
  return normalizeHash(left) === normalizeHash(right);
}
