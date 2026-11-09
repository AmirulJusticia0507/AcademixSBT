import { describe, expect, it } from "vitest";
import { mapSiakadRow, withEligibility } from "../src/services/siakad";

describe("SIAKAD adapter (P2)", () => {
  it("memetakan alias field SIAKAD ke format normal", () => {
    const g = mapSiakadRow({
      NIM: "20210001",
      nama: "Budi Santoso",
      prodi: "Teknik Informatika",
      gelar: "S.Kom",
      tanggal_lulus: "2026-08-01",
      akreditasi: "Unggul",
      status: "Lulus",
      sks: "150",
      ipk: "3.5",
      NIK: "3201234567890001",
    });
    expect(g).toMatchObject({
      nim: "20210001",
      fullName: "Budi Santoso",
      studyProgram: "Teknik Informatika",
      degree: "S.Kom",
      graduationDate: "2026-08-01",
      accreditationStatus: "Unggul",
      creditsEarned: 150,
      gpa: 3.5,
    });
  });

  it("memberi eligibility per lulusan", () => {
    const result = withEligibility([
      { nim: "1", fullName: "A", studyProgram: "TI", degree: "S.Kom", gpa: 1.0, creditsEarned: 10 },
    ]);
    expect(result[0].eligibility.eligible).toBe(false);
    expect(result[0].eligibility.failedCodes).toEqual(expect.arrayContaining(["gpa", "credits"]));
  });
});
