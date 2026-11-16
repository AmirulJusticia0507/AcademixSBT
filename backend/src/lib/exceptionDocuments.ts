/**
 * Aturan dokumen pendukung untuk alur eksepsi (P1).
 *
 * Validator ala PISN boleh dilewati (`exceptionApproved=true`) hanya jika
 * pimpinan PT menyetujui dengan dokumen:
 *   - SK Yudisium ATAU BA Sidang
 *   - SPTJM
 */

export const EXCEPTION_DOCUMENT_TYPES = ["sk_yudisium", "ba_sidang", "sptjm"] as const;

export type ExceptionDocumentType = (typeof EXCEPTION_DOCUMENT_TYPES)[number];

export type ExceptionApprovalStatus = "pending" | "approved" | "rejected";

const REQUIRED_ALTERNATIVES: ExceptionDocumentType[] = ["sk_yudisium", "ba_sidang"];
const REQUIRED_ALWAYS: ExceptionDocumentType[] = ["sptjm"];

export function isExceptionDocumentType(value: string): value is ExceptionDocumentType {
  return (EXCEPTION_DOCUMENT_TYPES as readonly string[]).includes(value);
}

/**
 * Daftar tipe dokumen yang masih kurang. Jika SK Yudisium dan BA Sidang
 * sama-sama belum ada, keduanya dilaporkan agar pemanggil bisa memilih salah satu.
 */
export function missingRequiredDocumentTypes(types: Iterable<string>): ExceptionDocumentType[] {
  const present = new Set(types);
  const missing: ExceptionDocumentType[] = [];

  if (!REQUIRED_ALTERNATIVES.some((type) => present.has(type))) {
    missing.push(...REQUIRED_ALTERNATIVES);
  }
  for (const type of REQUIRED_ALWAYS) {
    if (!present.has(type)) missing.push(type);
  }

  return missing;
}

export function describeMissingDocuments(missing: ExceptionDocumentType[]): string {
  if (missing.length === 0) return "Dokumen pendukung lengkap";
  const labels = missing.map((type) => DOCUMENT_LABELS[type]);
  return `Dokumen pendukung belum lengkap: ${labels.join(" / ")}`;
}

export const DOCUMENT_LABELS: Record<ExceptionDocumentType, string> = {
  sk_yudisium: "SK Yudisium",
  ba_sidang: "BA Sidang",
  sptjm: "SPTJM",
};

export interface ExceptionApproval {
  approved: boolean;
  documentTypes: ExceptionDocumentType[];
  missingDocuments: ExceptionDocumentType[];
  approvedBy: string | null;
  approvedAt: string | null;
}
