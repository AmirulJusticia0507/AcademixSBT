# Alur Eksepsi Terdokumentasi (P1)

Validator ala PISN menolak ijazah yang gagal cek akreditasi / masa studi / pelaporan aktif.
Untuk kasus yang sah (mis. prodi sedang reakreditasi), institusi dapat memakai **eksepsi** —
tetapi hanya jika dokumen pendukung lengkap dan disetujui pimpinan PT.

```text
Upload SK Yudisium/BA Sidang + SPTJM
        → pemeriksaan kelengkapan
        → persetujuan pimpinan PT
        → audit log
        → minting dengan exceptionApproved=true
        → dokumen ditautkan ke Token ID
```

## Dokumen yang wajib

| Tipe (`documentType`) | Keterangan | Wajib |
|---|---|---|
| `sk_yudisium` | SK Yudisium | salah satu dari SK/BA |
| `ba_sidang` | Berita Acara Sidang | salah satu dari SK/BA |
| `sptjm` | Surat Pernyataan Tanggung Jawab Mutlak | ya |

Berkas: PDF/PNG/JPEG, maksimal 10 MB. Berkas disimpan di
`DOCUMENT_ARCHIVE_DIR` (default `./storage/documents`) dengan nama
`<sha256>.<ext>`; hash SHA-256 dan metadata dicatat di PostgreSQL + audit log.
Dokumen **tidak** diunggah ke IPFS publik karena memuat data pribadi.

## Endpoint (butuh `x-api-key` admin)

| Method | Path | Fungsi |
|---|---|---|
| `POST` | `/api/exceptions/:certificateNumber/documents` | Upload dokumen (`multipart/form-data`: `document`, `documentType`, opsional `note`, `uploadedBy`) |
| `GET` | `/api/exceptions/:certificateNumber` | Status case: `pending` / `approved` / `rejected`, dokumen kurang, daftar dokumen |
| `POST` | `/api/exceptions/:certificateNumber/approve` | Persetujuan pimpinan PT (`{ "approver": "..." }`) |
| `POST` | `/api/exceptions/:certificateNumber/reject` | Penolakan (`{ "reason": "...", "approver": "..." }`) |

`certificateNumber` mengikuti format nomor ijazah (huruf, angka, `.`, `_`, `-`, `/`).

## Contoh alur

```bash
API=http://localhost:4000
KEY="x-api-key: dev-admin-key"
CERT="IJZ-2026-0002"

# 1. Upload SK Yudisium
curl -X POST "$API/api/exceptions/$CERT/documents" -H "$KEY" \
  -F documentType=sk_yudisium \
  -F uploadedBy="BAA Universitas Contoh" \
  -F document=@sk-yudisium.pdf

# 2. Upload SPTJM
curl -X POST "$API/api/exceptions/$CERT/documents" -H "$KEY" \
  -F documentType=sptjm \
  -F note="SPTJM pimpinan PT untuk prodi dalam reakreditasi" \
  -F document=@sptjm.pdf

# 3. Cek kelengkapan (masih pending)
curl "$API/api/exceptions/$CERT" -H "$KEY"

# 4. Persetujuan pimpinan PT
curl -X POST "$API/api/exceptions/$CERT/approve" -H "$KEY" \
  -H "Content-Type: application/json" \
  -d '{"approver":"Rektor Universitas Contoh"}'
```

Respons approval berisi `status: "approved"`, `requiredComplete: true`, dan
`canMintWithException: true`.

### Hasil uji lokal (16 Nov 2026)

| Bukti | Nilai |
|---|---|
| Nomor ijazah | `IJZ-2026-0003` |
| Dokumen | `ba_sidang.pdf` + `sptjm.pdf` (arsip `<sha256>.pdf`) |
| Persetujuan | `Wakil Rektor I` |
| Minting | Token ID `3`, wallet `0x90F79bf6EB2c4f870365E785982E1f101E93b906` |
| On-chain | `locked: true`, `revoked: false` |
| Tautan | `exception_documents.token_id = 3` + `EXCEPTION_LINKED_TO_TOKEN` di audit log |

Mint tanpa approval ditolak `400 VALIDATION_ERROR` dengan `missingDocuments`, dan
mint setelah approval berhasil `201`.

## Minting dengan eksepsi

```bash
curl -X POST "$API/api/diplomas" -H "$KEY" \
  -F tokenId=2 \
  -F walletAddress=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  -F certificateNumber="$CERT" \
  -F institutionCode=UNIV-01 \
  -F institutionName="Universitas Contoh" \
  -F nim=20210002 \
  -F fullName="Siti Aminah" \
  -F studyProgram="Sistem Informasi" \
  -F degree=S.Kom \
  -F graduationDate=2026-08-01 \
  -F accreditationStatus="tidak-terakreditasi" \
  -F exceptionApproved=true \
  -F exceptionReason="Prodi dalam proses reakreditasi, SK Yudisium + SPTJM terlampir" \
  -F document=@ijazah.pdf
```

Aturan di backend:

- `exceptionApproved=true` **ditolak** (`400 VALIDATION_ERROR`) bila belum ada case
  berstatus `approved` atau dokumen wajib belum lengkap.
- Eksepsi hanya menutup pemeriksaan yang `exceptionable` (akreditasi, masa studi,
  pelaporan aktif). Kegagalan status lulus / tanggal / SKS / IPK / identitas tetap menolak.
- Setelah minting sukses, seluruh dokumen case ditautkan ke `token_id` dan dicatat
  sebagai `EXCEPTION_LINKED_TO_TOKEN`.

## Audit log

| Action | Kapan |
|---|---|
| `EXCEPTION_DOCUMENT_UPLOADED` | Setiap upload dokumen (hash + tipe + nama berkas) |
| `EXCEPTION_APPROVED` | Persetujuan pimpinan PT |
| `EXCEPTION_REJECTED` | Penolakan + alasan |
| `EXCEPTION_LINKED_TO_TOKEN` | Setelah minting sukses |

Lihat dengan:

```bash
curl "$API/api/audit-logs?limit=20" -H "$KEY"
```

## Catatan keamanan

- Arsip lokal hanya untuk PoC. Production: object storage terenkripsi (S3/MinIO + KMS),
  akses berbasis role, retensi sesuai kebijakan kearsipan.
- Jangan menaruh `DOCUMENT_ARCHIVE_DIR` di web root / folder yang di-serve statis.
- Nama penyetuju dicatat di DB dan audit log; gunakan akun/admin key per institusi.
