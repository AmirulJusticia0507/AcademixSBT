export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function shortAddress(address?: string): string {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function isValidTokenId(value: string): boolean {
  return /^\d+$/.test(value.trim()) && BigInt(value.trim()) > 0n;
}

export function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function normalizeHash(hash: string): string {
  const value = hash.trim().toLowerCase();
  return value.startsWith("sha256:") ? value.slice("sha256:".length) : value;
}

export function hashesMatch(left: string, right: string): boolean {
  return normalizeHash(left) === normalizeHash(right);
}

/** Hash SHA-256 berkas di browser; berkas tidak dikirim ke mana pun. */
export async function sha256File(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}
