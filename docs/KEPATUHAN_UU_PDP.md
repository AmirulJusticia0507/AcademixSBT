# Kepatuhan — AcademixSBT (P1)

> Dokumen ini adalah kajian awal untuk PoC, **bukan nasihat hukum**. Konsultasikan dengan penasihat hukum / DPO sebelum production.

## Prinsip desain privasi

1. **Minimisasi data on-chain / IPFS publik**
   - On-chain & metadata IPFS hanya berisi: hash SHA-256 dokumen, nomor ijazah, nama/NIM/Prodi/gelar, identitas institusi, CID, tanggal minting.
   - **NIK & nomor paspor TIDAK pernah on-chain / IPFS.** Disimpan hanya di PostgreSQL dalam bentuk terenkripsi AES-256-GCM (`graduates.nik_encrypted`, `passport_encrypted`, lihat `backend/src/lib/crypto.ts` + migrasi `002_add_nik_encrypted.sql`).
   - ENCRYPTION_KEY wajib diisi untuk produksi; tanpa kunci, NIK tidak disimpan (fail-safe).

2. **UU PDP (UU No. 27 Tahun 2022)**
   - Data alumni adalah data pribadi. Tentukan dasar pemrosesan (persetujuan / kewajiban hukum penomoran ijazah nasional), tujuan, dan masa retensi.
   - Sediakan mekanisme akses, koreksi, dan penghapusan data sensitif di DB (on-chain hash tidak dapat dihapus — jelaskan ini ke alumni saat minting).
   - Catat `audit_logs`: siapa mengakses/mengubah data, kapan, untuk tujuan apa.
   - Penilaian dampak (DPIA) sebelum menyimpan data dalam skala besar.

3. **Regulasi pendidikan**
   - Penomoran ijazah nasional: Permendikbudristek No. 6 Tahun 2022; validator PISN (akreditasi, masa studi, SKS, IPK, NIK) diimplementasikan sebagai *pre-mint validator* (`backend/src/services/eligibility.ts`).
   - AcademixSBT **bukan pengganti** PDDikti/PISN — mapping `certificate_number` ke format PIN nasional masih riset (lihat TODO P1).

4. **Keamanan akses (RBAC)**
   | Role | Akses |
   |---|---|
   | `admin` (ADMIN_API_KEY) | Mint, revoke, audit-logs, daftar issuer |
   | `verifier` (VERIFIER_API_KEY) | Batch verification HRD |
   | `public` (tanpa key) | Verifikasi read-only per Token ID/wallet, proof bundle |

5. **Checklist sebelum production**
   - [ ] Audit smart contract oleh pihak ketiga & review `docs/SECURITY_REVIEW.md`
   - [ ] Rotasi kunci ENCRYPTION_KEY + backup aman (HSM/KMS)
   - [ ] PostgreSQL: TLS, backup terenkripsi, akses least-privilege
   - [ ] Kebijakan retensi & penghapusan data sensitif disetujui DPO
   - [ ] Uji beban & rate-limit di multi-instance (ganti in-memory limiter dengan Redis)
