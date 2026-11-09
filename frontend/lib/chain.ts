import { Contract, JsonRpcProvider, getAddress } from "ethers";
import { DIPLOMA_SBT_ABI } from "./abi";
import { config, isContractConfigured } from "./config";
import type { OnChainDiploma } from "./types";

export class ChainNotConfiguredError extends Error {
  constructor() {
    super(
      "Alamat kontrak belum dikonfigurasi. Set NEXT_PUBLIC_CONTRACT_ADDRESS lalu rebuild portal.",
    );
    this.name = "ChainNotConfiguredError";
  }
}

export class TokenNotFoundError extends Error {
  constructor(tokenId: string) {
    super(`Token ID ${tokenId} tidak ditemukan di blockchain.`);
    this.name = "TokenNotFoundError";
  }
}

export class InvalidInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidInputError";
  }
}

let provider: JsonRpcProvider | null = null;
let contract: Contract | null = null;

function getContract(): Contract {
  if (!isContractConfigured) {
    throw new ChainNotConfiguredError();
  }
  if (!provider) {
    provider = new JsonRpcProvider(config.rpcUrl, config.chainId);
  }
  if (!contract) {
    contract = new Contract(config.contractAddress, DIPLOMA_SBT_ABI, provider);
  }
  return contract;
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export async function readOnChain(tokenId: string): Promise<OnChainDiploma> {
  if (!/^\d+$/.test(tokenId) || BigInt(tokenId) <= 0n) {
    throw new InvalidInputError("Token ID harus berupa angka bulat positif.");
  }

  const instance = getContract();
  const id = BigInt(tokenId);

  let owner: string;
  try {
    owner = await instance.ownerOf(id);
  } catch {
    throw new TokenNotFoundError(tokenId);
  }

  const [issuer, tokenUri, locked, revoked, mintedAtRaw] = await Promise.all([
    instance.issuerOf(id) as Promise<string>,
    instance.tokenURI(id) as Promise<string>,
    instance.locked(id) as Promise<boolean>,
    instance.isRevoked(id) as Promise<boolean>,
    instance.mintedAt(id) as Promise<bigint>,
  ]);

  return {
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

export async function readWallet(address: string): Promise<OnChainDiploma[]> {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new InvalidInputError("Alamat wallet tidak valid.");
  }

  const instance = getContract();
  const balance = (await instance.balanceOf(address)) as bigint;

  const tokens: OnChainDiploma[] = [];
  for (let i = 0n; i < balance; i += 1n) {
    const tokenId = (await instance.tokenOfOwnerByIndex(address, i)) as bigint;
    tokens.push(await readOnChain(tokenId.toString()));
  }
  return tokens;
}

export async function readTotalSupply(): Promise<number> {
  const instance = getContract();
  return Number((await instance.totalSupply()) as bigint);
}
