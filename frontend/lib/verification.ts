import { readOnChain, readWallet } from "./chain";
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

export async function verifyToken(tokenId: string): Promise<VerifiedDiploma> {
  return enrich(await readOnChain(tokenId));
}

export async function verifyWallet(address: string): Promise<VerifiedDiploma[]> {
  const tokens = await readWallet(address);
  return Promise.all(tokens.map(enrich));
}
