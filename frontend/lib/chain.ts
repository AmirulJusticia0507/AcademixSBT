import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { DIPLOMA_SBT_ABI } from "./abi";
import type { ChainConfig } from "./chains";
import type { ChainInfo, OnChainDiploma } from "./types";

export class ChainNotConfiguredError extends Error {
  constructor() {
    super(
      "Belum ada chain/kontrak yang dikonfigurasi. Set NEXT_PUBLIC_ARB_CONTRACT_ADDRESS dan/atau NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS (atau NEXT_PUBLIC_CONTRACT_ADDRESS) lalu rebuild portal.",
    );
    this.name = "ChainNotConfiguredError";
  }
}

export class TokenNotFoundError extends Error {
  constructor(tokenId: string, chainName?: string) {
    super(
      chainName
        ? `Token ID ${tokenId} tidak ditemukan di ${chainName}.`
        : `Token ID ${tokenId} tidak ditemukan di blockchain.`,
    );
    this.name = "TokenNotFoundError";
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

const providers = new Map<string, JsonRpcProvider>();
const contracts = new Map<string, Contract>();

function getContract(chain: ChainConfig): Contract {
  if (!/^0x[a-fA-F0-9]{40}$/.test(chain.contractAddress)) {
    throw new ChainNotConfiguredError();
  }
  if (!providers.has(chain.id)) {
    providers.set(chain.id, new JsonRpcProvider(chain.rpcUrl, chain.chainId));
  }
  if (!contracts.has(chain.id)) {
    contracts.set(chain.id, new Contract(chain.contractAddress, DIPLOMA_SBT_ABI, providers.get(chain.id)!));
  }
  return contracts.get(chain.id)!;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function toChainInfo(chain: ChainConfig): ChainInfo {
  return { id: chain.id, name: chain.name, chainId: chain.chainId, explorerUrl: chain.explorerUrl, contractAddress: chain.contractAddress };
}

export async function readOnChain(tokenId: string, chain: ChainConfig): Promise<OnChainDiploma> {
  if (!/^\d+$/.test(tokenId) || BigInt(tokenId) <= 0n) {
    throw new InvalidInputError("Token ID harus berupa angka bulat positif.");
  }

  const instance = getContract(chain);
  const id = BigInt(tokenId);

  let owner: string;
  try {
    owner = await instance.ownerOf(id);
  } catch {
    throw new TokenNotFoundError(tokenId, chain.name);
  }

  const [issuer, tokenUri, locked, revoked, mintedAtRaw] = await Promise.all([
    instance.issuerOf(id) as Promise<string>,
    instance.tokenURI(id) as Promise<string>,
    instance.locked(id) as Promise<boolean>,
    instance.isRevoked(id) as Promise<boolean>,
    instance.mintedAt(id) as Promise<bigint>,
  ]);

  return {
    chain: toChainInfo(chain),
    tokenId: id.toString(),
    owner: getAddress(owner),
    issuer: issuer && issuer !== ZERO_ADDRESS ? getAddress(issuer) : "",
    tokenUri,
    locked: Boolean(locked),
    revoked: Boolean(revoked),
    mintedAt:
      mintedAtRaw && mintedAtRaw > 0n
        ? new Date(Number(mintedAtRaw) * 1000).toISOString()
        : null,
  };
}

export async function readWallet(address: string, chain: ChainConfig): Promise<OnChainDiploma[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new InvalidInputError("Alamat wallet tidak valid.");
  }

  const instance = getContract(chain);
  const balance = (await instance.balanceOf(address)) as bigint;

  const tokens: OnChainDiploma[] = [];
  for (let i = 0n; i < balance; i += 1n) {
    const tokenId = (await instance.tokenOfOwnerByIndex(address, i)) as bigint;
    tokens.push(await readOnChain(tokenId.toString(), chain));
  }
  return tokens;
}

export async function readTotalSupply(chain: ChainConfig): Promise<number> {
  const instance = getContract(chain);
  return Number((await instance.totalSupply()) as bigint);
}

export function isChainConfigured(chain: ChainConfig): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(chain.contractAddress);
}
