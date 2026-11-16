import { readOnChain, readWallet, InvalidInputError } from "./chain";
import { getSupportedChains, type ChainConfig } from "./chains";
import { fetchDiplomaMetadata, parseCid } from "./ipfs";
import type { DiplomaMetadata, OnChainDiploma, VerifiedDiploma } from "./types";

async function enrich(onChain: OnChainDiploma): Promise<VerifiedDiploma> {
  const cid = parseCid(onChain.tokenUri);

  if (!cid) {
    return {
      ...onChain,
      found: true,
      metadata: null,
      metadataError: "Token URI bukan alamat IPFS yang valid.",
    };
  }

  try {
    const metadata: DiplomaMetadata = await fetchDiplomaMetadata(onChain.tokenUri);
    return { ...onChain, found: true, metadata };
  } catch (error) {
    return {
      ...onChain,
      found: true,
      metadata: null,
      metadataError: error instanceof Error ? error.message : "Metadata tidak dapat dibaca",
    };
  }
}

export type ChainVerifyResult =
  | { chain: ChainConfig; status: "found"; data: VerifiedDiploma }
  | { chain: ChainConfig; status: "not-found"; message: string }
  | { chain: ChainConfig; status: "error"; message: string };

export type MultiVerifyResult = {
  tokenId: string;
  results: ChainVerifyResult[];
  found: VerifiedDiploma[];
};

export async function verifyTokenOnChain(tokenId: string, chain: ChainConfig): Promise<VerifiedDiploma> {
  return enrich(await readOnChain(tokenId, chain));
}

export async function verifyTokenMulti(tokenId: string): Promise<MultiVerifyResult> {
  const chains = getSupportedChains();
  if (chains.length === 0) {
    throw new Error("Belum ada chain/kontrak yang dikonfigurasi.");
  }

  const results = await Promise.all(
    chains.map(async (chain): Promise<ChainVerifyResult> => {
      try {
        const data = await verifyTokenOnChain(tokenId, chain);
        return { chain, status: "found", data };
      } catch (error: any) {
        const msg = error?.message || "Gagal memverifikasi";
        if (error?.name === "TokenNotFoundError" || /tidak ditemukan/i.test(msg)) {
          return { chain, status: "not-found", message: msg };
        }
        if (error instanceof InvalidInputError) throw error; // invalid token id applies globally
        return { chain, status: "error", message: msg };
      }
    }),
  );

  return {
    tokenId,
    results,
    found: results.flatMap((r) => (r.status === "found" ? [r.data] : [])),
  };
}

export async function verifyWalletMulti(address: string): Promise<{ address: string; results: Array<{ chain: ChainConfig; tokens: VerifiedDiploma[]; error?: string }>; tokens: VerifiedDiploma[] }> {
  const chains = getSupportedChains();
  if (chains.length === 0) {
    throw new Error("Belum ada chain/kontrak yang dikonfigurasi.");
  }

  const results = await Promise.all(
    chains.map(async (chain) => {
      try {
        const onchain = await readWallet(address, chain);
        const tokens = await Promise.all(onchain.map(enrich));
        return { chain, tokens };
      } catch (error: any) {
        if (error instanceof InvalidInputError) throw error;
        return { chain, tokens: [] as VerifiedDiploma[], error: error?.message || "Gagal membaca wallet" };
      }
    }),
  );

  return {
    address,
    results,
    tokens: results.flatMap((r) => r.tokens),
  };
}

// Backward-compat single-chain helpers (use first supported chain)
export async function verifyToken(tokenId: string): Promise<VerifiedDiploma> {
  const chains = getSupportedChains();
  if (chains.length === 0) throw new Error("Belum ada chain/kontrak yang dikonfigurasi.");
  return verifyTokenOnChain(tokenId, chains[0]);
}

export async function verifyWallet(address: string): Promise<VerifiedDiploma[]> {
  const chains = getSupportedChains();
  if (chains.length === 0) throw new Error("Belum ada chain/kontrak yang dikonfigurasi.");
  const out = await verifyWalletMulti(address);
  return out.tokens;
}
