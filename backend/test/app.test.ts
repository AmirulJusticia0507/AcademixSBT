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
  databaseUrl: "postgresql://localhost/test",
  rpcUrl: "http://localhost:8545",
  chainId: 80002,
  contractAddress: "0x00000000000000000000000000000000000000B2",
  privateKey: "",
  ipfsProvider: "local",
  ipfsGateway: "https://gateway.pinata.cloud/ipfs",
  localIpfsDir: "./storage/ipfs",
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
    expect(response.body.checks).toEqual({ database: "up", blockchain: "up" });
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

  it("GET /api/ipfs/:cid mengambil metadata lewat proxy", async () => {
    const response = await request(createApp(buildDeps())).get("/api/ipfs/bafy-metadata").expect(200);
    expect(response.body.diploma.certificate_number).toBe("IJZ-001");
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

  it("route tidak dikenal mengembalikan 404", async () => {
    const response = await request(createApp(buildDeps())).get("/tidak-ada").expect(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
