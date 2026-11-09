import type { DiplomaMetadata, DiplomaMetadataInput } from "../types";

export function buildDiplomaMetadata(input: DiplomaMetadataInput): DiplomaMetadata {
  const attributes: Array<{ trait_type: string; value: string }> = [
    { trait_type: "Nama", value: input.fullName },
    { trait_type: "NIM", value: input.nim },
    { trait_type: "Program Studi", value: input.studyProgram },
    { trait_type: "Gelar", value: input.degree },
    { trait_type: "Institusi", value: input.institutionName },
    { trait_type: "Nomor Ijazah", value: input.certificateNumber },
    { trait_type: "SHA-256 Dokumen", value: input.documentHash },
  ];

  if (input.graduationDate) {
    attributes.push({ trait_type: "Tanggal Lulus", value: input.graduationDate });
  }

  return {
    name: `Ijazah ${input.degree} — ${input.fullName}`,
    description:
      `Soulbound Token ijazah dari ${input.institutionName}. ` +
      "Token tidak dapat dipindahtangankan; keasliannya dapat diverifikasi publik di blockchain.",
    attributes,
    diploma: {
      certificate_number: input.certificateNumber,
      document_hash: input.documentHash,
      document_file_name: input.documentFileName,
      institution_code: input.institutionCode,
      institution_name: input.institutionName,
      nim: input.nim,
      full_name: input.fullName,
      study_program: input.studyProgram,
      degree: input.degree,
      graduation_date: input.graduationDate,
      issued_at: input.issuedAt,
      schema: "academixsbt/diploma/v1",
    },
  };
}
