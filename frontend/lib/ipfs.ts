import { config } from "./config";
import type { DiplomaMetadata } from "./types";

const FALLBACK_GATEWAYS = ["https://ipfs.io/ipfs", "https://dweb.link/ipfs"];

export function parseCid(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    const rest = uri.slice("ipfs://".length);
    return rest.split("/")[0] || null;
  }

  const marker = "/ipfs/";
  const index = uri.indexOf(marker);
  if (index >= 0) {
    return uri.slice(index + marker.length).split(/[/?#]/)[0] || null;
  }
  return null;
}

function gatewayCandidates(): string[] {
  return Array.from(new Set([config.ipfsGateway, ...FALLBACK_GATEWAYS]));
}

export function ipfsHttpUrl(uriOrCid: string): string {
  const cid = parseCid(uriOrCid);
  if (!cid) {
    return uriOrCid;
  }
  if (cid.startsWith("local-")) {
    return `${config.apiUrl}/api/ipfs/${cid}`;
  }
  return `${gatewayCandidates()[0]}/${cid}`;
}

function isDiplomaMetadata(value: unknown): value is DiplomaMetadata {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string") return false;
  const diploma = candidate.diploma as Record<string, unknown> | undefined;
  return Boolean(
    diploma &&
      typeof diploma === "object" &&
      typeof diploma.certificate_number === "string" &&
      typeof diploma.document_hash === "string",
  );
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ambil metadata dari IPFS dengan beberapa gateway fallback.
 * CID `local-*` (provider lokal backend) diambil lewat proxy API.
 */
export async function fetchDiplomaMetadata(tokenUri: string): Promise<DiplomaMetadata> {
  const cid = parseCid(tokenUri);
  if (!cid) {
    throw new Error("Token URI bukan alamat IPFS yang valid.");
  }

  const urls = cid.startsWith("local-")
    ? [`${config.apiUrl}/api/ipfs/${cid}`]
    : gatewayCandidates().map((gateway) => `${gateway}/${cid}`);

  const errors: string[] = [];
  for (const url of urls) {
    try {
      const value = await fetchJson(url);
      if (!isDiplomaMetadata(value)) {
        throw new Error("Format metadata ijazah tidak valid");
      }
      return value;
    } catch (error) {
      errors.push(`${new URL(url).host}: ${error instanceof Error ? error.message : "gagal"}`);
    }
  }

  throw new Error(`Metadata IPFS tidak dapat diambil (${errors.join("; ")})`);
}
