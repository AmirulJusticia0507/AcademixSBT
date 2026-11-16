import type { PoolClient } from "pg";
import type { Database } from "../db";
import type { ExceptionApprovalStatus, ExceptionDocumentType } from "../lib/exceptionDocuments";
import type {
  ExceptionDocumentRecord,
  ExceptionStatusUpdate,
  ExceptionStore,
  SaveExceptionDocumentInput,
} from "../services/exception";

interface ExceptionDocumentRow {
  id: string;
  certificate_number: string;
  token_id: string | null;
  document_type: ExceptionDocumentType;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  document_hash: string;
  archive_id: string;
  note: string | null;
  approval_status: ExceptionApprovalStatus;
  uploaded_by: string;
  approved_by: string | null;
  approved_at: Date | null;
  rejection_reason: string | null;
  created_at: Date;
}

const RETURNING_COLUMNS = `id, certificate_number, token_id, document_type, file_name, mime_type,
  size_bytes, document_hash, archive_id, note, approval_status, uploaded_by,
  approved_by, approved_at, rejection_reason, created_at`;

function mapExceptionDocument(row: ExceptionDocumentRow): ExceptionDocumentRecord {
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    tokenId: row.token_id,
    documentType: row.document_type,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    documentHash: row.document_hash,
    archiveId: row.archive_id,
    note: row.note,
    approvalStatus: row.approval_status,
    uploadedBy: row.uploaded_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at ? row.approved_at.toISOString() : null,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at.toISOString(),
  };
}

export class ExceptionRepository implements ExceptionStore {
  constructor(private readonly db: Database) {}

  async addDocument(input: SaveExceptionDocumentInput): Promise<ExceptionDocumentRecord> {
    return this.db.transaction(async (client) => {
      const rows = await client.query<ExceptionDocumentRow>(
        `INSERT INTO exception_documents
           (certificate_number, document_type, file_name, mime_type, size_bytes,
            document_hash, archive_id, note, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${RETURNING_COLUMNS}`,
        [
          input.certificateNumber,
          input.documentType,
          input.fileName,
          input.mimeType,
          input.sizeBytes,
          input.documentHash,
          input.archiveId,
          input.note ?? null,
          input.uploadedBy,
        ],
      );
      const document = mapExceptionDocument(rows.rows[0]);

      await this.insertAuditLog(client, {
        actor: input.uploadedBy,
        action: "EXCEPTION_DOCUMENT_UPLOADED",
        entityType: "exception_document",
        entityId: document.id,
        metadata: {
          certificateNumber: input.certificateNumber,
          documentType: input.documentType,
          documentHash: input.documentHash,
          fileName: input.fileName,
        },
      });

      return document;
    });
  }

  async listByCertificateNumber(
    certificateNumber: string,
  ): Promise<ExceptionDocumentRecord[]> {
    const rows = await this.db.query<ExceptionDocumentRow>(
      `SELECT ${RETURNING_COLUMNS}
       FROM exception_documents
       WHERE certificate_number = $1
       ORDER BY created_at ASC, id ASC`,
      [certificateNumber],
    );
    return rows.map(mapExceptionDocument);
  }

  async updateStatus(
    certificateNumber: string,
    update: ExceptionStatusUpdate,
  ): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE exception_documents
         SET approval_status = $2,
             approved_by = $3,
             approved_at = $4,
             rejection_reason = $5
         WHERE certificate_number = $1`,
        [
          certificateNumber,
          update.status,
          update.actor,
          update.status === "approved" ? new Date() : null,
          update.status === "rejected" ? (update.rejectionReason ?? null) : null,
        ],
      );

      await this.insertAuditLog(client, {
        actor: update.actor,
        action: update.status === "approved" ? "EXCEPTION_APPROVED" : "EXCEPTION_REJECTED",
        entityType: "exception_case",
        entityId: certificateNumber,
        metadata: {
          certificateNumber,
          status: update.status,
          rejectionReason: update.rejectionReason ?? null,
        },
      });
    });
  }

  private async insertAuditLog(
    client: PoolClient,
    log: {
      actor: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_logs (actor, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [log.actor, log.action, log.entityType, log.entityId, log.metadata ?? {}],
    );
  }
}
