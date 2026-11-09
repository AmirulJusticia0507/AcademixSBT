import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Database } from "../../src/db";
import { DiplomaRepository } from "../../src/repositories/diplomaRepository";
import type { MintedDiploma } from "../../src/types";

const databaseUrl = process.env.TEST_DATABASE_URL;

/**
 * Test integrasi PostgreSQL. Jalankan dengan:
 *   TEST_DATABASE_URL=postgresql://... npm test
 * Tanpa env tersebut test ini di-skip agar `npm test` tetap jalan tanpa DB.
 */
describe.skipIf(!databaseUrl)("DiplomaRepository (PostgreSQL)", () => {
  let db: Database;
  let repo: DiplomaRepository;
  const suffix = `${Date.now()}`;
  const tokenId = `9${suffix.slice(-10)}`;
  const certificateNumber = `IT-${suffix}`;
  const nim = `NIM-${suffix}`;
  const issuer = "0x00000000000000000000000000000000000000B2";

  const minted: MintedDiploma = {
    tokenId,
    walletAddress: "0x00000000000000000000000000000000000000A1",
    certificateNumber,
    ipfsCid: "local-test-cid",
    tokenUri: "ipfs://local-test-cid",
    documentHash: `sha256:${"c".repeat(64)}`,
    txHash: `0x${"d".repeat(64)}`,
    issuerAddress: issuer,
    mintedAt: new Date().toISOString(),
  };

  beforeAll(async () => {
    db = new Database(databaseUrl!);
    repo = new DiplomaRepository(db);
  });

  afterAll(async () => {
    if (!db) return;
    await db.query("DELETE FROM diploma_tokens WHERE token_id = $1", [tokenId]);
    await db.query("DELETE FROM graduates WHERE nim = $1", [nim]);
    await db.query("DELETE FROM institutions WHERE code = $1", ["INT-TEST"]);
    await db.query("DELETE FROM audit_logs WHERE entity_id = $1", [tokenId]);
    await db.close();
  });

  it("menyimpan minting, membaca record, revoke, dan audit log", async () => {
    await repo.saveMinted({
      minted,
      institution: {
        code: "INT-TEST",
        name: "Institut Test",
        walletAddress: issuer,
      },
      graduate: {
        nim,
        fullName: "Mahasiswa Test",
        studyProgram: "Ilmu Komputer",
        degree: "S.Kom",
        walletAddress: minted.walletAddress,
      },
    });

    const saved = await repo.findByTokenId(tokenId);
    expect(saved).toMatchObject({
      tokenId,
      certificateNumber,
      ipfsCid: "local-test-cid",
      isRevoked: false,
    });

    const byCertificate = await repo.findByCertificateNumber(certificateNumber);
    expect(byCertificate?.tokenId).toBe(tokenId);

    await repo.markRevoked(tokenId, issuer, `0x${"e".repeat(64)}`);
    const revoked = await repo.findByTokenId(tokenId);
    expect(revoked?.isRevoked).toBe(true);
    expect(revoked?.revokedAt).toBeTruthy();

    const logs = await repo.listAuditLogs(20);
    expect(logs.map((log) => log.action)).toEqual(
      expect.arrayContaining(["DIPLOMA_MINTED", "DIPLOMA_REVOKED"]),
    );
  });
});
