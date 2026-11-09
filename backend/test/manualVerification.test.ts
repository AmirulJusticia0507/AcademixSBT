import { describe, expect, it } from "vitest";
import { validateEligibility } from "../src/services/eligibility";
import { buildDiplomaMetadata } from "../src/lib/metadata";

describe("verval manual P2 (legacy/foreign/closed)", () => {
  it("manual mode lolos tanpa validator PISN, asal verifier + alasan ada", () => {
    const result = validateEligibility({
      verificationMode: "manual",
      manualVerificationType: "legacy",
      manualVerifier: "BAA Universitas X",
      manualVerificationReason: "Lulusan 1998, sebelum periode PDDikti, dicek ke arsip fisik",
      accreditationStatus: "tidak-terakreditasi",
      gpa: 1.0,
    });
    expect(result.eligible).toBe(true);
    expect(result.checks[0].label).toContain("Verval manual");
  });

  it("manual mode tanpa alasan tidak eligible", () => {
    const result = validateEligibility({ verificationMode: "manual", manualVerifier: "BAA" });
    expect(result.eligible).toBe(false);
  });

  it("metadata menandai manual_verified", () => {
    const metadata = buildDiplomaMetadata({
      certificateNumber: "IJZ-LAMA-001",
      institutionCode: "UNIV-OLD",
      institutionName: "Universitas Lama (tutup)",
      nim: "19880001",
      fullName: "Alumni Lama",
      studyProgram: "Hukum",
      degree: "SH",
      documentHash: "sha256:" + "a".repeat(64),
      documentFileName: "ijazah.pdf",
      issuedAt: new Date().toISOString(),
      verificationMode: "manual",
      manualVerified: true,
      manualVerificationType: "closed_institution",
      manualVerifier: "LLDIKTI",
      manualVerificationReason: "PT tutup, verval via arsip LLDikti",
    });
    expect(metadata.diploma.manual_verified).toBe(true);
    expect(metadata.diploma.verification_mode).toBe("manual");
    expect(metadata.diploma.manual_verification_type).toBe("closed_institution");
    expect(metadata.attributes.some((a) => a.trait_type === "Verval Manual")).toBe(true);
  });
});
