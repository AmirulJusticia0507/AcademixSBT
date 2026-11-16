export interface ChainConfig {
  id: string; // e.g. "arbitrum", "polygon"
  name: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  explorerUrl: string;
}

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function env(name: string): string {
  return (process.env[name] || "").trim();
}

const DEFAULT_CONTRACT_ADDRESS = "0xaAc61D50D61c0FE2Db83c34ec3860d498b5dcEAa";

// Default targets for "Amirul Putra's First App": Arbitrum One & Polygon PoS.
const CANDIDATES: Array<Omit<ChainConfig, "contractAddress"> & { contractEnv: string; contractFallback?: string }> = [
  {
    id: "arbitrum",
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: env("NEXT_PUBLIC_ARB_RPC_URL") || "https://arb1.arbitrum.io/rpc",
    explorerUrl: trimSlash(env("NEXT_PUBLIC_ARB_EXPLORER_URL") || "https://arbiscan.io"),
    contractEnv: "NEXT_PUBLIC_ARB_CONTRACT_ADDRESS",
  },
  {
    id: "polygon",
    name: "Polygon PoS",
    chainId: 137,
    rpcUrl: env("NEXT_PUBLIC_POLYGON_RPC_URL") || "https://polygon-rpc.com",
    explorerUrl: trimSlash(env("NEXT_PUBLIC_POLYGON_EXPLORER_URL") || "https://polygonscan.com"),
    contractEnv: "NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS",
  },
];

function legacyChain(): ChainConfig | null {
  const contractAddress = env("NEXT_PUBLIC_CONTRACT_ADDRESS") || DEFAULT_CONTRACT_ADDRESS;
  const chainId = Number(env("NEXT_PUBLIC_CHAIN_ID") || 80002);
  const rpcUrl = env("NEXT_PUBLIC_RPC_URL") || "https://rpc-amoy.polygon.technology";
  const explorerUrl = trimSlash(env("NEXT_PUBLIC_EXPLORER_URL") || "https://amoy.polygonscan.com");
  if (!isAddress(contractAddress)) return null;
  const name = chainId === 42161 ? "Arbitrum One" : chainId === 137 ? "Polygon PoS" : chainId === 80002 ? "Polygon Amoy" : `Chain ${chainId}`;
  const id = chainId === 42161 ? "arbitrum" : chainId === 137 ? "polygon" : `chain-${chainId}`;
  return { id, name, chainId, rpcUrl, contractAddress, explorerUrl };
}

export function getSupportedChains(): ChainConfig[] {
  const chains: ChainConfig[] = [];
  for (const c of CANDIDATES) {
    const contractAddress = env(c.contractEnv);
    if (isAddress(contractAddress)) {
      chains.push({ id: c.id, name: c.name, chainId: c.chainId, rpcUrl: c.rpcUrl, explorerUrl: c.explorerUrl, contractAddress });
    }
  }
  if (chains.length === 0) {
    const legacy = legacyChain();
    if (legacy) chains.push(legacy);
  }
  // If still none, expose candidates without valid contracts? no - keep empty to show "not configured"
  return chains;
}

// All target chains (including unconfigured) for UI hints
export function getTargetChains(): Array<ChainConfig & { configured: boolean }> {
  const result: Array<ChainConfig & { configured: boolean }> = [];
  for (const c of CANDIDATES) {
    const contractAddress = env(c.contractEnv);
    result.push({ id: c.id, name: c.name, chainId: c.chainId, rpcUrl: c.rpcUrl, explorerUrl: c.explorerUrl, contractAddress, configured: isAddress(contractAddress) });
  }
  const legacy = legacyChain();
  if (legacy && !result.some((r) => r.id === legacy.id)) {
    result.push({ ...legacy, configured: true });
  }
  return result;
}

export function explorerTx(chain: ChainConfig, txHash: string): string {
  return `${chain.explorerUrl}/tx/${txHash}`;
}

export function explorerAddress(chain: ChainConfig, address: string): string {
  return `${chain.explorerUrl}/address/${address}`;
}
