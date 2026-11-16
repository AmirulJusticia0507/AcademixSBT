function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

// Verified Polygon Amoy deployment. An environment variable can override this
// for another network or deployment, but the public portal remains usable when
// Vercel is built without a frontend/.env file.
const DEFAULT_CONTRACT_ADDRESS = "0xaAc61D50D61c0FE2Db83c34ec3860d498b5dcEAa";

export const config = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc-amoy.polygon.technology",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 80002),
  contractAddress: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || DEFAULT_CONTRACT_ADDRESS).trim(),
  explorerUrl: trimSlash(process.env.NEXT_PUBLIC_EXPLORER_URL || "https://amoy.polygonscan.com"),
  ipfsGateway: trimSlash(
    process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs",
  ),
  apiUrl: trimSlash(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"),
};

export const isContractConfigured = /^0x[a-fA-F0-9]{40}$/.test(config.contractAddress);

export function explorerTx(txHash: string): string {
  return `${config.explorerUrl}/tx/${txHash}`;
}

export function explorerAddress(address: string): string {
  return `${config.explorerUrl}/address/${address}`;
}
