import express, { type Express, type Request, type Response } from "express";
import multer from "multer";
import type { AppConfig } from "./config";
import type { Database } from "./db";
import { asyncHandler } from "./lib/asyncHandler";
import { hashesMatch, hashDocument } from "./lib/hash";
import { NotFoundError, ValidationError } from "./lib/errors";
import {
  auditQuerySchema,
  issuerSchema,
  mintDiplomaSchema,
  tokenIdParamSchema,
  walletParamSchema,
} from "./lib/validation";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requireApiKey } from "./middleware/auth";
import type { DiplomaRepository } from "./repositories/diplomaRepository";
import type { DiplomaService } from "./services/diploma";
import type { IpfsProvider } from "./services/ipfs";
import type { VerificationService } from "./services/verification";
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

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  const health = asyncHandler(async (_req: Request, res: Response) => {
    const [dbOk, chainInfo] = await Promise.all([
      deps.db.healthCheck(),
      deps.chain.getChainInfo().catch(() => null),
    ]);

    res.json({
      status: dbOk && chainInfo ? "ok" : "degraded",
      service: "academixsbt-backend",
      checks: {
        database: dbOk ? "up" : "down",
        blockchain: chainInfo ? "up" : "down",
      },
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
      },
    });
  });
  app.get("/health", health);
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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
