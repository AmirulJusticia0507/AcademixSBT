# Backend — AcademixSBT

REST API untuk alur **mint ijazah → hash SHA-256 → upload metadata IPFS → mint SBT →
simpan record PostgreSQL → audit log**, plus endpoint verifikasi publik read-only.

## Menjalankan

```bash
# dari root repo
docker compose up -d postgres

cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

Isi `.env` minimal:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academix"
CONTRACT_ADDRESS="0x..."        # hasil deploy contracts/
PRIVATE_KEY="0x..."             # wallet issuer/admin
RPC_URL="https://rpc-amoy.polygon.technology"
ADMIN_API_KEY="ganti-di-produksi"
IPFS_PROVIDER="local"           # atau "pinata" + PINATA_JWT
```

Tanpa `CONTRACT_ADDRESS` service tetap start, tetapi endpoint verifikasi/minting
mengembalikan `503` (berguna untuk cek UI/health).

## Endpoint

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/api/health` | – | Status DB + koneksi blockchain |
| GET | `/api/config` | – | `chainId`, `contractAddress`, gateway IPFS |
| POST | `/api/diplomas` | `x-api-key` | Multipart: field ijazah + `document` (PDF ≤ 10 MB) |
| POST | `/api/diplomas/:tokenId/revoke` | `x-api-key` | Revoke ijazah on-chain + DB |
| GET | `/api/diplomas/:tokenId` | `x-api-key` | Record internal (DB) |
| GET | `/api/verify/:tokenId` | – | Verifikasi publik: on-chain + metadata IPFS |
| GET | `/api/verify/wallet/:address` | – | Semua token milik wallet (ERC-721 Enumerable) |
| POST | `/api/verify/:tokenId/document` | – | Upload PDF, bandingkan SHA-256 |
| GET | `/api/ipfs/:cid` | – | Proxy metadata (provider lokal/Pinata) |
| POST | `/api/issuers` | `x-api-key` | Daftarkan wallet institusi on-chain |
| GET | `/api/issuers/:address` | – | Cek status issuer |
| GET | `/api/audit-logs` | `x-api-key` | Audit log terbaru |

### Contoh minting

```bash
curl -X POST http://localhost:4000/api/diplomas \
  -H "x-api-key: dev-admin-key" \
  -F tokenId=1 \
  -F walletAddress=0xAlumni... \
  -F certificateNumber=IJZ-2026-001 \
  -F institutionCode=UNIV-01 \
  -F institutionName="Universitas Contoh" \
  -F nim=20210001 \
  -F fullName="Budi Santoso" \
  -F studyProgram="Teknik Informatika" \
  -F degree=S.Kom \
  -F graduationDate=2026-08-01 \
  -F document=@ijazah.pdf
```

Metadata yang di-upload ke IPFS:

```json
{
  "name": "Ijazah S.Kom — Budi Santoso",
  "attributes": [{ "trait_type": "NIM", "value": "20210001" }],
  "diploma": {
    "certificate_number": "IJZ-2026-001",
    "document_hash": "sha256:....",
    "institution_name": "Universitas Contoh",
    "schema": "academixsbt/diploma/v1"
  }
}
```

> Hanya **hash PDF** yang masuk metadata/on-chain. Berkas PDF tidak di-pin ke IPFS
> agar data sensitif tidak bocor.

## Struktur

```text
backend/
├── migrations/001_init.sql       # institutions, graduates, diploma_tokens, audit_logs
├── src/
│   ├── app.ts                    # routes Express
│   ├── services/                 # blockchain, IPFS, minting, verification
│   ├── repositories/             # query PostgreSQL + audit log
│   └── lib/                      # hash SHA-256, metadata, validasi zod, ABI
└── test/                         # unit + HTTP (supertest) + integrasi PostgreSQL
```

## Test

```bash
npm test
# dengan PostgreSQL nyata:
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academix" npm test
```
