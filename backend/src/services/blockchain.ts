import {
  Contract,
  JsonRpcProvider,
  Wallet,
  getAddress,
  isAddress,
  type Provider,
} from "ethers";
import { DIPLOMA_SBT_ABI } from "../lib/abi";
import { NotFoundError, ServiceUnavailableError, ValidationError } from "../lib/errors";
import type { OnChainDiploma } from "../types";

export interface BlockchainConfig {
  rpcUrl: string;
  chainId: number;
  contractAddress: string;
  privateKey?: string;
}

export interface MintOnChainResult {
  txHash: string;
  issuerAddress: string;
}

export interface ChainInfo {
  chainId: number;
  blockNumber: number;
  contractAddress: string;
}

/**
 * Semua akses blockchain lewat service ini agar route mudah diuji dengan fake.
 */
export class BlockchainService {
  private provider?: JsonRpcProvider;
  private reader?: Contract;
  private writer?: Contract;
  private signer?: Wallet;

  constructor(private readonly config: BlockchainConfig) {}

  get contractAddress(): string {
    return this.config.contractAddress;
  }

  isConfigured(): boolean {
    return isAddress(this.config.contractAddress);
  }

  private getProvider(): JsonRpcProvider {
    if (!this.provider) {
      this.provider = new JsonRpcProvider(this.config.rpcUrl, this.config.chainId);
    }
    return this.provider;
  }

  private getReader(): Contract {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError(
        "CONTRACT_ADDRESS belum diisi/tidak valid. Deploy kontrak lalu set env.",
      );
    }
    if (!this.reader) {
      this.reader = new Contract(
        this.config.contractAddress,
        DIPLOMA_SBT_ABI,
        this.getProvider() as Provider,
      );
    }
    return this.reader;
  }

  private getWriter(): { contract: Contract; signer: Wallet } {
    if (!this.config.privateKey) {
      throw new ServiceUnavailableError("PRIVATE_KEY belum diisi; tidak dapat menulis on-chain.");
    }
    if (!this.writer || !this.signer) {
      this.signer = new Wallet(this.config.privateKey, this.getProvider());
      this.writer = new Contract(this.config.contractAddress, DIPLOMA_SBT_ABI, this.signer);
    }
    return { contract: this.writer, signer: this.signer };
  }

  async getChainInfo(): Promise<ChainInfo> {
    const provider = this.getProvider();
    const [network, blockNumber] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
    return {
      chainId: Number(network.chainId),
      blockNumber,
      contractAddress: this.config.contractAddress,
    };
  }

  async getDiploma(tokenId: string | bigint): Promise<OnChainDiploma> {
    const contract = this.getReader();
    const id = BigInt(tokenId);

    let owner: string;
    try {
      owner = await contract.ownerOf(id);
    } catch {
      throw new NotFoundError(`Token ID ${id.toString()} tidak ditemukan on-chain`);
    }

    const [issuer, tokenUri, locked, revoked, mintedAtRaw] = await Promise.all([
      contract.issuerOf(id) as Promise<string>,
      contract.tokenURI(id) as Promise<string>,
      contract.locked(id) as Promise<boolean>,
      contract.isRevoked(id) as Promise<boolean>,
      contract.mintedAt(id) as Promise<bigint>,
    ]);

    const mintedAt =
      mintedAtRaw && mintedAtRaw > 0n
        ? new Date(Number(mintedAtRaw) * 1000).toISOString()
        : null;

    return {
      tokenId: id.toString(),
      owner: getAddress(owner),
      issuer: issuer && issuer !== "0x0000000000000000000000000000000000000000" ? getAddress(issuer) : "",
      tokenUri,
      locked: Boolean(locked),
      revoked: Boolean(revoked),
      mintedAt,
    };
  }

  async findByOwner(owner: string): Promise<OnChainDiploma[]> {
    if (!isAddress(owner)) {
      throw new ValidationError("Alamat wallet tidak valid");
    }
    const contract = this.getReader();
    const balance = (await contract.balanceOf(owner)) as bigint;

    const tokens: OnChainDiploma[] = [];
    for (let i = 0n; i < balance; i += 1n) {
      const tokenId = (await contract.tokenOfOwnerByIndex(owner, i)) as bigint;
      tokens.push(await this.getDiploma(tokenId));
    }
    return tokens;
  }

  async mint(to: string, tokenId: string | bigint, uri: string): Promise<MintOnChainResult> {
    if (!isAddress(to)) {
      throw new ValidationError("Alamat wallet alumni tidak valid");
    }
    const { contract, signer } = this.getWriter();
    const tx = await contract.safeMintSBT(getAddress(to), BigInt(tokenId), uri);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new ServiceUnavailableError("Transaksi minting gagal on-chain");
    }
    return { txHash: receipt.hash as string, issuerAddress: signer.address };
  }

  async revoke(tokenId: string | bigint): Promise<{ txHash: string }> {
    const { contract } = this.getWriter();
    const tx = await contract.revokeDiploma(BigInt(tokenId));
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new ServiceUnavailableError("Transaksi revoke gagal on-chain");
    }
    return { txHash: receipt.hash as string };
  }

  async registerIssuer(issuer: string): Promise<{ txHash: string }> {
    if (!isAddress(issuer)) {
      throw new ValidationError("Alamat issuer tidak valid");
    }
    const { contract } = this.getWriter();
    const tx = await contract.registerIssuer(getAddress(issuer));
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) {
      throw new ServiceUnavailableError("Transaksi register issuer gagal");
    }
    return { txHash: receipt.hash as string };
  }

  async isRegisteredIssuer(issuer: string): Promise<boolean> {
    if (!isAddress(issuer)) {
      throw new ValidationError("Alamat issuer tidak valid");
    }
    const contract = this.getReader();
    return Boolean(await contract.isRegisteredIssuer(issuer));
  }
}
