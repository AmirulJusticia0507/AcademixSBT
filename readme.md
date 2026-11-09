# 🎓 AcademixSBT — Decentralized Diploma & Credential Verification System

> 🌐 **Bahasa Indonesia** | [English](./README.en.md)

> **Proof of Concept (PoC)** sistem penerbitan dan verifikasi ijazah perguruan tinggi berbasis **Soulbound Token (SBT / ERC-5192 / ERC-721)** untuk menjamin ketersediaan data tanpa batas (zero downtime) dan keamanan anti-pemalsuan mutlak (non-transferable).

![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)
![Blockchain](https://img.shields.io/badge/Network-Polygon%20Amoy%20%7C%20Arbitrum%20Sepolia-purple)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Storage](https://img.shields.io/badge/Storage-IPFS-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📑 Daftar Isi

- [Executive Summary](#-executive-summary)
- [Problem & Solution](#-problem--solution)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Agents & Roles](#-agents--roles)
- [System Architecture](#%EF%B8%8F-system-architecture--data-flow)
- [Database Schema & Smart Contract](#%EF%B8%8F-database-schema--smart-contract-data-structure)
- [Getting Started](#-getting-started--local-development-guide)
- [Analisa Kekurangan Sistem Eksisting](#-analisa-kekurangan-sistem-eksisting-sivil--pddikti--pisn)
- [Project Structure](#%EF%B8%8F-project-structure)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Disclaimer](#%EF%B8%8F-disclaimer)

---

## 📌 Executive Summary

Verifikasi ijazah konvensional sangat bergantung pada ketersediaan server pusat (seperti PPDikti/SIVIL). Jika server down atau mengalami gangguan jaringan, proses validasi ijazah oleh instansi atau penyedia kerja akan terhambat.

AcademixSBT menyelesaikan permasalahan ini dengan pendekatan **Hybrid Web2/Web3**:

### Key Features

| Fitur | Penjelasan |
|---|---|
| **Zero-Downtime Verification** | Bukti keabsahan ijazah di-anchor ke dalam public blockchain ledger. Publik atau HRD dapat memverifikasi keaslian dokumen 24/7 tanpa bergantung pada ketersediaan server database kampus/pemerintah. |
| **Anti-Pemalsuan Mutlak** | Menggunakan spesifikasi Soulbound Token (SBT), sertifikat digital terikat secara permanen pada alamat wallet alumni dan tidak dapat ditransfer atau diperjualbelikan ke akun lain. |
| **Privasi Terjaga** | Hanya hash cryptographic (IPFS CID & SHA-256 metadata) dan identitas institusi yang disimpan di blockchain, sementara data sensitif alumni dienkripsi di basis data relasional (hybrid architecture). |

---

## 🛠️ Tech Stack

### Backend & Web3 Core

| Komponen | Teknologi |
|---|---|
| **Smart Contract** | Solidity (`^0.8.20`), OpenZeppelin Contracts (ERC-721 / ERC-5192 extension) |
| **Development Framework** | Hardhat / Foundry |
| **Blockchain Network** | Polygon Amoy Testnet / Arbitrum Sepolia (EVM Compatible, low gas fee) |
| **Backend API** | Go (Golang) / Node.js (TypeScript) dengan Gin / Express framework |
| **Web3 Library** | ethers.js v6 / viem / wagmi untuk interaksi smart contract dan signing transaction |
| **Off-Chain Storage** | IPFS (Pinata / Web3.Storage) untuk menyimpan metadata ijazah |
| **Database** | PostgreSQL (penyimpanan data internal kampus, audit log, dan registrasi wallet) |

### Frontend

| Komponen | Teknologi |
|---|---|
| **Framework** | Next.js / Vue.js (Tailwind CSS) |
| **Wallet Connection** | RainbowKit / AppKit / Metamask Connector |

---

## 🤖 Agents & Roles

Sistem ini membagi aktor dan agen pengelola ke dalam beberapa tingkatan hak akses:

| 🏢 Institution Agent (Kampus / Registrator) | 👨‍🎓 Alumni / Graduate (Pemilik Ijazah) | 🔍 Public / Verifier (HRD / Instansi) |
|---|---|---|
| • Mendaftarkan metadata | • Menerima SBT ijazah | • Memindai QR / Wallet ID |
| • Melakukan Minting SBT | • Mengatur visibilitas data publik | • Memverifikasi status SBT langsung dari Blockchain secara real-time |
| • Revoke/Burn (jika terjadi kesalahan) | • Membagikan link/QR | |

---

## 🏗️ System Architecture & Data Flow

### Architecture Diagram

```text
[ Frontend: Portal Kampus / Verifier ]
         │                    │
  (REST API / Web3)     (Read-Only RPC Query)
         │                    │
         ▼                    ▼
[ Backend API ] ──────► [ Polygon / EVM Testnet ]
         │              (Smart Contract ERC-5192)
         ▼                    ▲
[ PostgreSQL ]                │ (Fetch Metadata)
 (Relational DB)             ▼
                       [ IPFS Storage ]
                    (Pinata / Decentralized)
```

### Flow Penerbitan (Minting Flow)

1. Admin Kampus menginput data kelulusan mahasiswa ke Portal Utama.
2. Backend mengunggah berkas metadata ijazah (termasuk hash ijazah PDF) ke IPFS dan mendapatkan IPFS Hash / CID.
3. Backend memanggil fungsi `safeMintSBT(studentWallet, tokenURI)` pada Smart Contract.
4. Token terbit dan langsung terkunci (locked) di wallet alumni.

### Flow Verifikasi (Verification Flow)

1. Alumni memberikan Token ID atau QR Code kepada Verifikator (HRD).
2. Verifikator membuka portal verifikasi publik (atau melakukan query read via RPC endpoint blockchain secara langsung).
3. Smart Contract mengecek:
   - Apakah Token ID valid & locked (`isLocked() == true`)?
   - Siapa penerbitnya (`issuerAddress` match dengan kampus terverifikasi)?
   - Metadata diambil dari IPFS untuk membandingkan kecocokan nama, NIM, jurusan, dan hash PDF ijazah.

---

## 🗄️ Database Schema & Smart Contract Data Structure

### 1. PostgreSQL Schema (Web2 Storage)

#### Table: `institutions`

| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | `PRIMARY KEY, DEFAULT gen_random_uuid()` | ID unik institusi |
| `code` | VARCHAR(20) | `UNIQUE, NOT NULL` | Kode Perguruan Tinggi |
| `name` | VARCHAR(255) | `NOT NULL` | Nama Kampus |
| `wallet_address` | VARCHAR(42) | `UNIQUE, NOT NULL` | Alamat Wallet Ethereum Kampus |
| `created_at` | TIMESTAMP | `DEFAULT CURRENT_TIMESTAMP` | Waktu pendaftaran |

#### Table: `graduates`

| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | `PRIMARY KEY` | ID unik mahasiswa |
| `nim` | VARCHAR(50) | `UNIQUE, NOT NULL` | Nomor Induk Mahasiswa |
| `full_name` | VARCHAR(255) | `NOT NULL` | Nama Lengkap sesuai Ijazah |
| `study_program` | VARCHAR(100) | `NOT NULL` | Program Studi |
| `wallet_address` | VARCHAR(42) | `NOT NULL` | Alamat Wallet Alumni |
| `degree` | VARCHAR(50) | `NOT NULL` | Gelar Akademik (misal: S.Kom) |

#### Table: `diploma_tokens`

| Column Name | Type | Constraints | Description |
|---|---|---|---|
| `id` | UUID | `PRIMARY KEY` | ID Rekam Minting |
| `graduate_id` | UUID | `FK -> graduates(id)` | Reference ke data alumni |
| `token_id` | BIGINT | `UNIQUE, NOT NULL` | Token ID pada Smart Contract |
| `ipfs_cid` | VARCHAR(255) | `NOT NULL` | Content Identifier IPFS |
| `tx_hash` | VARCHAR(66) | `NOT NULL` | Hash Transaksi Minting Blockchain |
| `certificate_number` | VARCHAR(100) | `UNIQUE, NOT NULL` | Nomor Ijazah Nasional (PIN) |
| `is_revoked` | BOOLEAN | `DEFAULT FALSE` | Status pembatalan ijazah |
| `minted_at` | TIMESTAMP | `DEFAULT CURRENT_TIMESTAMP` | Tanggal pencetakan di blockchain |

### 2. Smart Contract Data Structure (Solidity - Conceptual Draft)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DiplomaSoulboundToken (ERC-5192 Compliant Minimal Concept)
 */
contract DiplomaSBT is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    // Mapping Token ID ke URI metadata IPFS
    mapping(uint256 => string) private _tokenURIs;
    // Mapping status Revocation ijazah
    mapping(uint256 => bool) public isRevoked;

    // Interface ERC-5192 event untuk Soulbound Status
    event Locked(uint256 tokenId);
    event Revoked(uint256 tokenId);

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    // Mengunci token agar TIDAK BISA DITRANSFER (Soulbound Constraint)
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Mengizinkan minting (from == address(0)) dan burning, tetapi MENOLAK transfer antar wallet
        if (from != address(0) && to != address(0)) {
            revert("SBTError: Token is soulbound and non-transferable");
        }
        return super._update(to, tokenId, auth);
    }

    function safeMintSBT(address to, uint256 tokenId, string memory uri) public onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;
        emit Locked(tokenId);
    }

    function revokeDiploma(uint256 tokenId) public onlyRole(DEFAULT_ADMIN_ROLE) {
        isRevoked[tokenId] = true;
        emit Revoked(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return _tokenURIs[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## 🚀 Getting Started & Local Development Guide

### Prerequisites

- Node.js `>= 18.0.0`
- Docker & Docker Compose (untuk PostgreSQL & Local Hardhat Node)
- Pinata API Key (untuk IPFS pinning)

### Steps

#### 1. Clone Repository

```bash
git clone https://github.com/username/academix-sbt-poc.git
cd academix-sbt-poc
```

#### 2. Environment Setup (`.env`)

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/academix_db"
RPC_URL="https://rpc-amoy.polygon.technology"
PRIVATE_KEY="0x_YOUR_CONTRACT_DEPLOYER_PRIVATE_KEY"
PINATA_API_KEY="YOUR_PINATA_API_KEY"
PINATA_SECRET_KEY="YOUR_PINATA_SECRET_KEY"
```

#### 3. Compile Smart Contract

```bash
npx hardhat compile
```

#### 4. Deploy Contract to Testnet

```bash
npx hardhat run scripts/deploy.ts --network amoy
```

#### 5. Run Backend API & Frontend

```bash
npm run dev
```

---

## 🔍 Analisa Kekurangan Sistem Eksisting (SIVIL / PDDikti / PISN)

Analisa berdasarkan situs resmi/portal yang dikunjungi:

- [SIVIL — ijazahkemdikbud.web.id](https://www.ijazahkemdikbud.web.id/) (Sistem Verifikasi Ijazah secara Elektronik)
- [PDDikti — pddikti.kemdiktisaintek.go.id](https://pddikti.kemdiktisaintek.go.id/) (Pangkalan Data Pendidikan Tinggi)
- [PISN — pisn.kemdiktisaintek.go.id](https://pisn.kemdiktisaintek.go.id/) (Penomoran Ijazah dan Sertifikat Profesi Nasional)

### Ringkasan Perbandingan

| Aspek | SIVIL | PDDikti | PISN |
|---|---|---|---|
| **Fungsi utama** | Verifikasi nomor ijazah | Database & statistik pendidikan tinggi (4.416 PT, 9,9 jt mahasiswa) | Penomoran + verifikasi nomor ijazah / sertifikat profesi |
| **Cara verifikasi** | Form manual: PT, Prodi, Nomor Ijazah, angka pengaman/captcha | Bukan portal verifikasi ijazah; data berasal dari pelaporan PT | Form manual: PT, Program Pendidikan, Prodi, Tipe Pencarian (Nomor Ijazah / NIM / Nomor Sertifikat), captcha |
| **Bukti kriptografi** | ❌ Tidak ada — hanya cek keberadaan nomor di database pusat | ❌ Tidak ada hash dokumen | ❌ Tidak ada hash dokumen; nomor di-generate lalu dikirim ke PDDikti |
| **Verifikasi saat server pusat down** | ❌ Gagal / tidak dapat diakses | ❌ Tergantung server pusat | ❌ Gagal; ada pengumuman maintenance (mis. pengalihan Metro-E, Oct 2026) |
| **QR / scan / wallet** | ❌ | ❌ | ❌ |
| **API publik untuk HRD** | ❌ (API resmi bersifat institusional, perlu pengajuan) | ❌ | ❌ |

### Kekurangan Utama di Ketiga Sistem

1. **Single point of failure (server pusat)**
   - Semua verifikasi bergantung pada server Kemdiktisaintek. Saat maintenance/down, HRD & alumni tidak bisa verifikasi sama sekali.
   - Sinkronisasi PDDikti → SIVIL/PISN ada jeda (dilaporkan hingga 2×24 jam / H+3), sehingga ijazah asli bisa tampil "tidak ditemukan".

2. **Form manual + captcha, rawan typo**
   - Verifikator wajib mengetik PT, Prodi, Nomor Ijazah/NIM, dan angka pengaman secara persis, termasuk tanda khusus.
   - Nomor ijazah sering tidak tampak di lembar depan, nama/NIM bisa typo → hasil "tidak ditemukan" padahal ijazah asli.
   - Tidak ada scan QR, Token ID, atau wallet address.

3. **Tidak ada bukti kriptografi atas dokumen**
   - Yang dicek hanya nomor ada/tidak di database. Tidak ada hash SHA-256 atas PDF ijazah yang di-anchor, jadi pemalsuan visual/scan tetap lolos jika nomornya benar.
   - Tidak ada mekanisme non-transferable: ijazah tidak terikat ke pemilik secara kriptografi.

4. **Kualitas data tergantung pelaporan operator PT**
   - Jika operator belum finalisasi pelaporan, salah input nomor, SKS/IPK/NIK salah, atau status belum "Lulus", ijazah asli tidak terdeteksi.
   - PISN menerapkan validator ketat (Prodi terakreditasi, masa studi, minimal SKS & IPK, SKS semester antara, mahasiswa aktif di periode tahun masuk, NIK/passport terisi). Data tidak eligible harus diperbaiki di PDDikti atau mengajukan **eksepsi** dengan SPTJM, SK Yudisium/BA Sidang, surat permohonan pimpinan PT, dll. — birokratis & lambat.

5. **Cakupan terbatas**
   - Berlaku dari periode awal pelaporan: PT umum mulai TA 2003/2004, PT keagamaan 2009/2010, PT kementerian lain 2012/2013 (SE No. 5478/A.P1/SE/2017).
   - Ijazah luar negeri, PT yang sudah tutup, dan lulusan lama di luar periode tidak ter-cover otomatis (verval manual/upload berkas).

6. **Transparansi revocation & audit lemah**
   - Tidak ada status pencabutan ijazah yang terpublikasi secara real-time & dapat diverifikasi publik via ledger.
   - Perubahan data di database pusat tidak meninggalkan jejak kriptografi yang dapat diaudit publik.

7. **Risiko kepercayaan domain & transisi layanan**
   - SIVIL dikenal lewat domain non-`go.id` (`ijazahkemdikbud.web.id`) — rawan kebingungan/phishing dibanding domain resmi `*.kemdiktisaintek.go.id`.
   - Layanan SIVIL dilaporkan sudah jarang aktif / tidak tersambung ke data, dan verifikasi dialihkan ke PISN — membingungkan pengguna lama.

### Bagaimana AcademixSBT Menjawabnya

| Kekurangan | Solusi AcademixSBT (direncanakan) |
|---|---|
| Server pusat down | Verifikasi read-only langsung via RPC blockchain + metadata IPFS, tanpa server kampus/pemerintah |
| Form manual & captcha | Verifikasi via QR Code / Token ID / Wallet Address, tanpa captcha |
| Tidak ada bukti kriptografi | Hash SHA-256 PDF + IPFS CID di-anchor on-chain saat minting |
| Bisa dipalsu / ditransfer | SBT ERC-5192 non-transferable, terikat permanen ke wallet alumni |
| Data tidak eligible / birokrasi eksepsi | Pre-mint validator ala PISN (akreditasi, masa studi, SKS, IPK, NIK) sebelum minting, dengan audit log di PostgreSQL |
| Revocation tidak transparan | Event & status `isRevoked` on-chain, dapat dicek real-time |
| Cakupan terbatas | Hybrid: data sensitif tetap di PostgreSQL terenkripsi, hanya hash & identitas institusi di on-chain |

> Detail hasil analisa per-situs juga dapat dilihat pada sumber resmi di atas dan [FAQ PISN](https://pisn.kemdiktisaintek.go.id/faq).

---

## 🗂️ Project Structure

> **Target layout (monorepo)** — sesuaikan dengan pilihan stack yang dipakai (Backend: Go/Gin atau Node.js/Express; Frontend: Next.js atau Vue.js).

```text
academix-sbt/
├── contracts/                  # Smart Contract (Hardhat / Foundry)
│   ├── contracts/
│   │   └── DiplomaSBT.sol      # ERC-5192 Soulbound Token
│   ├── scripts/
│   │   └── deploy.ts           # Script deploy ke testnet
│   ├── test/
│   └── hardhat.config.ts
│
├── backend/                    # Backend API (Go / Node.js TypeScript)
│   ├── src/                    # routes, controllers, services
│   ├── migrations/             # Migrasi PostgreSQL
│   └── .env.example
│
├── frontend/                   # Portal Kampus & Verifier (Next.js / Vue.js)
│   ├── app/                    # Pages (dashboard, verifikasi publik, dsb.)
│   ├── components/
│   └── lib/                    # Web3 (wagmi / viem / ethers.js), API client
│
├── docs/                       # Dokumentasi tambahan (arsitektur, API, dsb.)
├── docker-compose.yml          # PostgreSQL & Local Hardhat Node
├── .env.example                # Template environment variables
├── TODO.md                     # Todo list & milestone
├── AGENTS.md                   # Instruksi agent: commit+push & continue otomatis
├── LICENSE                     # MIT License
└── README.md
```

| Folder | Isi |
|---|---|
| `contracts/` | Smart contract `DiplomaSBT`, script deploy & test |
| `backend/` | REST API, integrasi IPFS, PostgreSQL, audit log |
| `frontend/` | Portal kampus, portal alumni, dan portal verifikasi publik |
| `docs/` | Dokumentasi arsitektur & API |
| `docker-compose.yml` | Menjalankan PostgreSQL & local blockchain node |

---

## 📝 Roadmap / Todo List

> Detail todo list dengan prioritas (P0/P1/P2) dan milestone dipisahkan di **[TODO.md](./TODO.md)**.

Ringkasan:

- [x] Perancangan Spesifikasi SBT & Arsitektur Database Hybrid.
- [x] Analisa gap SIVIL / PDDikti / PISN sebagai dasar kebutuhan fitur.
- [ ] Implementasi Smart Contract ERC-5192 pada Testnet.
- [ ] Integrasi API Backend untuk Pengunggahan Metadata ke IPFS.
- [ ] Pembuatan Portal Verifikasi Publik tanpa Login Wallet (Read-Only via RPC Provider).
- [ ] Pengujian Fitur Revocation (Pembatalan Ijazah Bermasalah).
- [ ] Todo turunan dari analisa SIVIL/PDDikti/PISN (QR/Token ID, hash SHA-256, validator ala PISN, API HRD, dll.) — lihat [TODO.md](./TODO.md).

---

## 📄 License

Proyek ini dilisensikan di bawah [MIT License](https://opensource.org/licenses/MIT) — sama dengan SPDX identifier pada smart contract (`// SPDX-License-Identifier: MIT`).

Lihat file [`LICENSE`](./LICENSE) untuk teks lisensi lengkap.

---

## ⚠️ Disclaimer

> Project ini adalah **Proof of Concept** untuk tujuan edukasi dan riset. **Bukan untuk penggunaan production** tanpa audit keamanan smart contract, review arsitektur, dan penyesuaian terhadap regulasi yang berlaku (mis. PDDikti / kepatuhan data pribadi).
