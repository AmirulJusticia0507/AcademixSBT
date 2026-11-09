import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256Hex } from "../lib/hash";
import { ServiceUnavailableError } from "../lib/errors";

export interface IpfsUploadResult {
  cid: string;
}

export interface IpfsProvider {
  readonly kind: "pinata" | "local";
  uploadJson(value: unknown): Promise<IpfsUploadResult>;
  readJson(cid: string): Promise<unknown>;
}

export function ipfsUri(cid: string): string {
  return `ipfs://${cid}`;
}

/** Ambil CID dari `ipfs://CID`, `ipfs://CID/path`, atau URL gateway. */
export function cidFromUri(uri: string): string | null {
  if (uri.startsWith("ipfs://")) {
    const rest = uri.slice("ipfs://".length);
    return rest.split("/")[0] || null;
  }

  try {
    const url = new URL(uri);
    const marker = "/ipfs/";
    const index = url.pathname.indexOf(marker);
    if (index >= 0) {
      return url.pathname.slice(index + marker.length).split("/")[0] || null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Provider lokal untuk development/test — menyimpan JSON di disk.
 * CID deterministik dari SHA-256 isi JSON agar idempotent.
 */
export class LocalIpfsProvider implements IpfsProvider {
  readonly kind = "local" as const;

  constructor(private readonly directory: string) {}

  private filePath(cid: string): string {
    if (!/^[a-zA-Z0-9._-]+$/.test(cid)) {
      throw new ServiceUnavailableError("CID lokal tidak valid");
    }
    return join(resolve(this.directory), `${cid}.json`);
  }

  async uploadJson(value: unknown): Promise<IpfsUploadResult> {
    const body = JSON.stringify(value, null, 2);
    const cid = `local-${sha256Hex(body).slice(0, 32)}`;

    await mkdir(resolve(this.directory), { recursive: true });
    await writeFile(this.filePath(cid), body, "utf8");
    return { cid };
  }

  async readJson(cid: string): Promise<unknown> {
    try {
      const body = await readFile(this.filePath(cid), "utf8");
      return JSON.parse(body);
    } catch {
      throw new ServiceUnavailableError(`Metadata IPFS lokal tidak ditemukan: ${cid}`);
    }
  }
}

interface PinataConfig {
  jwt?: string;
  apiKey?: string;
  secretKey?: string;
  gateway: string;
}

/** Provider Pinata (pinJSONToIPFS + gateway publik). */
export class PinataIpfsProvider implements IpfsProvider {
  readonly kind = "pinata" as const;

  constructor(private readonly config: PinataConfig) {}

  private headers(): Record<string, string> {
    if (this.config.jwt) {
      return { Authorization: `Bearer ${this.config.jwt}` };
    }
    if (this.config.apiKey && this.config.secretKey) {
      return {
        pinata_api_key: this.config.apiKey,
        pinata_secret_api_key: this.config.secretKey,
      };
    }
    throw new ServiceUnavailableError(
      "PINATA_JWT atau PINATA_API_KEY + PINATA_SECRET_KEY belum diisi",
    );
  }

  async uploadJson(value: unknown): Promise<IpfsUploadResult> {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers(),
      },
      body: JSON.stringify({
        pinataContent: value,
        pinataMetadata: { name: "academixsbt-diploma-metadata.json" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ServiceUnavailableError(`Upload ke Pinata gagal (${response.status})`, text);
    }

    const json = (await response.json()) as { IpfsHash?: string };
    if (!json.IpfsHash) {
      throw new ServiceUnavailableError("Pinata tidak mengembalikan IpfsHash");
    }
    return { cid: json.IpfsHash };
  }

  async readJson(cid: string): Promise<unknown> {
    const response = await fetch(`${this.config.gateway}/${cid}`);
    if (!response.ok) {
      throw new ServiceUnavailableError(`Gagal membaca metadata IPFS (${response.status})`);
    }
    return response.json();
  }
}

export function createIpfsProvider(options: {
  provider: "pinata" | "local";
  localDir: string;
  gateway: string;
  pinataJwt?: string;
  pinataApiKey?: string;
  pinataSecretKey?: string;
}): IpfsProvider {
  if (options.provider === "pinata") {
    return new PinataIpfsProvider({
      jwt: options.pinataJwt,
      apiKey: options.pinataApiKey,
      secretKey: options.pinataSecretKey,
      gateway: options.gateway,
    });
  }
  return new LocalIpfsProvider(options.localDir);
}
