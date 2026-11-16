# Local End-to-End Minting (M2)

Panduan menjalankan alur lengkap PoC di mesin lokal:

```text
PDF ijazah → SHA-256 → metadata IPFS (lokal/pinata) → mint SBT
          → PostgreSQL + audit log → verifikasi portal read-only
```

Hasil uji terakhir (16 Nov 2026):

| Bukti | Nilai |
|---|---|
| Kontrak lokal | `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Hardhat `localhost`, chain 31337) |
| Token ID | `1` |
| Owner | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` |
| Issuer | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` |
| `locked()` | `true` (soulbound) |
| `isRevoked()` | `false` |
| Metadata CID | `ipfs://local-ec893c2a543edb8cf874fca146256862` |
| SHA-256 PDF | `sha256:c54c3ae255828890edcb0a65f499684b2650a1eab7bdf79c3d1c3b968e1b488a` |
| Portal | status **IJAZAH VALID**, hash PDF **COCOK**, wallet menampilkan 1 token |

## 1. Jalankan node & deploy kontrak

Terminal 1:

```bash
cd contracts
npx hardhat node
```

Terminal 2:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
# catat CONTRACT_ADDRESS=0x...
```

Akun Hardhat #0 (khusus lokal, jangan dipakai di testnet/mainnet):

```text
address     : 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
private key : 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## 2. Konfigurasi backend

`backend/.env`:

```env
PORT=4000
PUBLIC_API_URL="http://localhost:4000"
ADMIN_API_KEY="dev-admin-key"
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academix"

RPC_URL="http://127.0.0.1:8545"
CHAIN_ID=31337
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
PRIVATE_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ISSUER_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

IPFS_PROVIDER="local"
LOCAL_IPFS_DIR="./storage/ipfs"
CORS_ORIGINS="*"
```

```bash
cd backend
npm install
npm run migrate
npm run dev
# health check
curl http://localhost:4000/api/health
```

## 3. Mint ijazah lewat API

```bash
curl -X POST http://localhost:4000/api/diplomas \
  -H "x-api-key: dev-admin-key" \
  -F tokenId=1 \
  -F walletAddress=0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  -F certificateNumber=IJZ-2026-0001 \
  -F institutionCode=UNIV-01 \
  -F institutionName="Universitas Contoh" \
  -F nim=20210001 \
  -F fullName="Budi Santoso" \
  -F studyProgram="Teknik Informatika" \
  -F degree=S.Kom \
  -F graduationDate=2026-08-01 \
  -F accreditationStatus=Unggul \
  -F graduationStatus=Lulus \
  -F studyDurationYears=4 \
  -F maxStudyDurationYears=7 \
  -F creditsEarned=150 \
  -F minCredits=144 \
  -F gpa=3.75 \
  -F minGpa=2.0 \
  -F activeReported=true \
  -F document=@ijazah.pdf
```

Respons berisi `ipfsCid`, `tokenUri`, `documentHash`, `txHash`, dan `issuerAddress`.

## 4. Verifikasi

```bash
# Backend (on-chain + IPFS)
curl http://localhost:4000/api/verify/1

# Langsung dari kontrak, tanpa backend
cd contracts
CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 TOKEN_ID=1 \
  npx hardhat run scripts/inspect.js --network localhost

# Bandingkan hash PDF (berkas sama vs berbeda)
curl -X POST http://localhost:4000/api/verify/1/document -F "document=@ijazah.pdf"
```

## 5. Portal verifikasi

`frontend/.env`:

```env
NEXT_PUBLIC_RPC_URL="http://127.0.0.1:8545"
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
NEXT_PUBLIC_EXPLORER_URL="http://localhost:8545"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

```bash
cd frontend
npm install
npm run dev
```

Buka:

- `http://localhost:3000/verify/1` → kartu **IJAZAH VALID**, metadata, QR, hash compare.
- `http://localhost:3000/wallet/0x7099...79C8` → daftar ijazah SBT milik wallet.

> CID `local-*` hanya untuk development. Untuk testnet, set `IPFS_PROVIDER=pinata`
> dan isi `PINATA_JWT` agar metadata tersedia publik via gateway.

## Catatan

- Backend mengirim header CORS (default `*`, batasi lewat `CORS_ORIGINS`) agar portal
  dapat mengambil metadata lokal dari `/api/ipfs/:cid`.
- `npm test` backend mencakup 83 test unit/HTTP + 1 test integrasi PostgreSQL
  (di-skip bila `TEST_DATABASE_URL` tidak diisi).
- Test kontrak: 15 test Hardhat (mint, soulbound, role, revocation, interface).
