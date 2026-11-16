# Mapping PIN Lama  Nomor Ijazah Nasional (NINa / PISN)

Dokumen ini menjawab item riset: bagaimana `certificate_number` (PIN) dipetakan ke
**Nomor Ijazah Nasional (NINa)** agar kompatibel dengan PDDikti/PISN.

## Format resmi

### NINa  PISN (21 digit)

```text
kode_pt (6) + kode_ps (5) + tahun_terbit (4) + tipe (1) + no_urut (5)
```

| Komponen | Panjang | Contoh | Sumber data |
|---|---:|---|---|
| `kode_pt` | 6 | `001021` | Kode PT PDDikti |
| `kode_ps` | 5 | `55101` | Kode program studi PDDikti |
| `tahun_terbit` | 4 | `2024` | Tahun penerbitan |
| `tipe` | 1 | `1` = ijazah, `2` = sertifikat | Jenis dokumen |
| `no_urut` | 5 | `00003` | Urutan generate dari PISN |

Contoh: `001021551012024100003`.

Sumber:

- FAQ PISN  <https://pisn.kemdiktisaintek.go.id/faq>
- Kebijakan PISN LLDikti III (kodefikasi 21 digit)
  <https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/12/Paparan-Kebijakan-PISN.pdf>

### PIN lama (15 digit)

```text
kode_prodi (5) + tahun_lulus (4) + no_urut (5) + check_digit (1)
```

Contoh: `79202 2017 00001 9`  `792022017000019`.

Sumber: Panduan IPB / SE Dirjen Belmawa tentang PIN & SIVIL
<https://panduan.ipb.ac.id/docs/tata-tertib-penyelenggaraan-akademik-multistrata/kelulusan-dan-gelar-akademik/>

## Aturan mapping yang dipakai

`backend/src/lib/nationalDiplomaNumber.ts`:

1. **NINa 21 digit valid**  dikembalikan apa adanya (`source: "nina"`).
2. **PIN lama 15 digit**  `kode_prodi`, `tahun`, dan `no_urut` dipertahankan;
   `kode_pt` ditambahkan dari data PDDikti; `check_digit` dibuang karena tidak
   dipakai NINa (`source: "legacy_pin"`).
3. **Nomor internal institusi** (mis. `IJZ-2026-0001`)  ditolak; nomor internal
   bukan PIN/NINa dan tidak boleh dianggap nomor nasional.

> **Penting:** mapping ini hanya **preview/kompatibilitas**. NINa resmi hanya
> terbit dari aplikasi PISN dan tersinkron ke PDDikti. `requiresPisnGeneration`
> selalu `true` untuk hasil mapping PIN lama.

## Pemakaian

Library:

```ts
import {
  buildNationalDiplomaNumber,
  mapToNationalDiplomaNumber,
} from "./src/lib/nationalDiplomaNumber";

buildNationalDiplomaNumber({
  institutionCode: "001021",
  studyProgramCode: "55101",
  year: "2024",
  type: "ijazah",
  sequence: "00003",
});
// "001021551012024100003"

mapToNationalDiplomaNumber("792022017000019", { institutionCode: "001021" });
// {
//   nationalDiplomaNumber: "001021792022017100001",
//   source: "legacy_pin",
//   requiresPisnGeneration: true,
//   note: "Check digit PIN \"9\" tidak dipakai NINa; ..."
// }
```

CLI:

```bash
cd backend
npm run map:pin -- 792022017000019 001021
npm run map:pin -- 001021551012024100003 001021
```

## Integrasi ke database

Kolom `diploma_tokens.certificate_number` saat ini menyimpan nomor yang dikirim
institusi. Untuk kompatibilitas PDDikti:

- Simpan NINa hasil generate PISN di `certificate_number` (bila sudah tersedia),
  atau
- Simpan nomor internal + NINa terpisah, lalu gunakan NINa sebagai identifier
  verifikasi publik.

Rekomendasi jangka panjang: tambah kolom `national_diploma_number` (21 digit,
nullable, unik) dan isi hanya dari hasil generate PISN. Mapping PIN lama dipakai
untuk migrasi data historis / preview, bukan untuk mengarang nomor baru.

## Batasan

- `kode_pt` dan `kode_ps` wajib diambil dari PDDikti; tidak dapat ditebak dari
  nama perguruan tinggi/prodi.
- Nomor urut NINa ditentukan PISN, bukan urutan lokal kampus.
- Check digit PIN lama tidak dipakai NINa.
- Untuk lulusan sebelum kewajiban NINa (sebelum 29 Desember 2020), ijazah tetap
  sah tanpa NINa; jangan memaksakan mapping.
