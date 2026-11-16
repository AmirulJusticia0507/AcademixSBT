# Frontend  Portal Verifikasi Publik

Portal **read-only** untuk memverifikasi ijazah SBT tanpa login wallet. Data diambil
langsung dari kontrak via RPC publik + metadata IPFS, sehingga tetap berfungsi meski
backend/database kampus mati.

## Menjalankan

```bash
cd frontend
cp .env.example .env
npm install
npm run dev        # http://localhost:3000
```

Isi `.env`:

```env
NEXT_PUBLIC_RPC_URL="https://rpc-amoy.polygon.technology"
NEXT_PUBLIC_CHAIN_ID=80002
NEXT_PUBLIC_CONTRACT_ADDRESS="0x..."   # hasil deploy contracts/
NEXT_PUBLIC_EXPLORER_URL="https://amoy.polygonscan.com"
NEXT_PUBLIC_IPFS_GATEWAY="https://gateway.pinata.cloud/ipfs"
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

Tanpa `NEXT_PUBLIC_CONTRACT_ADDRESS`, portal tetap tampil dengan banner konfigurasi.

## Progressive Web App (PWA)

Build production menyediakan web app manifest, ikon aplikasi, dan service worker.
Jalankan `npm run build` lalu `npm run start` untuk mencoba instalasi PWA; service
worker memang tidak didaftarkan saat development. Browser harus mengakses situs melalui
HTTPS (localhost diperbolehkan) agar instalasi tersedia.

Service worker menyimpan shell offline dan aset JavaScript/CSS statis Next.js yang
pernah dimuat. Jika jaringan putus, navigasi menampilkan halaman offline. Status
verifikasi blockchain/IPFS tidak disimpan sebagai hasil offline, agar status ijazah
tidak tampak valid berdasarkan data lama.

## Fitur P0

| Fitur | Implementasi |
|---|---|
| Verifikasi tanpa login wallet | `lib/chain.ts`  ethers `JsonRpcProvider` read-only |
| Verifikasi via Token ID | Route `/verify/[tokenId]` |
| Verifikasi via wallet | Route `/wallet/[address]` (ERC-721 Enumerable `tokenOfOwnerByIndex`) |
| QR Code | `QrShare` menghasilkan QR berisi URL verifikasi; `ScanQrButton` memindai via kamera |
| Kartu hasil | `DiplomaCard`  status valid/revoked, nama, NIM, prodi, gelar, institusi, tanggal minting, link IPFS |
| Perbandingan hash PDF | `HashCompare`  SHA-256 dihitung di browser (`crypto.subtle`), berkas tidak diunggah |
| Metadata fallback | Beberapa gateway IPFS + proxy backend untuk CID lokal |

## Catatan privasi

Portal tidak meminta koneksi wallet dan tidak menandatangani transaksi. Berkas PDF yang
diunggah verifikator **tidak dikirim ke server**  hash dihitung lokal di browser.
