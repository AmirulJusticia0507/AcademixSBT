import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  port: number;
  publicApiUrl: string;
  adminApiKey: string;
  verifierApiKey?: string;
  databaseUrl: string;
  rpcUrl: string;
  chainId: number;
  contractAddress: string;
  privateKey: string;
  issuerAddress?: string;
  ipfsProvider: "pinata" | "local";
  ipfsGateway: string;
  pinataJwt?: string;
  pinataApiKey?: string;
  pinataSecretKey?: string;
  localIpfsDir: string;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const provider = optional(env.IPFS_PROVIDER) ?? "local";
  if (provider !== "pinata" && provider !== "local") {
    throw new Error('IPFS_PROVIDER harus "pinata" atau "local"');
  }

  const port = Number(optional(env.PORT) ?? 4000);
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT tidak valid");
  }

  return {
    port,
    publicApiUrl: (optional(env.PUBLIC_API_URL) ?? `http://localhost:${port}`).replace(/\/$/, ""),
    adminApiKey: optional(env.ADMIN_API_KEY) ?? "dev-admin-key",
    verifierApiKey: optional(env.VERIFIER_API_KEY),
    databaseUrl: optional(env.DATABASE_URL) ?? "postgresql://postgres:postgres@localhost:5432/academix",
    rpcUrl: optional(env.RPC_URL) ?? "https://rpc-amoy.polygon.technology",
    chainId: Number(optional(env.CHAIN_ID) ?? 80002),
    contractAddress: optional(env.CONTRACT_ADDRESS) ?? "",
    privateKey: optional(env.PRIVATE_KEY) ?? "",
    issuerAddress: optional(env.ISSUER_ADDRESS),
    ipfsProvider: provider,
    ipfsGateway: (optional(env.IPFS_GATEWAY) ?? "https://gateway.pinata.cloud/ipfs").replace(/\/$/, ""),
    pinataJwt: optional(env.PINATA_JWT),
    pinataApiKey: optional(env.PINATA_API_KEY),
    pinataSecretKey: optional(env.PINATA_SECRET_KEY),
    localIpfsDir: optional(env.LOCAL_IPFS_DIR) ?? "./storage/ipfs",
  };
}

export const config = loadConfig();
