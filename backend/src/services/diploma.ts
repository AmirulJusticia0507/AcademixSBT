import { ConflictError, ValidationError } from "../lib/errors";
import { hashDocument } from "../lib/hash";
import { buildDiplomaMetadata } from "../lib/metadata";
import type { DiplomaMetadataInput, DiplomaRecord, MintDiplomaInput, MintedDiploma } from "../types";
import type { SaveMintedDiplomaInput } from "../repositories/diplomaRepository";
import type { IpfsProvider } from "./ipfs";
import { ipfsUri } from "./ipfs";
import { validateEligibility } from "./eligibility";
import { encryptSensitive, loadEncryptionKey } from "../lib/crypto";

export interface ChainWriter {
  mint(to: string, tokenId: string, uri: string): Promise<{ txHash: string; issuerAddress: string }>;
  revoke(tokenId: string): Promise<{ txHash: string }>;
}

export interface DiplomaStore {
  findByTokenId(tokenId: string): Promise<DiplomaRecord | null>;
  findByCertificateNumber(certificateNumber: string): Promise<DiplomaRecord | null>;
  saveMinted(input: SaveMintedDiplomaInput): Promise<void>;
  markRevoked(tokenId: string, actor: string, txHash: string): Promise<void>;
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export class DiplomaService {
  constructor(
    private readonly chain: ChainWriter,
    private readonly ipfs: IpfsProvider,
    private readonly store: DiplomaStore,
  ) {}

  async mint(input: MintDiplomaInput): Promise<MintedDiploma> {
    if (input.document.length === 0) {
      throw new ValidationError("Berkas ijazah wajib diunggah");
    }
    if (input.document.length > MAX_DOCUMENT_BYTES) {
      throw new ValidationError("Ukuran berkas ijazah maksimal 10 MB");
    }

    // Pre-mint validator ala PISN: tolak data tidak eligible sebelum minting.
    const eligibility = validateEligibility(input);
    if (!eligibility.eligible) {
      throw new ValidationError("Data tidak eligible untuk minting (validator ala PISN)", {
        failedCodes: eligibility.failedCodes,
        checks: eligibility.checks,
      });
    }

    if (await this.store.findByTokenId(input.tokenId)) {
      throw new ConflictError(`Token ID ${input.tokenId} sudah tercatat`);
    }
    if (await this.store.findByCertificateNumber(input.certificateNumber)) {
      throw new ConflictError(`Nomor ijazah ${input.certificateNumber} sudah tercatat`);
    }

    const documentHash = hashDocument(input.document);
    const issuedAt = new Date().toISOString();

    const metadataInput: DiplomaMetadataInput = {
      certificateNumber: input.certificateNumber,
      institutionCode: input.institutionCode,
      institutionName: input.institutionName,
      nim: input.nim,
      fullName: input.fullName,
      studyProgram: input.studyProgram,
      degree: input.degree,
      graduationDate: input.graduationDate,
      documentHash,
      documentFileName: input.documentFileName,
      issuedAt,
    };

    const { cid } = await this.ipfs.uploadJson(buildDiplomaMetadata(metadataInput));
    const tokenUri = ipfsUri(cid);
    const { txHash, issuerAddress } = await this.chain.mint(
      input.walletAddress,
      input.tokenId,
      tokenUri,
    );

    const minted: MintedDiploma = {
      tokenId: input.tokenId,
      walletAddress: input.walletAddress,
      certificateNumber: input.certificateNumber,
      ipfsCid: cid,
      tokenUri,
      documentHash,
      txHash,
      issuerAddress,
      mintedAt: issuedAt,
    };

    // NIK/paspor hanya disimpan terenkripsi di DB, tidak pernah on-chain/IPFS.
    const encryptionKey = loadEncryptionKey();
    const nikEncrypted = input.nik && encryptionKey ? encryptSensitive(input.nik, encryptionKey) : undefined;
    const passportEncrypted =
      input.passportNumber && encryptionKey ? encryptSensitive(input.passportNumber, encryptionKey) : undefined;

    await this.store.saveMinted({
      minted,
      institution: {
        code: input.institutionCode,
        name: input.institutionName,
        walletAddress: issuerAddress,
      },
      graduate: {
        nim: input.nim,
        fullName: input.fullName,
        studyProgram: input.studyProgram,
        degree: input.degree,
        walletAddress: input.walletAddress,
        nikEncrypted,
        passportEncrypted,
      },
    });

    return minted;
  }

  async revoke(tokenId: string, actor: string): Promise<{ tokenId: string; txHash: string }> {
    const { txHash } = await this.chain.revoke(tokenId);
    await this.store.markRevoked(tokenId, actor, txHash);
    return { tokenId, txHash };
  }
}
