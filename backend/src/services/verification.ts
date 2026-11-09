import { z } from "zod";
import type { DiplomaMetadata, OnChainDiploma } from "../types";
import { cidFromUri, type IpfsProvider } from "./ipfs";

const metadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  attributes: z.array(z.object({ trait_type: z.string(), value: z.string() })).optional(),
  diploma: z.object({
    certificate_number: z.string().min(1),
    document_hash: z.string().regex(/^sha256:[a-f0-9]{64}$/i, "Format document_hash tidak valid"),
    document_file_name: z.string().optional(),
    institution_code: z.string().optional(),
    institution_name: z.string().optional(),
    nim: z.string().optional(),
    full_name: z.string().optional(),
    study_program: z.string().optional(),
    degree: z.string().optional(),
    graduation_date: z.string().optional(),
    issued_at: z.string().optional(),
    verification_mode: z.enum(["standard", "manual"]).optional(),
    manual_verified: z.boolean().optional(),
    manual_verification_type: z.string().optional(),
    manual_verifier: z.string().optional(),
    manual_verification_reason: z.string().optional(),
    schema: z.string().optional(),
  }),
});

export function parseDiplomaMetadata(value: unknown): DiplomaMetadata {
  const parsed = metadataSchema.parse(value);
  return parsed as DiplomaMetadata;
}

export interface ChainReader {
  getDiploma(tokenId: string): Promise<OnChainDiploma>;
  findByOwner(owner: string): Promise<OnChainDiploma[]>;
}

export interface MetadataReader {
  readJson(cid: string): Promise<unknown>;
}

export interface VerificationResult extends OnChainDiploma {
  found: true;
  metadata: DiplomaMetadata | null;
  metadataError?: string;
}

export class VerificationService {
  constructor(
    private readonly chain: ChainReader,
    private readonly ipfs: MetadataReader,
  ) {}

  async verifyToken(tokenId: string): Promise<VerificationResult> {
    const onChain = await this.chain.getDiploma(tokenId);
    const cid = cidFromUri(onChain.tokenUri);

    let metadata: DiplomaMetadata | null = null;
    let metadataError: string | undefined;

    if (cid) {
      try {
        metadata = parseDiplomaMetadata(await this.ipfs.readJson(cid));
      } catch (error) {
        metadataError = error instanceof Error ? error.message : "Metadata tidak dapat dibaca";
      }
    } else {
      metadataError = "Token URI bukan alamat IPFS yang valid";
    }

    return { found: true, ...onChain, metadata, metadataError };
  }

  async verifyWallet(address: string): Promise<VerificationResult[]> {
    const tokens = await this.chain.findByOwner(address);
    return Promise.all(tokens.map((token) => this.verifyToken(token.tokenId)));
  }
}
