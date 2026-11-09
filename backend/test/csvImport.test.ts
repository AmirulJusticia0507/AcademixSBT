import { describe, expect, it } from "vitest";
import { parseCsv, validateCsvImport } from "../src/services/csvImport";

describe("CSV import (P2 migrasi massal)", () => {
  it("parseCsv menangani kutip dan koma di dalam kutip", () => {
    const rows = parseCsv('a,b\n"hello, world","say ""hi"""');
    expect(rows).toEqual([["a", "b"], ["hello, world", 'say "hi"']]);
  });

  it("memvalidasi baris valid dan tidak valid", () => {
    const csv = [
      "token_id,wallet_address,certificate_number,institution_code,institution_name,nim,full_name,study_program,degree,graduation_date,gpa,credits_earned",
      "1,0x00000000000000000000000000000000000000A1,IJZ-001,UNIV-01,Universitas Contoh,20210001,Budi Santoso,Teknik Informatika,S.Kom,2026-08-01,3.5,150",
      "2,bukan-wallet,IJZ-002,UNIV-01,Universitas Contoh,20210002,Siti,Teknik Informatika,S.Kom,2026-08-01,1.0,100",
      "",
    ].join("\n");

    const report = validateCsvImport(csv);
    expect(report.total).toBe(2);
    expect(report.valid).toBe(1);
    expect(report.invalid).toBe(1);
    expect(report.rows[0].ok).toBe(true);
    expect(report.rows[1].ok).toBe(false);
    expect(report.rows[1].errors.length).toBeGreaterThan(0);
  });

  it("file kosong menghasilkan laporan kosong", () => {
    expect(validateCsvImport("")).toMatchObject({ total: 0, valid: 0 });
  });
});
