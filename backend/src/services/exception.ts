import { NotFoundError, ValidationError } from "../lib/errors";
import {
  describeMissingDocuments,
  missingRequiredDocumentTypes,
  type ExceptionApproval,
  type ExceptionApprovalStatus,
  type ExceptionDocumentType,
} from "../lib/exceptionDocuments";
import type { DocumentArchive } from "./documentArchive";

export const MAX_EXCEPTION_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_EXCEPTION_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

export interface ExceptionDocumentRecord {
  id: string;
  certificateNumber: string;
  tokenId: string | null;
  documentType: ExceptionDocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentHash: string;
  archiveId: string;
  note: string | null;
  approvalStatus: ExceptionApprovalStatus;
  uploadedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface SaveExceptionDocumentInput {
  certificateNumber: string;
  documentType: ExceptionDocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentHash: string;
  archiveId: string;
  note?: string;
  uploadedBy: string;
}

export interface ExceptionStatusUpdate {
  status: "approved" | "rejected";
  actor: string;
  rejectionReason?: string;
}

export interface ExceptionStore {
  addDocument(input: SaveExceptionDocumentInput): Promise<ExceptionDocumentRecord>;
  listByCertificateNumber(certificateNumber: string): Promise<ExceptionDocumentRecord[]>;
  updateStatus(certificateNumber: string, update: ExceptionStatusUpdate): Promise<void>;
}

export interface ExceptionCase {
  certificateNumber: string;
  tokenId: string | null;
  status: ExceptionApprovalStatus;
  requiredComplete: boolean;
  missingDocuments: ExceptionDocumentType[];
  canMintWithException: boolean;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  documents: ExceptionDocumentRecord[];
}

export interface UploadExceptionDocumentInput {
  certificateNumber: string;
  documentType: ExceptionDocumentType;
  fileName: string;
  mimeType: string;
  content: Buffer;
  note?: string;
  uploadedBy: string;
}

/**
 * Alur eksepsi (P1): dokumen pendukung + persetujuan pimpinan PT.
 *
 * Status case diturunkan dari seluruh dokumen:
 * - rejected bila ada dokumen ditolak,
 * - approved bila semua dokumen approved DAN dokumen wajib lengkap,
 * - pending selain itu.
 */
export class ExceptionService {
  constructor(
    private readonly store: ExceptionStore,
    private readonly archive: DocumentArchive,
  ) {}

  async uploadDocument(input: UploadExceptionDocumentInput): Promise<ExceptionDocumentRecord> {
    if (input.content.length === 0) {
      throw new ValidationError("Berkas dokumen pendukung wajib diunggah");
    }
    if (input.content.length > MAX_EXCEPTION_DOCUMENT_BYTES) {
      throw new ValidationError("Ukuran dokumen pendukung maksimal 10 MB");
    }
    if (!ALLOWED_EXCEPTION_MIME_TYPES.has(input.mimeType)) {
      throw new ValidationError("Dokumen pendukung harus PDF, PNG, atau JPEG");
    }

    const archived = await this.archive.save(input.content, input.fileName);

    return this.store.addDocument({
      certificateNumber: input.certificateNumber,
      documentType: input.documentType,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: archived.sizeBytes,
      documentHash: archived.documentHash,
      archiveId: archived.archiveId,
      note: input.note,
      uploadedBy: input.uploadedBy,
    });
  }

  async getCase(certificateNumber: string): Promise<ExceptionCase> {
    const documents = await this.store.listByCertificateNumber(certificateNumber);
    if (documents.length === 0) {
      throw new NotFoundError(
        `Belum ada dokumen eksepsi untuk nomor ijazah ${certificateNumber}`,
      );
    }

    const missingDocuments = missingRequiredDocumentTypes(
      documents.map((document) => document.documentType),
    );
    const allApproved = documents.every(
      (document) => document.approvalStatus === "approved",
    );
    const rejectedDocument = documents.find(
      (document) => document.approvalStatus === "rejected",
    );
    const status: ExceptionApprovalStatus = rejectedDocument
      ? "rejected"
      : allApproved
        ? "approved"
        : "pending";
    const approvedDocument = documents.find((document) => document.approvedBy);

    return {
      certificateNumber,
      tokenId: documents.find((document) => document.tokenId)?.tokenId ?? null,
      status,
      requiredComplete: missingDocuments.length === 0,
      missingDocuments,
      canMintWithException: status === "approved" && missingDocuments.length === 0,
      approvedBy: approvedDocument?.approvedBy ?? null,
      approvedAt: approvedDocument?.approvedAt ?? null,
      rejectionReason: rejectedDocument?.rejectionReason ?? null,
      documents,
    };
  }

  async approve(certificateNumber: string, approver: string): Promise<ExceptionCase> {
    const current = await this.getCase(certificateNumber);
    if (current.missingDocuments.length > 0) {
      throw new ValidationError(describeMissingDocuments(current.missingDocuments), {
        missingDocuments: current.missingDocuments,
      });
    }

    await this.store.updateStatus(certificateNumber, {
      status: "approved",
      actor: approver,
    });
    return this.getCase(certificateNumber);
  }

  async reject(
    certificateNumber: string,
    reason: string,
    actor: string,
  ): Promise<ExceptionCase> {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new ValidationError("Alasan penolakan wajib diisi");
    }

    await this.getCase(certificateNumber);
    await this.store.updateStatus(certificateNumber, {
      status: "rejected",
      actor,
      rejectionReason: trimmedReason,
    });
    return this.getCase(certificateNumber);
  }

  /** Dipakai pre-mint: hanya true jika dokumen lengkap & disetujui pimpinan PT. */
  async findApproval(certificateNumber: string): Promise<ExceptionApproval> {
    const documents = await this.store.listByCertificateNumber(certificateNumber);
    const documentTypes = Array.from(
      new Set(documents.map((document) => document.documentType)),
    );
    const missingDocuments = missingRequiredDocumentTypes(documentTypes);
    const approvedDocument = documents.find((document) => document.approvedBy);

    return {
      approved:
        documents.length > 0 &&
        missingDocuments.length === 0 &&
        documents.every((document) => document.approvalStatus === "approved"),
      documentTypes,
      missingDocuments,
      approvedBy: approvedDocument?.approvedBy ?? null,
      approvedAt: approvedDocument?.approvedAt ?? null,
    };
  }
}
