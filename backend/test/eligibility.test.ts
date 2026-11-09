import { describe, expect, it } from "vitest";
import { validateEligibility } from "../src/services/eligibility";

describe("validateEligibility (ala PISN)", () => {
  it("lolos jika semua validator terpenuhi", () => {
    const result = validateEligibility({
      accreditationStatus: "Unggul",
      graduationStatus: "Lulus",
      graduationDate: "2026-08-01",
      studyDurationYears: 4,
      creditsEarned: 150,
      gpa: 3.5,
      nik: "3201234567890001",
      activeReported: true,
    });
    expect(result.eligible).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("gagal dengan laporan per-validator jika IPK & SKS kurang", () => {
    const result = validateEligibility({ creditsEarned: 100, gpa: 1.5 });
    expect(result.eligible).toBe(false);
    expect(result.failedCodes).toEqual(expect.arrayContaining(["credits", "gpa"]));
    const gpa = result.checks.find((c) => c.code === "gpa");
    expect(gpa?.reason).toContain("IPK");
  });

  it("eksepsi dapat menutup kegagalan exceptionable bila ada alasan", () => {
    const result = validateEligibility({
      studyDurationYears: 9,
      maxStudyDurationYears: 7,
      exceptionApproved: true,
      exceptionReason: "Cuti akademik disetujui, SPTJM terlampir",
    });
    expect(result.eligible).toBe(true);
    expect(result.exceptionApplied).toBe(true);
  });

  it("eksepsi TIDAK dapat menutup kegagalan non-exceptionable", () => {
    const result = validateEligibility({
      gpa: 1.0,
      exceptionApproved: true,
      exceptionReason: "mohon eksepsi",
    });
    expect(result.eligible).toBe(false);
    expect(result.failedCodes).toContain("gpa");
  });

  it("tanpa field eligibility dianggap eligible (kompatibel mundur)", () => {
    const result = validateEligibility({});
    expect(result.eligible).toBe(true);
    expect(result.checks).toHaveLength(0);
  });
});
