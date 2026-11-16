import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/lib/errors";
import {
  buildNationalDiplomaNumber,
  isNationalDiplomaNumber,
  mapToNationalDiplomaNumber,
  parseLegacyPin,
  parseNationalDiplomaNumber,
} from "../src/lib/nationalDiplomaNumber";

describe("Nomor Ijazah Nasional (PISN)", () => {
  it("membangun NINa 21 digit: kode PT + prodi + tahun + tipe + no urut", () => {
    const nina = buildNationalDiplomaNumber({
      institutionCode: "001021",
      studyProgramCode: "55101",
      year: "2024",
      type: "ijazah",
      sequence: "00003",
    });

    expect(nina).toBe("001021551012024100003");
    expect(nina).toHaveLength(21);
  });

  it("tipe sertifikat memakai digit 2", () => {
    const nina = buildNationalDiplomaNumber({
      institutionCode: "001021",
      studyProgramCode: "11901",
      year: "2024",
      type: "sertifikat",
      sequence: "00001",
    });

    expect(nina).toBe("001021119012024200001");
  });

  it("parse NINa mengembalikan komponen yang benar", () => {
    expect(parseNationalDiplomaNumber("001021551012024100003")).toEqual({
      institutionCode: "001021",
      studyProgramCode: "55101",
      year: "2024",
      type: "ijazah",
      sequence: "00003",
    });
    expect(parseNationalDiplomaNumber("bukan-nomor")).toBeNull();
    expect(isNationalDiplomaNumber("001021551012024100003")).toBe(true);
  });

  it("menolak komponen yang bukan digit dengan panjang tepat", () => {
    expect(() =>
      buildNationalDiplomaNumber({
        institutionCode: "1021",
        studyProgramCode: "55101",
        year: "2024",
        type: "ijazah",
        sequence: "00001",
      }),
    ).toThrow(ValidationError);
  });

  it("memetakan PIN lama 15 digit ke NINa dengan kode PT", () => {
    const result = mapToNationalDiplomaNumber("792022017000019", {
      institutionCode: "001021",
    });

    expect(result.source).toBe("legacy_pin");
    expect(result.nationalDiplomaNumber).toBe("001021792022017100001");
    expect(result.requiresPisnGeneration).toBe(true);
    expect(result.note).toContain("Check digit");
  });

  it("PIN lama dipecah menjadi prodi, tahun, no urut, check digit", () => {
    expect(parseLegacyPin("792022017000019")).toEqual({
      studyProgramCode: "79202",
      year: "2017",
      sequence: "00001",
      checkDigit: "9",
    });
  });

  it("NINa yang sudah valid dikembalikan tanpa perubahan", () => {
    const result = mapToNationalDiplomaNumber("001021551012024100003", {
      institutionCode: "001021",
    });

    expect(result.source).toBe("nina");
    expect(result.requiresPisnGeneration).toBe(false);
    expect(result.nationalDiplomaNumber).toBe("001021551012024100003");
  });

  it("menolak nomor internal institusi yang bukan PIN/NINa", () => {
    expect(() =>
      mapToNationalDiplomaNumber("IJZ-2026-0001", { institutionCode: "001021" }),
    ).toThrow(ValidationError);
  });
});
