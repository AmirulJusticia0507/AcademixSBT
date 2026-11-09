import { mintDiplomaSchema, type MintDiplomaBody } from "../lib/validation";
import { validateEligibility } from "./eligibility";

/**
 * Tool migrasi/input massal dari CSV kampus (P2).
 * Hanya VALIDASI (dry-run): tidak melakukan minting massal otomatis,
 * agar operator dapat memeriksa laporan per-baris terlebih dahulu.
 * Kolom CSV harus sesuai nama field mintDiplomaSchema (snake_case juga diterima).
 */

export interface CsvRowReport {
  row: number; // nomor baris di file (header = 1)
  ok: boolean;
  data?: MintDiplomaBody;
  errors: string[];
  eligible?: boolean;
  failedCodes?: string[];
}

export interface CsvImportReport {
  total: number;
  valid: number;
  invalid: number;
  rows: CsvRowReport[];
}

const HEADER_ALIASES: Record<string, string> = {
  token_id: "tokenId",
  wallet_address: "walletAddress",
  certificate_number: "certificateNumber",
  institution_code: "institutionCode",
  institution_name: "institutionName",
  study_program: "studyProgram",
  full_name: "fullName",
  graduation_date: "graduationDate",
  accreditation_status: "accreditationStatus",
  graduation_status: "graduationStatus",
  study_duration_years: "studyDurationYears",
  max_study_duration_years: "maxStudyDurationYears",
  credits_earned: "creditsEarned",
  min_credits: "minCredits",
  min_gpa: "minGpa",
  passport_number: "passportNumber",
  active_reported: "activeReported",
  exception_approved: "exceptionApproved",
  exception_reason: "exceptionReason",
  verification_mode: "verificationMode",
  manual_verification_type: "manualVerificationType",
  manual_verifier: "manualVerifier",
  manual_verification_reason: "manualVerificationReason",
};

/** Parser CSV sederhana: dukung kutip, koma di dalam kutip, dan CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export function validateCsvImport(csvText: string): CsvImportReport {
  const parsed = parseCsv(csvText);
  if (parsed.length < 2) {
    return { total: 0, valid: 0, invalid: 0, rows: [] };
  }

  const headers = parsed[0].map((h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim());
  const reports: CsvRowReport[] = [];

  for (let i = 1; i < parsed.length; i++) {
    const values = parsed[i];
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => { record[h] = (values[idx] ?? "").trim(); });

    // Hapus field kosong agar .optional() bekerja
    for (const key of Object.keys(record)) {
      if (record[key] === "") delete record[key];
    }

    const result = mintDiplomaSchema.safeParse(record);
    if (!result.success) {
      reports.push({
        row: i + 1,
        ok: false,
        errors: result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`),
      });
      continue;
    }

    const eligibility = validateEligibility(result.data);
    reports.push({
      row: i + 1,
      ok: eligibility.eligible,
      data: result.data,
      errors: eligibility.eligible ? [] : eligibility.checks.filter((c) => !c.passed).map((c) => `${c.code}: ${c.reason}`),
      eligible: eligibility.eligible,
      failedCodes: eligibility.failedCodes,
    });
  }

  const valid = reports.filter((r) => r.ok).length;
  return { total: reports.length, valid, invalid: reports.length - valid, rows: reports };
}

export const CSV_TEMPLATE =
  "token_id,wallet_address,certificate_number,institution_code,institution_name,nim,full_name,study_program,degree,graduation_date,accreditation_status,graduation_status,study_duration_years,credits_earned,gpa,nik,active_reported\n" +
  "1,0x00000000000000000000000000000000000000A1,IJZ-2026-001,UNIV-01,Universitas Contoh,20210001,Budi Santoso,Teknik Informatika,S.Kom,2026-08-01,Unggul,Lulus,4,150,3.5,3201234567890001,true\n";
