import { describe, expect, it } from "vitest";
import { buildDiplomaMetadata } from "../src/lib/metadata";
import type { DiplomaMetadataInput } from "../src/types";

const input: DiplomaMetadataInput = {
  certificateNumber: "IJZ-2026-001",
  institutionCode: "UNIV-01",
  institutionName: "Universitas Contoh",
  nim: "20210001",
  fullName: "Budi Santoso",
  studyProgram: "Teknik Informatika",
  degree: "S.Kom",
  graduationDate: "2026-08-01",
  documentHash: `sha256:${"a".repeat(64)}`,
  documentFileName: "ijazah.pdf",
  issuedAt: "2026-11-09T00:00:00.000Z",
};

describe("buildDiplomaMetadata", () => {
  it("membangun metadata ERC-721 + payload ijazah", () => {
    const metadata = buildDiplomaMetadata(input);

    expect(metadata.name).toContain("Budi Santoso");
    expect(metadata.diploma.schema).toBe("academixsbt/diploma/v1");
    expect(metadata.diploma.document_hash).toBe(input.documentHash);
    expect(metadata.diploma.certificate_number).toBe(input.certificateNumber);
    expect(metadata.attributes).toEqual(
      expect.arrayContaining([
        { trait_type: "NIM", value: "20210001" },
        { trait_type: "SHA-256 Dokumen", value: input.documentHash },
        { trait_type: "Tanggal Lulus", value: "2026-08-01" },
      ]),
    );
  });

  it("tidak menambahkan atribut tanggal lulus jika kosong", () => {
    const metadata = buildDiplomaMetadata({ ...input, graduationDate: undefined });
    expect(metadata.diploma.graduation_date).toBeUndefined();
    expect(metadata.attributes.some((item) => item.trait_type === "Tanggal Lulus")).toBe(false);
  });
});
