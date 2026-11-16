import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hashDocument } from "../src/lib/hash";
import { NotFoundError, ValidationError } from "../src/lib/errors";
import { DocumentArchive } from "../src/services/documentArchive";
import {
  ExceptionService,
  type ExceptionDocumentRecord,
  type ExceptionStatusUpdate,
  type ExceptionStore,
  type SaveExceptionDocumentInput,
} from "../src/services/exception";

const PDF = Buffer.from("%PDF-1.4 sptjm dan sk yudisium");
const CERT = "IJZ-2026-001";

function fakeStore() {
  const documents: ExceptionDocumentRecord[] = [];

  const store: ExceptionStore = {
    addDocument: vi.fn(async (input: SaveExceptionDocumentInput) => {
      const document: ExceptionDocumentRecord = {
        ...input,
        id: `doc-${documents.length + 1}`,
        tokenId: null,
        note: input.note ?? null,
        approvalStatus: "pending",
        approvedBy: null,
        approvedAt: null,
        rejectionReason: null,
        createdAt: new Date().toISOString(),
      };
      documents.push(document);
      return document;
    }),
    listByCertificateNumber: vi.fn(async (certificateNumber: string) =>
      documents.filter((document) => document.certificateNumber === certificateNumber),
    ),
    updateStatus: vi.fn(async (certificateNumber: string, update: ExceptionStatusUpdate) => {
      for (const document of documents) {
        if (document.certificateNumber !== certificateNumber) continue;
        document.approvalStatus = update.status;
        document.approvedBy = update.actor;
        document.approvedAt =
          update.status === "approved" ? new Date().toISOString() : document.approvedAt;
        document.rejectionReason = update.rejectionReason ?? null;
      }
    }),
  };

  return { store, documents };
}

describe("ExceptionService (alur eksepsi P1)", () => {
  let dir: string;
  let service: ExceptionService;
  let store: ExceptionStore;
  let documents: ExceptionDocumentRecord[];

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "academix-exception-"));
    const fake = fakeStore();
    store = fake.store;
    documents = fake.documents;
    service = new ExceptionService(store, new DocumentArchive(dir));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function upload(documentType: "sk_yudisium" | "ba_sidang" | "sptjm") {
    return service.uploadDocument({
      certificateNumber: CERT,
      documentType,
      fileName: `${documentType}.pdf`,
      mimeType: "application/pdf",
      content: PDF,
      uploadedBy: "BAA Universitas Contoh",
    });
  }

  it("menyimpan dokumen ke arsip dan mencatat hash SHA-256", async () => {
    const document = await upload("sptjm");

    expect(document.documentHash).toBe(hashDocument(PDF));
    expect(document.approvalStatus).toBe("pending");
    expect(documents).toHaveLength(1);

    const archived = await readFile(join(dir, document.archiveId));
    expect(hashDocument(archived)).toBe(document.documentHash);
  });

  it("menolak approval jika SPTJM atau SK/BA belum lengkap", async () => {
    await upload("sptjm");

    await expect(service.approve(CERT, "Rektor")).rejects.toBeInstanceOf(ValidationError);

    const current = await service.getCase(CERT);
    expect(current.requiredComplete).toBe(false);
    expect(current.missingDocuments).toEqual(["sk_yudisium", "ba_sidang"]);
    expect(current.canMintWithException).toBe(false);
  });

  it("approve setelah SK Yudisium + SPTJM membuat case siap minting", async () => {
    await upload("sk_yudisium");
    await upload("sptjm");

    const approved = await service.approve(CERT, "Rektor Universitas Contoh");
    expect(approved.status).toBe("approved");
    expect(approved.requiredComplete).toBe(true);
    expect(approved.canMintWithException).toBe(true);
    expect(approved.approvedBy).toBe("Rektor Universitas Contoh");

    const approval = await service.findApproval(CERT);
    expect(approval.approved).toBe(true);
    expect(approval.documentTypes).toEqual(["sk_yudisium", "sptjm"]);
  });

  it("BA Sidang juga memenuhi syarat sebagai alternatif SK Yudisium", async () => {
    await upload("ba_sidang");
    await upload("sptjm");

    const approved = await service.approve(CERT, "Rektor");
    expect(approved.canMintWithException).toBe(true);
  });

  it("reject mencatat alasan dan memblokir minting eksepsi", async () => {
    await upload("sk_yudisium");
    await upload("sptjm");

    const rejected = await service.reject(CERT, "Dokumen tidak sesuai", "Rektor");
    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Dokumen tidak sesuai");
    expect(rejected.canMintWithException).toBe(false);

    const approval = await service.findApproval(CERT);
    expect(approval.approved).toBe(false);
  });

  it("menolak berkas kosong, terlalu besar, atau bukan PDF/PNG/JPEG", async () => {
    const base = {
      certificateNumber: CERT,
      documentType: "sptjm" as const,
      fileName: "sptjm.pdf",
      mimeType: "application/pdf",
      uploadedBy: "BAA",
    };

    await expect(service.uploadDocument({ ...base, content: Buffer.alloc(0) })).rejects.toBeInstanceOf(
      ValidationError,
    );
    await expect(
      service.uploadDocument({ ...base, content: Buffer.alloc(10 * 1024 * 1024 + 1) }),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      service.uploadDocument({ ...base, mimeType: "text/plain", content: PDF }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("getCase mengembalikan 404 jika belum ada dokumen", async () => {
    await expect(service.getCase(CERT)).rejects.toBeInstanceOf(NotFoundError);
  });
});
