import express, { type Express, type Request, type Response } from "express";
import multer from "multer";
import type { AppConfig } from "./config";
import type { Database } from "./db";
import { asyncHandler } from "./lib/asyncHandler";
import { hashesMatch, hashDocument } from "./lib/hash";
import { NotFoundError, ValidationError } from "./lib/errors";
import {
  auditQuerySchema,
  batchVerifySchema,
  issuerSchema,
  mintDiplomaSchema,
  tokenIdParamSchema,
  walletParamSchema,
} from "./lib/validation";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requireApiKey, requireVerifierApiKey } from "./middleware/auth";
import { rateLimit } from "./middleware/rateLimit";
import { resolveRole } from "./middleware/rbac";
import type { DiplomaRepository } from "./repositories/diplomaRepository";
import type { DiplomaService } from "./services/diploma";
import type { IpfsProvider } from "./services/ipfs";
import type { VerificationService } from "./services/verification";
import { validateEligibility } from "./services/eligibility";
import type { DiplomaRecord } from "./types";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface ChainRoutes {
  getChainInfo(): Promise<{ chainId: number; blockNumber: number; contractAddress: string }>;
  registerIssuer(issuer: string): Promise<{ txHash: string }>;
  isRegisteredIssuer(issuer: string): Promise<boolean>;
}

export interface AuditRepository {
  findByTokenId(tokenId: string): Promise<DiplomaRecord | null>;
  listAuditLogs(limit?: number): Promise<
    Array<{
      id: string;
      actor: string;
      action: string;
      entityType: string;
      entityId: string;
      metadata: Record<string, unknown>;
      createdAt: string;
    }>
  >;
}

export interface AppDependencies {
  config: AppConfig;
  db: Pick<Database, "healthCheck">;
  repo: AuditRepository;
  ipfs: IpfsProvider;
  chain: ChainRoutes;
  verification: VerificationService;
  diploma: DiplomaService;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    const isPdf =
      file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      callback(new ValidationError("Berkas ijazah harus PDF"));
      return;
    }
    callback(null, true);
  },
});

function requireFile(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) {
    throw new ValidationError('Berkas ijazah wajib diunggah pada field "document"');
  }
  return file;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();
  const writeAuth = requireApiKey(deps.config.adminApiKey);
  const verifierAuth = requireVerifierApiKey(deps.config.verifierApiKey ?? "", deps.config.adminApiKey);

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  // Rate limit global (PoC in-memory) — endpoint publik & HRD
  app.use(rateLimit({ windowMs: 60_000, max: 120 }));
  // RBAC: tandai role per request (admin / verifier / public)
  app.use(resolveRole(deps.config.adminApiKey, deps.config.verifierApiKey));

  const health = asyncHandler(async (_req: Request, res: Response) => {
    const [dbOk, chainInfo] = await Promise.all([
      deps.db.healthCheck(),
      deps.chain.getChainInfo().catch(() => null),
    ]);

    // Verifikasi publik (on-chain + IPFS) tetap jalan walau DB down:
    // status "degraded" di sini tidak berarti portal verifikasi mati.
    const verificationAvailable = Boolean(chainInfo);
    res.json({
      status: dbOk && chainInfo ? "ok" : "degraded",
      service: "academixsbt-backend",
      uptimeSeconds: Math.round(process.uptime()),
      checks: {
        database: dbOk ? "up" : "down",
        blockchain: chainInfo ? "up" : "down",
        ipfs: "up",
      },
      verificationAvailable,
      chain: chainInfo,
      ipfsProvider: deps.ipfs.kind,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (_req, res) => {
    res.json({
      name: "AcademixSBT API",
      version: "0.1.0",
      docs: {
        health: "/api/health",
        verifyToken: "/api/verify/:tokenId",
        verifyWallet: "/api/verify/wallet/:address",
        validateEligibility: "POST /api/diplomas/validate",
      },
    });
  });
  app.get("/health", health);
  app.get("/healthz", health);
  app.get("/api/health", health);

  app.get("/api/config", (_req, res) => {
    res.json({
      chainId: deps.config.chainId,
      contractAddress: deps.config.contractAddress,
      ipfsGateway: deps.config.ipfsGateway,
      publicApiUrl: deps.config.publicApiUrl,
    });
  });

  // ===== Public verification (read-only) =====
  app.get(
    "/api/verify/:tokenId",
    asyncHandler(async (req, res) => {
      const { tokenId } = tokenIdParamSchema.parse(req.params);
      try {
        const result = await deps.verification.verifyToken(tokenId);
        res.json(result);
      } catch (error) {
        if (error instanceof NotFoundError) {
          res.status(404).json({ found: false, tokenId, message: error.message });
          return;
        }
        throw error;
      }
    }),
  );

  // Batch verification untuk HRD (maks 50 Token ID/request)
  app.post(
    "/api/verify/batch",
    verifierAuth,
    asyncHandler(async (req, res) => {
      const { tokenIds } = batchVerifySchema.parse(req.body);
      const results = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const verification = await deps.verification.verifyToken(tokenId);
            return {
              tokenId,
              found: true,
              valid: Boolean(verification.locked && !verification.revoked),
              locked: verification.locked,
              revoked: verification.revoked,
              owner: verification.owner,
              issuer: verification.issuer,
              metadata: verification.metadata,
            };
          } catch (error) {
            return {
              tokenId,
              found: false,
              valid: false,
              message: error instanceof Error ? error.message : "Tidak ditemukan",
            };
          }
        }),
      );
      res.json({ count: results.length, results });
    }),
  );

  // Bukti verifikasi (proof bundle JSON bertanda waktu)
  app.get(
    "/api/verify/:tokenId/proof",
    asyncHandler(async (req, res) => {
      const { tokenId } = tokenIdParamSchema.parse(req.params);
      try {
        const verification = await deps.verification.verifyToken(tokenId);
        const valid = Boolean(verification.locked && !verification.revoked);
        res.json({
          proofVersion: "academixsbt/proof/v1",
          tokenId,
          valid,
          exportedAt: new Date().toISOString(),
          chain: {
            owner: verification.owner,
            issuer: verification.issuer,
            tokenUri: verification.tokenUri,
            locked: verification.locked,
            revoked: verification.revoked,
            mintedAt: verification.mintedAt,
          },
          metadata: verification.metadata,
          metadataError: verification.metadataError ?? null,
          disclaimer:
            "Bukti ini adalah hasil query on-chain + IPFS pada waktu exportedAt. Verifikasi ulang untuk status terbaru.",
        });
      } catch (error) {
        if (error instanceof NotFoundError) {
          res.status(404).json({ found: false, tokenId, message: error.message });
          return;
        }
        throw error;
      }
    }),
  );

  app.get(
    "/api/verify/wallet/:address",
    asyncHandler(async (req, res) => {
      const { address } = walletParamSchema.parse(req.params);
      const tokens = await deps.verification.verifyWallet(address);
      res.json({ wallet: address, count: tokens.length, tokens });
    }),
  );

  app.post(
    "/api/verify/:tokenId/document",
    upload.single("document"),
    asyncHandler(async (req, res) => {
      const { tokenId } = tokenIdParamSchema.parse(req.params);
      const file = requireFile(req.file);

      const verification = await deps.verification.verifyToken(tokenId);
      if (!verification.metadata) {
        throw new ValidationError("Metadata ijazah tidak tersedia untuk dibandingkan", {
          metadataError: verification.metadataError,
        });
      }

      const expectedHash = verification.metadata.diploma.document_hash;
      const actualHash = hashDocument(file.buffer);

      res.json({
        tokenId,
        matches: hashesMatch(expectedHash, actualHash),
        expectedHash,
        actualHash,
        fileName: file.originalname,
      });
    }),
  );

  // Proxy metadata IPFS: dipakai portal saat provider lokal / gateway lambat.
  app.get(
    "/api/ipfs/:cid",
    asyncHandler(async (req, res) => {
      const cid = req.params.cid;
      if (!/^[a-zA-Z0-9._-]+$/.test(cid)) {
        throw new ValidationError("CID tidak valid");
      }
      const metadata = await deps.ipfs.readJson(cid);
      res.json(metadata);
    }),
  );

  // ===== Institution / admin (API key) =====
  // Cek eligibility ala PISN tanpa minting (memberi laporan per-validator).
  app.post(
    "/api/diplomas/validate",
    writeAuth,
    asyncHandler(async (req, res) => {
      const body = mintDiplomaSchema.parse(req.body);
      res.json(validateEligibility(body));
    }),
  );

  app.post(
    "/api/diplomas",
    writeAuth,
    upload.single("document"),
    asyncHandler(async (req, res) => {
      const body = mintDiplomaSchema.parse(req.body);
      const file = requireFile(req.file);

      const minted = await deps.diploma.mint({
        ...body,
        document: file.buffer,
        documentFileName: file.originalname,
        documentMimeType: file.mimetype,
        actor: deps.config.issuerAddress ?? "api-key",
      });

      res.status(201).json(minted);
    }),
  );

  app.post(
    "/api/diplomas/:tokenId/revoke",
    writeAuth,
    asyncHandler(async (req, res) => {
      const { tokenId } = tokenIdParamSchema.parse(req.params);
      const actor = deps.config.issuerAddress ?? "api-key";
      const result = await deps.diploma.revoke(tokenId, actor);
      res.json({ ...result, isRevoked: true });
    }),
  );

  app.get(
    "/api/diplomas/:tokenId",
    writeAuth,
    asyncHandler(async (req, res) => {
      const { tokenId } = tokenIdParamSchema.parse(req.params);
      const record = await deps.repo.findByTokenId(tokenId);
      if (!record) {
        throw new NotFoundError(`Token ID ${tokenId} tidak tercatat di database`);
      }
      res.json(record);
    }),
  );

  app.post(
    "/api/issuers",
    writeAuth,
    asyncHandler(async (req, res) => {
      const { issuer } = issuerSchema.parse(req.body);
      const result = await deps.chain.registerIssuer(issuer);
      res.status(201).json({ issuer, ...result });
    }),
  );

  app.get(
    "/api/issuers/:address",
    asyncHandler(async (req, res) => {
      const { address } = walletParamSchema.parse(req.params);
      res.json({ issuer: address, registered: await deps.chain.isRegisteredIssuer(address) });
    }),
  );

  app.get(
    "/api/audit-logs",
    writeAuth,
    asyncHandler(async (req, res) => {
      const { limit } = auditQuerySchema.parse(req.query);
      res.json({ logs: await deps.repo.listAuditLogs(limit) });
    }),
  );

  // OpenAPI minimal untuk HRD/instansi
  app.get("/api/openapi.json", (_req, res) => {
    res.json({
      openapi: "3.0.3",
      info: { title: "AcademixSBT Verification API", version: "0.1.0" },
      paths: {
        "/api/verify/{tokenId}": { get: { summary: "Verifikasi satu Token ID (publik)" } },
        "/api/verify/{tokenId}/proof": { get: { summary: "Bukti verifikasi JSON bertanda waktu (publik)" } },
        "/api/verify/batch": {
          post: {
            summary: "Batch verification untuk HRD (header x-api-key: verifier/admin key)",
            requestBody: { content: { "application/json": { schema: { type: "object", properties: { tokenIds: { type: "array", items: { type: "string" }, maxItems: 50 } } } } } },
          },
        },
        "/api/diplomas/validate": { post: { summary: "Cek eligibility ala PISN (admin key)" } },
        "/api/health": { get: { summary: "Health check DB + blockchain + IPFS" } },
      },
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
