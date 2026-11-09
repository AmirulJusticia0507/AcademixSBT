/**
 * Registry multi-chain (P2).
 * Chain utama dari env RPC_URL/CHAIN_ID/CONTRACT_ADDRESS,
 * chain tambahan dari CHAINS_JSON (array JSON).
 *
 * Contoh CHAINS_JSON:
 * [{"chainId":421614,"name":"Arbitrum Sepolia","rpcUrl":"https://sepolia-rollup.arbitrum.io/rpc","contractAddress":"0x..."}]
 */

export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  contractAddress: string;
}

const KNOWN_NAMES: Record<number, string> = {
  80002: "Polygon Amoy",
  421614: "Arbitrum Sepolia",
  137: "Polygon",
  42161: "Arbitrum One",
};

export function parseChainsJson(raw: string | undefined): ChainConfig[] {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("CHAINS_JSON tidak valid (harus JSON array)");
  }
  if (!Array.isArray(parsed)) throw new Error("CHAINS_JSON harus berupa array");
  return parsed.map((entry, i) => {
    const e = entry as Record<string, unknown>;
    const chainId = Number(e.chainId);
    if (!Number.isInteger(chainId) || chainId <= 0) throw new Error(`CHAINS_JSON[${i}].chainId tidak valid`);
    if (typeof e.rpcUrl !== "string" || !e.rpcUrl) throw new Error(`CHAINS_JSON[${i}].rpcUrl wajib diisi`);
    if (typeof e.contractAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(e.contractAddress)) {
      throw new Error(`CHAINS_JSON[${i}].contractAddress tidak valid`);
    }
    return {
      chainId,
      name: typeof e.name === "string" && e.name ? e.name : (KNOWN_NAMES[chainId] ?? `Chain ${chainId}`),
      rpcUrl: e.rpcUrl,
      contractAddress: e.contractAddress,
    };
  });
}

export class ChainRegistry {
  private readonly chains = new Map<number, ChainConfig>();

  constructor(primary: ChainConfig, additional: ChainConfig[] = []) {
    this.chains.set(primary.chainId, primary);
    for (const chain of additional) this.chains.set(chain.chainId, chain);
  }

  list(): ChainConfig[] {
    return [...this.chains.values()];
  }

  get(chainId: number): ChainConfig | undefined {
    return this.chains.get(chainId);
  }

  /** Chain yang dipakai bila chainId tidak diberikan / tidak dikenal. */
  primary(): ChainConfig {
    return this.chains.values().next().value as ChainConfig;
  }

  resolve(chainId?: number): ChainConfig {
    if (chainId === undefined) return this.primary();
    return this.chains.get(chainId) ?? this.primary();
  }
}
