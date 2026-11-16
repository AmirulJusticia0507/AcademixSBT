/**
 * Nomor Ijazah Nasional (NINa) — format PISN.
 *
 * Sumber:
 * - PISN Kemdiktisaintek (FAQ & alur generate nomor):
 *   https://pisn.kemdiktisaintek.go.id/faq
 * - Kebijakan PISN LLDikti III (kodefikasi 21 digit):
 *   https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/12/Paparan-Kebijakan-PISN.pdf
 * - Panduan IPB (format PIN lama 15 digit):
 *   https://panduan.ipb.ac.id/docs/tata-tertib-penyelenggaraan-akademik-multistrata/kelulusan-dan-gelar-akademik/
 *
 * NINa (21 digit):
 *   kode_pt (6) + kode_ps (5) + tahun_terbit (4) + tipe (1) + no_urut (5)
 *
 * PIN lama (15 digit):
 *   kode_prodi (5) + tahun_lulus (4) + no_urut (5) + check_digit (1)
 *
 * PIN lama tidak memuat kode PT dan check digit-nya tidak dipakai NINa, sehingga
 * mapping PIN -> NINa memerlukan kode PT dari PDDikti dan hanya bersifat preview.
 * Nomor resmi tetap harus di-generate di aplikasi PISN.
 */

import { ValidationError } from "./errors";

export const NINA_LENGTH = 21;
export const LEGACY_PIN_LENGTH = 15;

export type NationalNumberType = "ijazah" | "sertifikat";

const TYPE_DIGITS: Record<NationalNumberType, string> = {
  ijazah: "1",
  sertifikat: "2",
};

const DIGIT_TO_TYPE: Record<string, NationalNumberType> = {
  "1": "ijazah",
  "2": "sertifikat",
};

export interface NationalDiplomaNumberParts {
  /** Kode perguruan tinggi PDDikti, 6 digit. */
  institutionCode: string;
  /** Kode program studi PDDikti, 5 digit. */
  studyProgramCode: string;
  /** Tahun terbit ijazah/sertifikat, 4 digit. */
  year: string;
  type: NationalNumberType;
  /** Nomor urut 5 digit. */
  sequence: string;
}

function digitsOnly(value: string): string {
  return value.replace(/\s+/g, "");
}

function assertDigits(value: string, length: number, label: string): string {
  const cleaned = digitsOnly(value);
  if (!new RegExp(`^\\d{${length}}$`).test(cleaned)) {
    throw new ValidationError(`${label} harus ${length} digit angka`);
  }
  return cleaned;
}

/** Bangun NINa 21 digit dari komponen PDDikti. */
export function buildNationalDiplomaNumber(
  parts: NationalDiplomaNumberParts,
): string {
  return [
    assertDigits(parts.institutionCode, 6, "Kode PT"),
    assertDigits(parts.studyProgramCode, 5, "Kode prodi"),
    assertDigits(parts.year, 4, "Tahun terbit"),
    TYPE_DIGITS[parts.type],
    assertDigits(parts.sequence, 5, "Nomor urut"),
  ].join("");
}

/** Parse NINa 21 digit menjadi komponennya; null bila format tidak cocok. */
export function parseNationalDiplomaNumber(
  value: string,
): NationalDiplomaNumberParts | null {
  const cleaned = digitsOnly(value);
  if (!/^\d{21}$/.test(cleaned)) return null;

  const type = DIGIT_TO_TYPE[cleaned.slice(15, 16)];
  if (!type) return null;

  return {
    institutionCode: cleaned.slice(0, 6),
    studyProgramCode: cleaned.slice(6, 11),
    year: cleaned.slice(11, 15),
    type,
    sequence: cleaned.slice(16, 21),
  };
}

export function isNationalDiplomaNumber(value: string): boolean {
  return parseNationalDiplomaNumber(value) !== null;
}

/** Pecah PIN lama 15 digit; null bila bukan 15 digit angka. */
export function parseLegacyPin(
  value: string,
): { studyProgramCode: string; year: string; sequence: string; checkDigit: string } | null {
  const cleaned = digitsOnly(value);
  if (!/^\d{15}$/.test(cleaned)) return null;

  return {
    studyProgramCode: cleaned.slice(0, 5),
    year: cleaned.slice(5, 9),
    sequence: cleaned.slice(9, 14),
    checkDigit: cleaned.slice(14, 15),
  };
}

export interface PinMappingResult {
  input: string;
  nationalDiplomaNumber: string;
  source: "nina" | "legacy_pin";
  /** true bila nomor perlu digenerate ulang di PISN untuk validasi resmi. */
  requiresPisnGeneration: boolean;
  note: string;
}

/**
 * Petakan nomor ijazah institusi/PIN lama ke NINa.
 *
 * - Input 21 digit yang valid dikembalikan apa adanya.
 * - Input PIN 15 digit dipetakan dengan menambahkan kode PT dan membuang check digit.
 * - Format lain (mis. nomor internal `IJZ-2026-0001`) tidak dapat dipetakan otomatis.
 *
 * `requiresPisnGeneration` selalu true: NINa resmi hanya terbit dari aplikasi PISN
 * dan tersinkron ke PDDikti.
 */
export function mapToNationalDiplomaNumber(
  value: string,
  context: { institutionCode: string; type?: NationalNumberType },
): PinMappingResult {
  const cleaned = digitsOnly(value);

  const parsedNina = parseNationalDiplomaNumber(cleaned);
  if (parsedNina) {
    return {
      input: value,
      nationalDiplomaNumber: cleaned,
      source: "nina",
      requiresPisnGeneration: false,
      note: "Format sudah NINa 21 digit.",
    };
  }

  const legacy = parseLegacyPin(cleaned);
  if (!legacy) {
    throw new ValidationError(
      "Nomor tidak dikenali: harus NINa 21 digit atau PIN lama 15 digit",
      { input: value },
    );
  }

  const nationalDiplomaNumber = buildNationalDiplomaNumber({
    institutionCode: context.institutionCode,
    studyProgramCode: legacy.studyProgramCode,
    year: legacy.year,
    type: context.type ?? "ijazah",
    sequence: legacy.sequence,
  });

  return {
    input: value,
    nationalDiplomaNumber,
    source: "legacy_pin",
    requiresPisnGeneration: true,
    note: `Check digit PIN "${legacy.checkDigit}" tidak dipakai NINa; verifikasi nomor resmi di aplikasi PISN sebelum dicetak.`,
  };
}
