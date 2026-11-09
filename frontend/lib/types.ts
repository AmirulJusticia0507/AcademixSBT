export interface DiplomaPayload {
  certificate_number: string;
  document_hash: string;
  document_file_name?: string;
  institution_code?: string;
  institution_name?: string;
  nim?: string;
  full_name?: string;
  study_program?: string;
  degree?: string;
  graduation_date?: string;
  issued_at?: string;
  schema?: string;
}

export interface DiplomaMetadata {
  name: string;
  description?: string;
  external_url?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  diploma: DiplomaPayload;
}

export interface OnChainDiploma {
  tokenId: string;
  owner: string;
  issuer: string;
  tokenUri: string;
  locked: boolean;
  revoked: boolean;
  mintedAt: string | null;
}

export interface VerifiedDiploma extends OnChainDiploma {
  found: true;
  metadata: DiplomaMetadata | null;
  metadataError?: string;
}

export interface WalletResult {
  wallet: string;
  count: number;
  tokens: VerifiedDiploma[];
}
