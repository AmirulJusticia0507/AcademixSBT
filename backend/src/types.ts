export interface DiplomaMetadataInput {
  certificateNumber: string;
  institutionCode: string;
  institutionName: string;
  nim: string;
  fullName: string;
  studyProgram: string;
  degree: string;
  graduationDate?: string;
  documentHash: string;
  documentFileName: string;
  issuedAt: string;
  verificationMode?: "standard" | "manual";
  manualVerified?: boolean;
  manualVerificationType?: string;
  manualVerifier?: string;
  manualVerificationReason?: string;
}

export interface DiplomaMetadata {
  name: string;
  description: string;
  external_url?: string;
  attributes: Array<{ trait_type: string; value: string }>;
  diploma: {
    certificate_number: string;
    document_hash: string;
    document_file_name: string;
    institution_code: string;
    institution_name: string;
    nim: string;
    full_name: string;
    study_program: string;
    degree: string;
    graduation_date?: string;
    issued_at: string;
    verification_mode?: "standard" | "manual";
    manual_verified?: boolean;
    manual_verification_type?: string;
    manual_verifier?: string;
    manual_verification_reason?: string;
    schema: "academixsbt/diploma/v1";
  };
}

export interface MintDiplomaInput {
  tokenId: string;
  walletAddress: string;
  certificateNumber: string;
  institutionCode: string;
  institutionName: string;
  nim: string;
  fullName: string;
  studyProgram: string;
  degree: string;
  graduationDate?: string;
  // Field validator ala PISN (opsional, diperiksa bila dikirim)
  accreditationStatus?: string;
  graduationStatus?: string;
  studyDurationYears?: number;
  maxStudyDurationYears?: number;
  creditsEarned?: number;
  minCredits?: number;
  gpa?: number;
  minGpa?: number;
  nik?: string;
  passportNumber?: string;
  activeReported?: boolean;
  exceptionApproved?: boolean;
  exceptionReason?: string;
  // P2: alur manual untuk lulusan lama / luar negeri / PT tutup
  verificationMode?: "standard" | "manual";
  manualVerificationType?: "legacy" | "foreign" | "closed_institution";
  manualVerifier?: string;
  manualVerificationReason?: string;
  document: Buffer;
  documentFileName: string;
  documentMimeType: string;
  actor: string;
}

export interface MintedDiploma {
  tokenId: string;
  walletAddress: string;
  certificateNumber: string;
  ipfsCid: string;
  tokenUri: string;
  documentHash: string;
  txHash: string;
  issuerAddress: string;
  mintedAt: string;
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
  metadata: DiplomaMetadata | null;
  metadataError?: string;
}

export interface DiplomaRecord {
  tokenId: string;
  walletAddress: string;
  certificateNumber: string;
  ipfsCid: string;
  tokenUri: string;
  documentHash: string;
  txHash: string;
  isRevoked: boolean;
  mintedAt: string;
  revokedAt?: string | null;
}
