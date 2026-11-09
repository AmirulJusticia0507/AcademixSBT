import { ServiceUnavailableError } from "../lib/errors";
import { validateEligibility } from "./eligibility";

/**
 * Integrasi SIAKAD kampus (P2) — adapter generik REST.
 * SIAKAD tiap kampus berbeda-beda, jadi adapter ini mengharapkan
 * endpoint JSON dengan field yang dipetakan di `mapSiakadRow`.
 * Lihat docs/SIAKAD_INTEGRATION.md untuk kontrak payload.
 */

export interface SiakadGraduate {
  nim: string;
  fullName: string;
  studyProgram: string;
  degree: string;
  walletAddress?: string;
  graduationDate?: string;
  accreditationStatus?: string;
  graduationStatus?: string;
  studyDurationYears?: number;
  creditsEarned?: number;
  gpa?: number;
  nik?: string;
  passportNumber?: string;
  activeReported?: boolean;
}

export interface SiakadProvider {
  readonly kind: "rest" | "disabled";
  fetchGraduates(institutionCode: string): Promise<SiakadGraduate[]>;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function num(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && value !== undefined && value !== null && value !== "" ? n : undefined;
}

/** Petakan satu baris JSON SIAKAD (berbagai alias field) ke format normal. */
export function mapSiakadRow(row: Record<string, unknown>): SiakadGraduate {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const v = row[key];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };
  return {
    nim: str(get("nim", "NIM", "npm", "student_id")) ?? "",
    fullName: str(get("full_name", "fullName", "nama", "name")) ?? "",
    studyProgram: str(get("study_program", "studyProgram", "prodi", "program_studi")) ?? "",
    degree: str(get("degree", "gelar", "jenjang")) ?? "",
    walletAddress: str(get("wallet_address", "walletAddress", "wallet")),
    graduationDate: str(get("graduation_date", "graduationDate", "tanggal_lulus", "yudisium")),
    accreditationStatus: str(get("accreditation_status", "accreditationStatus", "akreditasi")),
    graduationStatus: str(get("graduation_status", "graduationStatus", "status_lulus", "status")),
    studyDurationYears: num(get("study_duration_years", "studyDurationYears", "masa_studi")),
    creditsEarned: num(get("credits_earned", "creditsEarned", "sks", "total_sks")),
    gpa: num(get("gpa", "ipk", "IPK")),
    nik: str(get("nik", "NIK")),
    passportNumber: str(get("passport_number", "passportNumber", "passport")),
    activeReported: get("active_reported", "activeReported") === true || get("active_reported", "activeReported") === "true",
  };
}

export class RestSiakadProvider implements SiakadProvider {
  readonly kind = "rest" as const;
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  async fetchGraduates(institutionCode: string): Promise<SiakadGraduate[]> {
    const url = `${this.baseUrl.replace(/\/$/, "")}/graduates?institution_code=${encodeURIComponent(institutionCode)}`;
    let response: Response;
    try {
      response = await fetch(url, {
        headers: this.apiKey ? { "x-api-key": this.apiKey } : {},
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableError("SIAKAD tidak dapat dijangkau");
    }
    if (!response.ok) {
      throw new ServiceUnavailableError(`SIAKAD mengembalikan status ${response.status}`);
    }
    const json = (await response.json()) as { graduates?: unknown[] } | unknown[];
    const rows = Array.isArray(json) ? json : (json.graduates ?? []);
    return rows.map((r) => mapSiakadRow(r as Record<string, unknown>));
  }
}

export class DisabledSiakadProvider implements SiakadProvider {
  readonly kind = "disabled" as const;
  async fetchGraduates(): Promise<SiakadGraduate[]> {
    throw new ServiceUnavailableError("Integrasi SIAKAD belum dikonfigurasi (SIAKAD_API_URL kosong)");
  }
}

export function createSiakadProvider(options: { apiUrl?: string; apiKey?: string }): SiakadProvider {
  if (!options.apiUrl?.trim()) return new DisabledSiakadProvider();
  return new RestSiakadProvider(options.apiUrl, options.apiKey);
}

/** Tambahkan hasil cek eligibility per lulusan SIAKAD. */
export function withEligibility(graduates: SiakadGraduate[]) {
  return graduates.map((g) => ({
    graduate: g,
    eligibility: validateEligibility({
      accreditationStatus: g.accreditationStatus,
      graduationStatus: g.graduationStatus,
      graduationDate: g.graduationDate,
      studyDurationYears: g.studyDurationYears,
      creditsEarned: g.creditsEarned,
      gpa: g.gpa,
      nik: g.nik,
      passportNumber: g.passportNumber,
      activeReported: g.activeReported,
    }),
  }));
}
