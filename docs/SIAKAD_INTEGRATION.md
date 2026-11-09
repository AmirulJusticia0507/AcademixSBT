# Integrasi SIAKAD Kampus (P2)

Adapter generik REST (`backend/src/services/siakad.ts`) untuk menarik data kelulusan dari SIAKAD kampus, sehingga operator tidak perlu input manual satu per satu.

## Konfigurasi

```env
SIAKAD_API_URL="https://siakad.kampus.ac.id/api"
SIAKAD_API_KEY="..."   # opsional, dikirim sebagai header x-api-key
```

Tanpa `SIAKAD_API_URL`, endpoint mengembalikan `503` (provider `disabled`).

## Kontrak endpoint SIAKAD

```
GET {SIAKAD_API_URL}/graduates?institution_code={kode}
→ 200 { "graduates": [ { ... } ] }   atau   [ { ... } ]
```

## Mapping field (alias yang diterima)

| Field AcademixSBT | Alias SIAKAD yang diterima |
|---|---|
| `nim` | `nim`, `NIM`, `npm`, `student_id` |
| `fullName` | `full_name`, `fullName`, `nama`, `name` |
| `studyProgram` | `study_program`, `studyProgram`, `prodi`, `program_studi` |
| `degree` | `degree`, `gelar`, `jenjang` |
| `walletAddress` | `wallet_address`, `walletAddress`, `wallet` |
| `graduationDate` | `graduation_date`, `graduationDate`, `tanggal_lulus`, `yudisium` |
| `accreditationStatus` | `accreditation_status`, `accreditationStatus`, `akreditasi` |
| `graduationStatus` | `graduation_status`, `graduationStatus`, `status_lulus`, `status` |
| `studyDurationYears` | `study_duration_years`, `studyDurationYears`, `masa_studi` |
| `creditsEarned` | `credits_earned`, `creditsEarned`, `sks`, `total_sks` |
| `gpa` | `gpa`, `ipk`, `IPK` |
| `nik` | `nik`, `NIK` |
| `passportNumber` | `passport_number`, `passportNumber`, `passport` |
| `activeReported` | `active_reported`, `activeReported` |

## Penggunaan

```bash
curl -H "x-api-key: $ADMIN_API_KEY" \
  "http://localhost:4000/api/siakad/graduates?institution_code=UNIV-01"
```

Respons berisi daftar lulusan **disertai hasil validator ala PISN per lulusan** (`eligible`, `checks`, `failedCodes`), siap dipakai untuk proses minting lanjutan (minting tetap dilakukan per Token ID lewat `POST /api/diplomas` agar hash PDF & audit tercatat).
