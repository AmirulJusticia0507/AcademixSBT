/**
 * Pre-mint validator ala PISN.
 *
 * Meniru validator PISN sebelum nomor ijazah di-generate:
 * - Prodi terakreditasi
 * - Status Lulus + tanggal yudisium terisi
 * - Masa studi, minimal SKS, minimal IPK (SNDikti)
 * - Mahasiswa aktif dilaporkan pada periode tahun masuk
 * - NIK terisi (WNA: nomor paspor)
 *
 * Field eligibility bersifat opsional: hanya diperiksa jika dikirim.
 * Field dasar (tanggal lulus, dsb.) selalu diperiksa bila tersedia.
 */

export interface EligibilityInput {
  accreditationStatus?: string;
  graduationStatus?: string;
  graduationDate?: string;
  studyDurationYears?: number;
  maxStudyDurationYears?: number;
  creditsEarned?: number;
  minCredits?: number;
  gpa?: number;
  minGpa?: number;
  nik?: string;
  passportNumber?: string;
  activeReported?: boolean;
  exceptionApproved?: boolean;
  exceptionReason?: string;
}

export interface EligibilityCheck {
  code:
    | "accreditation"
    | "graduation_status"
    | "graduation_date"
    | "study_duration"
    | "credits"
    | "gpa"
    | "identity"
    | "active_reported";
  label: string;
  passed: boolean;
  reason: string;
  exceptionable: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  exceptionApplied: boolean;
  checks: EligibilityCheck[];
  failedCodes: string[];
}

const ACCREDITED = new Set([
  "terakreditasi",
  "akreditasi_baik",
  "akreditasi baik",
  "unggul",
  "baik_sekali",
  "baik sekali",
  "baik",
  "a",
  "b",
]);

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function validateEligibility(input: EligibilityInput): EligibilityResult {
  const checks: EligibilityCheck[] = [];

  if (input.accreditationStatus !== undefined) {
    const passed = ACCREDITED.has(normalize(input.accreditationStatus));
    checks.push({
      code: "accreditation",
      label: "Prodi terakreditasi",
      passed,
      reason: passed
        ? `Akreditasi "${input.accreditationStatus}" memenuhi validator`
        : `Akreditasi "${input.accreditationStatus}" tidak dikenal / tidak terakreditasi`,
      exceptionable: true,
    });
  }

  if (input.graduationStatus !== undefined) {
    const passed = normalize(input.graduationStatus) === "lulus";
    checks.push({
      code: "graduation_status",
      label: "Status mahasiswa Lulus",
      passed,
      reason: passed ? "Status Lulus terkonfirmasi" : `Status "${input.graduationStatus}" bukan Lulus`,
      exceptionable: false,
    });
  }

  if (input.graduationDate !== undefined) {
    const date = new Date(input.graduationDate);
    const valid = !Number.isNaN(date.getTime());
    const passed = valid && date.getTime() <= Date.now();
    checks.push({
      code: "graduation_date",
      label: "Tanggal lulus (yudisium) terisi & valid",
      passed,
      reason: passed
        ? `Tanggal lulus ${input.graduationDate} valid`
        : `Tanggal lulus "${input.graduationDate}" tidak valid atau di masa depan`,
      exceptionable: false,
    });
  }

  if (input.studyDurationYears !== undefined) {
    const max = input.maxStudyDurationYears ?? 7;
    const passed = input.studyDurationYears >= 0 && input.studyDurationYears <= max;
    checks.push({
      code: "study_duration",
      label: "Masa studi sesuai SNDikti",
      passed,
      reason: passed
        ? `Masa studi ${input.studyDurationYears} tahun <= maks ${max} tahun`
        : `Masa studi ${input.studyDurationYears} tahun melebihi maks ${max} tahun`,
      exceptionable: true,
    });
  }

  if (input.creditsEarned !== undefined) {
    const min = input.minCredits ?? 144;
    const passed = input.creditsEarned >= min;
    checks.push({
      code: "credits",
      label: "Minimal SKS tempuh",
      passed,
      reason: passed
        ? `SKS ${input.creditsEarned} >= minimal ${min}`
        : `SKS ${input.creditsEarned} < minimal ${min}`,
      exceptionable: false,
    });
  }

  if (input.gpa !== undefined) {
    const min = input.minGpa ?? 2.0;
    const passed = input.gpa >= min && input.gpa <= 4.0;
    checks.push({
      code: "gpa",
      label: "Minimal IPK",
      passed,
      reason: passed ? `IPK ${input.gpa} >= minimal ${min}` : `IPK ${input.gpa} tidak memenuhi minimal ${min} / di luar 0-4`,
      exceptionable: false,
    });
  }

  if (input.nik !== undefined || input.passportNumber !== undefined) {
    const nik = input.nik?.trim() ?? "";
    const passport = input.passportNumber?.trim() ?? "";
    const passed = /^\d{16}$/.test(nik) || passport.length >= 6;
    checks.push({
      code: "identity",
      label: "NIK terisi (WNA: nomor paspor)",
      passed,
      reason: passed ? "Identitas (NIK/paspor) terisi valid" : "NIK harus 16 digit atau nomor paspor minimal 6 karakter",
      exceptionable: false,
    });
  }

  if (input.activeReported !== undefined) {
    checks.push({
      code: "active_reported",
      label: "Mahasiswa aktif dilaporkan pada periode tahun masuk",
      passed: input.activeReported === true,
      reason:
        input.activeReported === true
          ? "Mahasiswa aktif dilaporkan pada periode yang sama dengan tahun masuk"
          : "Mahasiswa belum dilaporkan aktif pada periode tahun masuk",
      exceptionable: true,
    });
  }

  const failed = checks.filter((c) => !c.passed);
  const failedCodes = failed.map((c) => c.code);

  // Eksepsi hanya dapat menutup kegagalan yang exceptionable,
  // dan wajib disertai alasan (mencerminkan SPTJM + dokumen pendukung PISN).
  const exceptionApplied =
    input.exceptionApproved === true &&
    failed.length > 0 &&
    failed.every((c) => c.exceptionable) &&
    Boolean(input.exceptionReason?.trim());

  return {
    eligible: failed.length === 0 || exceptionApplied,
    exceptionApplied,
    checks,
    failedCodes: exceptionApplied ? [] : failedCodes,
  };
}
