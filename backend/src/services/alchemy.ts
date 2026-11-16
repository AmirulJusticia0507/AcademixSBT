import { ServiceUnavailableError } from "../lib/errors";

export type AlchemyNetwork = "arb-mainnet" | "polygon-mainnet";

export interface ChainPortfolio {
  network: AlchemyNetwork;
  networkName: string;
  native: { wei: string; eth: string; symbol: string } | null;
  tokens: Array<{
    contractAddress: string;
    symbol?: string;
    name?: string;
    decimals?: number;
    balance: string;
    balanceFormatted?: string;
    logo?: string;
  }>;
  transfers: Array<{
    hash: string;
    from: string;
    to?: string;
    value?: number;
    asset?: string;
    category: string;
    blockNum: string;
    metadata?: { blockTimestamp?: string };
  }>;
  nfts: { totalCount: number; sample: Array<{ contract: string; tokenId: string; name?: string; image?: string }> };
  errors: string[];
}

const NETWORKS: Array<{ id: AlchemyNetwork; name: string; symbol: string; nftBase: string }> = [
  { id: "arb-mainnet", name: "Arbitrum One", symbol: "ETH", nftBase: "arb-mainnet" },
  { id: "polygon-mainnet", name: "Polygon PoS", symbol: "POL", nftBase: "polygon-mainnet" },
];

async function rpc<T>(network: AlchemyNetwork, apiKey: string, method: string, params: unknown[]): Promise<T> {
  const url = `https://${network}.g.alchemy.com/v2/${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await res.json()) as { result?: T; error?: { message?: string } };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `RPC ${method} failed (${res.status})`);
  }
  return json.result as T;
}

function formatUnits(hexOrDec: string, decimals: number): string {
  const value = BigInt(hexOrDec);
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = (value % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

async function getNative(network: (typeof NETWORKS)[number], apiKey: string, address: string) {
  const hex = await rpc<string>(network.id, apiKey, "eth_getBalance", [address, "latest"]);
  const wei = BigInt(hex);
  return { wei: wei.toString(), eth: formatUnits(hex, 18), symbol: network.symbol };
}

async function getTokens(network: AlchemyNetwork, apiKey: string, address: string) {
  const result = await rpc<{ tokenBalances: Array<{ contractAddress: string; tokenBalance: string | null; error?: string }> }>(
    network, apiKey, "alchemy_getTokenBalances", [address, "erc20"]
  );
  const nonZero = (result.tokenBalances || [])
    .filter((t) => t.tokenBalance && t.tokenBalance !== "0x0" && !t.error)
    .slice(0, 20);

  const tokens = await Promise.all(nonZero.map(async (t) => {
    let meta: any = {};
    try {
      meta = await rpc<any>(network, apiKey, "alchemy_getTokenMetadata", [t.contractAddress]);
    } catch { /* ignore */ }
    const decimals = typeof meta.decimals === "number" ? meta.decimals : 18;
    const balance = t.tokenBalance as string;
    let balanceFormatted: string | undefined;
    try { balanceFormatted = formatUnits(balance, decimals); } catch { /* ignore */ }
    return {
      contractAddress: t.contractAddress,
      symbol: meta.symbol,
      name: meta.name,
      decimals,
      balance,
      balanceFormatted,
      logo: meta.logo,
    };
  }));
  return tokens;
}

async function getTransfers(network: AlchemyNetwork, apiKey: string, address: string) {
  const params = {
    fromBlock: "0x0",
    toBlock: "latest",
    toAddress: address,
    category: ["external", "erc20", "erc721", "erc1155"],
    withMetadata: true,
    excludeZeroValue: false,
    maxCount: "0xa", // 10
    order: "desc",
  };
  const result = await rpc<{ transfers: any[] }>(network, apiKey, "alchemy_getAssetTransfers", [params]);
  // also recent outgoing
  let outgoing: any[] = [];
  try {
    const out = await rpc<{ transfers: any[] }>(network, apiKey, "alchemy_getAssetTransfers", [{ ...params, toAddress: undefined, fromAddress: address }]);
    outgoing = out.transfers || [];
  } catch { /* ignore */ }
  const merged = [...(result.transfers || []), ...outgoing];
  const seen = new Set<string>();
  return merged.filter((t) => {
    const key = `${t.hash}-${t.category}-${t.uniqueId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10).map((t) => ({
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value,
    asset: t.asset,
    category: t.category,
    blockNum: t.blockNum,
    metadata: t.metadata,
  }));
}

async function getNfts(network: (typeof NETWORKS)[number], apiKey: string, address: string) {
  const url = `https://${network.nftBase}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=10`;
  const res = await fetch(url);
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json?.error?.message || json?.message || `NFT API failed (${res.status})`);
  const owned = json.ownedNfts || [];
  return {
    totalCount: Number(json.totalCount ?? owned.length ?? 0),
    sample: owned.slice(0, 10).map((n: any) => ({
      contract: n.contract?.address,
      tokenId: n.tokenId,
      name: n.name || n.raw?.metadata?.name,
      image: n.image?.cachedUrl || n.image?.thumbnailUrl || n.image?.pngUrl || n.raw?.metadata?.image,
    })),
  };
}

async function fetchChainPortfolio(network: (typeof NETWORKS)[number], apiKey: string, address: string): Promise<ChainPortfolio> {
  const errors: string[] = [];
  let native = null, tokens: ChainPortfolio["tokens"] = [], transfers: ChainPortfolio["transfers"] = [], nfts: ChainPortfolio["nfts"] = { totalCount: 0, sample: [] };

  try { native = await getNative(network, apiKey, address); } catch (e: any) { errors.push(`native: ${e.message}`); }
  try { tokens = await getTokens(network.id, apiKey, address); } catch (e: any) { errors.push(`tokens: ${e.message}`); }
  try { transfers = await getTransfers(network.id, apiKey, address); } catch (e: any) { errors.push(`transfers: ${e.message}`); }
  try { nfts = await getNfts(network, apiKey, address); } catch (e: any) { errors.push(`nfts: ${e.message}`); }

  return { network: network.id, networkName: network.name, native, tokens, transfers, nfts, errors };
}

export class AlchemyPortfolioService {
  constructor(private readonly apiKey?: string) {}

  async getPortfolio(address: string): Promise<{ address: string; chains: ChainPortfolio[] }> {
    if (!this.apiKey) {
      throw new ServiceUnavailableError("ALCHEMY_API_KEY belum dikonfigurasi di backend (.env).");
    }
    const chains = await Promise.all(NETWORKS.map((n) => fetchChainPortfolio(n, this.apiKey!, address)));
    return { address, chains };
  }
}
