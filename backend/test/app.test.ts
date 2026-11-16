import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDependencies } from "../src/app";
import type { AppConfig } from "../src/config";
import { NotFoundError } from "../src/lib/errors";
import { hashDocument } from "../src/lib/hash";
import type { DiplomaRecord } from "../src/types";

const PDF = Buffer.from("%PDF-1.4 dokumen ijazah");

const config: AppConfig = {
  port: 4000,
  publicApiUrl: "http://localhost:4000",
  adminApiKey: "test-key",
  corsOrigins: ["*"],
  databaseUrl: "postgresql://localhost/test",
  rpcUrl: "http://localhost:8545",
  chainId: 80002,
  contractAddress: "0x00000000000000000000000000000000000000B2",
  privateKey: "",
  ipfsProvider: "local",
  ipfsGateway: "https://gateway.pinata.cloud/ipfs",
  localIpfsDir: "./storage/ipfs",
  documentArchiveDir: "./storage/documents",
  chains: { list: () => [{ chainId: 80002, name: "Polygon Amoy", rpcUrl: "http://localhost:8545", contractAddress: "0x00000000000000000000000000000000000000B2" }], get: () => undefined, primary: () => ({ chainId: 80002, name: "Polygon Amoy", rpcUrl: "http://localhost:8545", contractAddress: "0x00000000000000000000000000000000000000B2" }), resolve: () => ({ chainId: 80002, name: "Polygon Amoy", rpcUrl: "http://localhost:8545", contractAddress: "0x00000000000000000000000000000000000000B2" }) } as any,
};

const metadata = {
  name: "Ijazah",
  attributes: [],
  diploma: {
    certificate_number: "IJZ-001",
    document_hash: hashDocument(PDF),
    full_name: "Budi",
    schema: "academixsbt/diploma/v1",
  },
};

const onChain = {
  tokenId: "1",
  owner: "0x00000000000000000000000000000000000000A1",
  issuer: "0x00000000000000000000000000000000000000B2",
  tokenUri: "ipfs://bafy-metadata",
  locked: true,
  revoked: false,
  mintedAt: "2026-11-09T00:00:00.000Z",
};

function buildDeps(overrides: Partial<AppDependencies> = {}) {
  const deps = {
    config,
    db: { healthCheck: vi.fn().mockResolvedValue(true) },
    repo: {
      findByTokenId: vi.fn().mockResolvedValue({ tokenId: "1" } as DiplomaRecord),
      listAuditLogs: vi.fn().mockResolvedValue([
        {
          id: "1",
          actor: "0xissuer",
          action: "DIPLOMA_MINTED",
          entityType: "diploma_token",
          entityId: "1",
          metadata: {},
          createdAt: new Date().toISOString(),
        },
      ]),
    },
    ipfs: {
      kind: "local" as const,
      uploadJson: vi.fn(),
      readJson: vi.fn().mockResolvedValue(metadata),
    },
    chain: {
      getChainInfo: vi.fn().mockResolvedValue({ chainId: 80002, blockNumber: 10, contractAddress: config.contractAddress }),
      registerIssuer: vi.fn().mockResolvedValue({ txHash: "0x" + "3".repeat(64) }),
      isRegisteredIssuer: vi.fn().mockResolvedValue(true),
    },
    verification: {
      verifyToken: vi.fn().mockResolvedValue({ found: true, ...onChain, metadata }),
      verifyWallet: vi.fn().mockResolvedValue([{ found: true, ...onChain, metadata }]),
    },
    diploma: {
      mint: vi.fn().mockResolvedValue({
        tokenId: "1",
        walletAddress: onChain.owner,
        certificateNumber: "IJZ-001",
        ipfsCid: "bafy-metadata",
        tokenUri: "ipfs://bafy-metadata",
        documentHash: hashDocument(PDF),
        txHash: "0x" + "4".repeat(64),
        issuerAddress: onChain.issuer,
        mintedAt: new Date().toISOString(),
      }),
      revoke: vi.fn().mockResolvedValue({ tokenId: "1", txHash: "0x" + "5".repeat(64) }),
    },
    exceptions: {
      uploadDocument: vi.fn().mockResolvedValue({
        id: "doc-1",
        certificateNumber: "IJZ-2026-001",
        tokenId: null,
        documentType: "sptjm",
        fileName: "sptjm.pdf",
        mimeType: "application/pdf",
        sizeBytes: PDF.length,
        documentHash: hashDocument(PDF),
        archiveId: "a".repeat(64) + ".pdf",
        note: null,
        approvalStatus: "pending",
        uploadedBy: "0xissuer",
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      }),
      getCase: vi.fn().mockResolvedValue({
        certificateNumber: "IJZ-2026-001",
        tokenId: null,
        status: "pending",
        requiredComplete: false,
        missingDocuments: ["sk_yudisium", "ba_sidang"],
        canMintWithException: false,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        documents: [],
      }),
      approve: vi.fn().mockResolvedValue({
        certificateNumber: "IJZ-2026-001",
        tokenId: null,
        status: "approved",
        requiredComplete: true,
        missingDocuments: [],
        canMintWithException: true,
        approvedBy: "Rektor",
        approvedAt: new Date().toISOString(),
        rejectionReason: null,
        documents: [],
      }),
      reject: vi.fn().mockResolvedValue({
        certificateNumber: "IJZ-2026-001",
        tokenId: null,
        status: "rejected",
        requiredComplete: false,
        missingDocuments: ["sptjm"],
        canMintWithException: false,
        approvedBy: null,
        approvedAt: null,
        rejectionReason: "Dokumen tidak sesuai",
        documents: [],
      }),
    },
  } as unknown as AppDependencies;

  return Object.assign(deps, overrides);
}

function mintForm(extra: Record<string, string> = {}) {
  return {
    tokenId: "1",
    walletAddress: "0x00000000000000000000000000000000000000A1",
    certificateNumber: "IJZ-2026-001",
    institutionCode: "UNIV-01",
    institutionName: "Universitas Contoh",
    nim: "20210001",
    fullName: "Budi Santoso",
    studyProgram: "Teknik Informatika",
    degree: "S.Kom",
    graduationDate: "2026-08-01",
    ...extra,
  };
}

describe("HTTP API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/health melaporkan status layanan", async () => {
    const app = createApp(buildDeps());
    const response = await request(app).get("/api/health").expect(200);

    expect(response.body.status).toBe("ok");
    expect(response.body.checks).toEqual({ database: "up", blockchain: "up", ipfs: "up" });
    expect(response.body.verificationAvailable).toBe(true);
  });

  it("GET /api/health melaporkan degraded saat blockchain down", async () => {
    const deps = buildDeps();
    deps.chain.getChainInfo = vi.fn().mockRejectedValue(new Error("rpc down"));
    const response = await request(createApp(deps)).get("/api/health").expect(200);

    expect(response.body.status).toBe("degraded");
    expect(response.body.checks.blockchain).toBe("down");
  });

  it("GET /api/config mengembalikan alamat kontrak", async () => {
    const response = await request(createApp(buildDeps())).get("/api/config").expect(200);
    expect(response.body.contractAddress).toBe(config.contractAddress);
    expect(response.body.chainId).toBe(80002);
  });

  it("mengirim header CORS agar portal bisa fetch metadata", async () => {
    const response = await request(createApp(buildDeps()))
      .get("/api/config")
      .set("Origin", "http://localhost:3000")
      .expect(200);
    expect(response.headers["access-control-allow-origin"]).toBe("*");
  });

  it("menjawab preflight OPTIONS dengan 204", async () => {
    await request(createApp(buildDeps()))
      .options("/api/verify/1")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Headers", "x-api-key")
      .expect(204);
  });

  it("GET /api/verify/:tokenId mengembalikan status ijazah", async () => {
    const response = await request(createApp(buildDeps())).get("/api/verify/1").expect(200);

    expect(response.body.found).toBe(true);
    expect(response.body.locked).toBe(true);
    expect(response.body.metadata.diploma.full_name).toBe("Budi");
  });

  it("GET /api/verify/:tokenId mengembalikan 404 dengan found:false", async () => {
    const deps = buildDeps();
    deps.verification.verifyToken = vi.fn().mockRejectedValue(new NotFoundError("tidak ada"));
    const response = await request(createApp(deps)).get("/api/verify/99").expect(404);

    expect(response.body).toMatchObject({ found: false, tokenId: "99" });
  });

  it("GET /api/verify/:tokenId menolak Token ID tidak valid", async () => {
    const response = await request(createApp(buildDeps())).get("/api/verify/abc").expect(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /api/verify/wallet/:address mengembalikan daftar token", async () => {
    const response = await request(createApp(buildDeps()))
      .get("/api/verify/wallet/0x00000000000000000000000000000000000000A1")
      .expect(200);

    expect(response.body.count).toBe(1);
    expect(response.body.tokens).toHaveLength(1);
  });

  it("POST /api/verify/:tokenId/document membandingkan hash PDF", async () => {
    const response = await request(createApp(buildDeps()))
      .post("/api/verify/1/document")
      .attach("document", PDF, "ijazah.pdf")
      .expect(200);

    expect(response.body.matches).toBe(true);
    expect(response.body.expectedHash).toBe(hashDocument(PDF));
    expect(response.body.actualHash).toBe(hashDocument(PDF));
  });

  it("POST /api/verify/:tokenId/document mendeteksi PDF berbeda", async () => {
    const response = await request(createApp(buildDeps()))
      .post("/api/verify/1/document")
      .attach("document", Buffer.from("%PDF-1.4 versi lain"), "ijazah.pdf")
      .expect(200);

    expect(response.body.matches).toBe(false);
  });

  it("POST /api/verify/batch memverifikasi banyak Token ID untuk HRD", async () => {
    const response = await request(createApp(buildDeps()))
      .post("/api/verify/batch")
      .set("x-api-key", "test-key")
      .send({ tokenIds: ["1", "2"] })
      .expect(200);
    expect(response.body.count).toBe(2);
    expect(response.body.results[0]).toMatchObject({ tokenId: "1", found: true, valid: true });
  });

  it("POST /api/verify/batch menolak tanpa API key", async () => {
    await request(createApp(buildDeps())).post("/api/verify/batch").send({ tokenIds: ["1"] }).expect(401);
  });

  it("GET /api/verify/:tokenId/proof mengembalikan proof bundle bertanda waktu", async () => {
    const response = await request(createApp(buildDeps())).get("/api/verify/1/proof").expect(200);
    expect(response.body.proofVersion).toBe("academixsbt/proof/v1");
    expect(response.body.valid).toBe(true);
    expect(response.body.chain.owner).toBe(onChain.owner);
    expect(new Date(response.body.exportedAt).toISOString()).toBe(response.body.exportedAt);
  });

  it("GET /api/openapi.json tersedia", async () => {
    const response = await request(createApp(buildDeps())).get("/api/openapi.json").expect(200);
    expect(response.body.openapi).toBe("3.0.3");
    expect(response.body.paths["/api/verify/batch"]).toBeDefined();
  });

  it("GET /api/ipfs/:cid mengambil metadata lewat proxy", async () => {
    const response = await request(createApp(buildDeps())).get("/api/ipfs/bafy-metadata").expect(200);
    expect(response.body.diploma.certificate_number).toBe("IJZ-001");
  });

  it("POST /api/diplomas/validate melaporkan tidak eligible ala PISN", async () => {
    const response = await request(createApp(buildDeps()))
      .post("/api/diplomas/validate")
      .set("x-api-key", "test-key")
      .send(mintForm({ gpa: "1.2", creditsEarned: "100" }))
      .expect(200);

    expect(response.body.eligible).toBe(false);
    expect(response.body.failedCodes).toEqual(expect.arrayContaining(["gpa", "credits"]));
  });

  it("POST /api/diplomas menolak request tanpa API key", async () => {
    const app = createApp(buildDeps());
    const response = await request(app).post("/api/diplomas").field(mintForm()).expect(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/diplomas menolak request tanpa berkas PDF", async () => {
    const app = createApp(buildDeps());
    const response = await request(app)
      .post("/api/diplomas")
      .set("x-api-key", "test-key")
      .field(mintForm())
      .expect(400);

    expect(response.body.error.message).toContain("Berkas ijazah wajib");
  });

  it("POST /api/diplomas melakukan minting end-to-end", async () => {
    const deps = buildDeps();
    const response = await request(createApp(deps))
      .post("/api/diplomas")
      .set("x-api-key", "test-key")
      .field(mintForm())
      .attach("document", PDF, "ijazah.pdf")
      .expect(201);

    expect(response.body.tokenId).toBe("1");
    expect(deps.diploma.mint).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenId: "1",
        certificateNumber: "IJZ-2026-001",
        document: PDF,
        documentFileName: "ijazah.pdf",
      }),
    );
  });

  it("POST /api/diplomas/:tokenId/revoke memanggil service revoke", async () => {
    const deps = buildDeps();
    const response = await request(createApp(deps))
      .post("/api/diplomas/1/revoke")
      .set("x-api-key", "test-key")
      .expect(200);

    expect(response.body.isRevoked).toBe(true);
    expect(deps.diploma.revoke).toHaveBeenCalledWith("1", expect.any(String));
  });

  it("GET /api/diplomas/:tokenId mengembalikan record database", async () => {
    const response = await request(createApp(buildDeps()))
      .get("/api/diplomas/1")
      .set("x-api-key", "test-key")
      .expect(200);

    expect(response.body.tokenId).toBe("1");
  });

  it("POST /api/issuers mendaftarkan issuer on-chain", async () => {
    const deps = buildDeps();
    const response = await request(createApp(deps))
      .post("/api/issuers")
      .set("x-api-key", "test-key")
      .send({ issuer: "0x00000000000000000000000000000000000000C3" })
      .expect(201);

    expect(response.body.registered).toBeUndefined();
    expect(deps.chain.registerIssuer).toHaveBeenCalled();
  });

  it("GET /api/audit-logs membutuhkan API key", async () => {
    await request(createApp(buildDeps())).get("/api/audit-logs").expect(401);
    const response = await request(createApp(buildDeps()))
      .get("/api/audit-logs?limit=10")
      .set("x-api-key", "test-key")
      .expect(200);

    expect(response.body.logs).toHaveLength(1);
  });

  it("POST /api/exceptions/:certificateNumber/documents mengunggah dokumen pendukung", async () => {
    const deps = buildDeps();
    const response = await request(createApp(deps))
      .post("/api/exceptions/IJZ-2026-001/documents")
      .set("x-api-key", "test-key")
      .field("documentType", "sptjm")
      .field("note", "SPTJM pimpinan PT")
      .attach("document", PDF, "sptjm.pdf")
      .expect(201);

    expect(response.body.documentType).toBe("sptjm");
    expect(deps.exceptions.uploadDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        certificateNumber: "IJZ-2026-001",
        documentType: "sptjm",
        fileName: "sptjm.pdf",
        content: PDF,
      }),
    );
  });

  it("POST /api/exceptions/:certificateNumber/documents menolak tipe dokumen tidak dikenal", async () => {
    const response = await request(createApp(buildDeps()))
      .post("/api/exceptions/IJZ-2026-001/documents")
      .set("x-api-key", "test-key")
      .field("documentType", "ktp")
      .attach("document", PDF, "ktp.pdf")
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/exceptions/:certificateNumber/approve membutuhkan nama pimpinan PT", async () => {
    await request(createApp(buildDeps()))
      .post("/api/exceptions/IJZ-2026-001/approve")
      .set("x-api-key", "test-key")
      .send({})
      .expect(400);

    const deps = buildDeps();
    const response = await request(createApp(deps))
      .post("/api/exceptions/IJZ-2026-001/approve")
      .set("x-api-key", "test-key")
      .send({ approver: "Rektor Universitas Contoh" })
      .expect(200);

    expect(response.body.status).toBe("approved");
    expect(deps.exceptions.approve).toHaveBeenCalledWith(
      "IJZ-2026-001",
      "Rektor Universitas Contoh",
    );
  });

  it("GET /api/exceptions/:certificateNumber mengembalikan status case", async () => {
    const response = await request(createApp(buildDeps()))
      .get("/api/exceptions/IJZ-2026-001")
      .set("x-api-key", "test-key")
      .expect(200);

    expect(response.body.status).toBe("pending");
    expect(response.body.missingDocuments).toContain("sk_yudisium");
  });

  it("POST /api/exceptions/:certificateNumber/reject mencatat alasan", async () => {
    const deps = buildDeps();
    const response = await request(createApp(deps))
      .post("/api/exceptions/IJZ-2026-001/reject")
      .set("x-api-key", "test-key")
      .send({ reason: "Dokumen tidak sesuai", approver: "Rektor" })
      .expect(200);

    expect(response.body.status).toBe("rejected");
    expect(deps.exceptions.reject).toHaveBeenCalledWith(
      "IJZ-2026-001",
      "Dokumen tidak sesuai",
      "Rektor",
    );
  });

  it("route tidak dikenal mengembalikan 404", async () => {
    const response = await request(createApp(buildDeps())).get("/tidak-ada").expect(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
