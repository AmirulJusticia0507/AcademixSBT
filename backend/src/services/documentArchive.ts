import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { NotFoundError } from "../lib/errors";
import { sha256Hex } from "../lib/hash";

export interface ArchivedDocument {
  archiveId: string;
  documentHash: string;
  sizeBytes: number;
}

/**
 * Arsip dokumen pendukung (SK Yudisium/BA Sidang/SPTJM).
 *
 * Dokumen TIDAK diunggah ke IPFS publik karena memuat data pribadi. Berkas
 * disimpan di disk server dengan nama deterministik berbasis SHA-256, sementara
 * hash + metadata dicatat di PostgreSQL dan audit log. Untuk production,
 * ganti implementasi ini dengan object storage terenkripsi (S3/MinIO + KMS).
 */
export class DocumentArchive {
  constructor(private readonly directory: string) {}

  private safeFileName(archiveId: string): string {
    if (!/^[a-f0-9]{64}(\.[a-z0-9]{1,10})?$/.test(archiveId)) {
      throw new NotFoundError("Dokumen arsip tidak ditemukan");
    }
    return join(resolve(this.directory), archiveId);
  }

  async save(content: Buffer, fileName: string): Promise<ArchivedDocument> {
    const hash = sha256Hex(content);
    const rawExt = extname(fileName).toLowerCase();
    const ext = /^\.[a-z0-9]{1,10}$/.test(rawExt) ? rawExt : ".bin";
    const archiveId = `${hash}${ext}`;

    await mkdir(resolve(this.directory), { recursive: true });
    await writeFile(this.safeFileName(archiveId), content);

    return {
      archiveId,
      documentHash: `sha256:${hash}`,
      sizeBytes: content.length,
    };
  }

  async read(archiveId: string): Promise<Buffer> {
    try {
      return await readFile(this.safeFileName(archiveId));
    } catch {
      throw new NotFoundError("Dokumen arsip tidak ditemukan");
    }
  }
}
