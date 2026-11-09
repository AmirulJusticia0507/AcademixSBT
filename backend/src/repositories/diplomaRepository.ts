import type { PoolClient } from "pg";
import type { Database } from "../db";
import type { DiplomaRecord, MintedDiploma } from "../types";

interface DiplomaRow {
  token_id: string;
  wallet_address: string;
  certificate_number: string;
  ipfs_cid: string;
  token_uri: string;
  document_hash: string;
  tx_hash: string;
  is_revoked: boolean;
  minted_at: Date;
  revoked_at: Date | null;
}

function mapDiploma(row: DiplomaRow): DiplomaRecord {
  return {
    tokenId: row.token_id,
    walletAddress: row.wallet_address,
    certificateNumber: row.certificate_number,
    ipfsCid: row.ipfs_cid,
    tokenUri: row.token_uri,
    documentHash: row.document_hash,
    txHash: row.tx_hash,
    isRevoked: row.is_revoked,
    mintedAt: row.minted_at.toISOString(),
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
  };
}

export interface SaveMintedDiplomaInput {
  minted: MintedDiploma;
  institution: {
    code: string;
    name: string;
    walletAddress: string;
  };
  graduate: {
    nim: string;
    fullName: string;
    studyProgram: string;
    degree: string;
    walletAddress: string;
  };
}

export class DiplomaRepository {
  constructor(private readonly db: Database) {}

  async saveMinted(input: SaveMintedDiplomaInput): Promise<void> {
    const { minted, institution, graduate } = input;

    await this.db.transaction(async (client) => {
      const institutionId = await this.upsertInstitution(client, institution);
      const graduateId = await this.upsertGraduate(client, graduate, institutionId);

      await client.query(
        `INSERT INTO diploma_tokens
           (graduate_id, institution_id, token_id, ipfs_cid, token_uri, document_hash,
            tx_hash, certificate_number, issuer_address, is_revoked, minted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, $10)`,
        [
          graduateId,
          institutionId,
          minted.tokenId,
          minted.ipfsCid,
          minted.tokenUri,
          minted.documentHash,
          minted.txHash,
          minted.certificateNumber,
          minted.issuerAddress,
          minted.mintedAt,
        ],
      );

      await this.insertAuditLog(client, {
        actor: minted.issuerAddress,
        action: "DIPLOMA_MINTED",
        entityType: "diploma_token",
        entityId: minted.tokenId,
        metadata: {
          ipfsCid: minted.ipfsCid,
          txHash: minted.txHash,
          certificateNumber: minted.certificateNumber,
          walletAddress: minted.walletAddress,
        },
      });
    });
  }

  private async upsertInstitution(
    client: PoolClient,
    institution: SaveMintedDiplomaInput["institution"],
  ): Promise<string> {
    const rows = await client.query<{ id: string }>(
      `INSERT INTO institutions (code, name, wallet_address)
       VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [institution.code, institution.name, institution.walletAddress.toLowerCase()],
    );
    return rows.rows[0].id;
  }

  private async upsertGraduate(
    client: PoolClient,
    graduate: SaveMintedDiplomaInput["graduate"],
    institutionId: string,
  ): Promise<string> {
    const rows = await client.query<{ id: string }>(
      `INSERT INTO graduates (nim, full_name, study_program, degree, wallet_address, institution_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (nim) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         study_program = EXCLUDED.study_program,
         degree = EXCLUDED.degree,
         wallet_address = EXCLUDED.wallet_address,
         institution_id = EXCLUDED.institution_id
       RETURNING id`,
      [
        graduate.nim,
        graduate.fullName,
        graduate.studyProgram,
        graduate.degree,
        graduate.walletAddress.toLowerCase(),
        institutionId,
      ],
    );
    return rows.rows[0].id;
  }

  async findByTokenId(tokenId: string): Promise<DiplomaRecord | null> {
    const rows = await this.db.query<DiplomaRow>(
      `SELECT d.token_id, g.wallet_address, d.certificate_number, d.ipfs_cid, d.token_uri,
              d.document_hash, d.tx_hash, d.is_revoked, d.minted_at, d.revoked_at
       FROM diploma_tokens d
       JOIN graduates g ON g.id = d.graduate_id
       WHERE d.token_id = $1`,
      [tokenId],
    );
    return rows[0] ? mapDiploma(rows[0]) : null;
  }

  async findByCertificateNumber(certificateNumber: string): Promise<DiplomaRecord | null> {
    const rows = await this.db.query<DiplomaRow>(
      `SELECT d.token_id, g.wallet_address, d.certificate_number, d.ipfs_cid, d.token_uri,
              d.document_hash, d.tx_hash, d.is_revoked, d.minted_at, d.revoked_at
       FROM diploma_tokens d
       JOIN graduates g ON g.id = d.graduate_id
       WHERE d.certificate_number = $1`,
      [certificateNumber],
    );
    return rows[0] ? mapDiploma(rows[0]) : null;
  }

  async markRevoked(tokenId: string, actor: string, txHash: string): Promise<void> {
    await this.db.transaction(async (client) => {
      const result = await client.query(
        `UPDATE diploma_tokens
         SET is_revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
         WHERE token_id = $1`,
        [tokenId],
      );
      if (result.rowCount === 0) {
        return;
      }
      await this.insertAuditLog(client, {
        actor,
        action: "DIPLOMA_REVOKED",
        entityType: "diploma_token",
        entityId: tokenId,
        metadata: { txHash },
      });
    });
  }

  async insertAuditLog(
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

  async listAuditLogs(limit = 50): Promise<
    Array<{
      id: string;
      actor: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown>;
      createdAt: string;
    }>
  > {
    const rows = await this.db.query<{
      id: string;
      actor: string;
      action: string;
      entity_type: string;
      entity_id: string;
      metadata: Record<string, unknown>;
      created_at: Date;
    }>(
      `SELECT id, actor, action, entity_type, entity_id, metadata, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );

    return rows.map((row) => ({
      id: row.id,
      actor: row.actor,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata,
      createdAt: row.created_at.toISOString(),
    }));
  }
}
