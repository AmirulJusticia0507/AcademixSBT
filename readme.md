
🎓 AcademixSBT — Decentralized Diploma & Credential Verification System
Proof of Concept (PoC) sistem penerbitan dan verifikasi ijazah perguruan tinggi berbasis Soulbound Token (SBT / ERC-5192 / ERC-721) untuk menjamin ketersediaan data tanpa batas (zero downtime) dan keamanan anti-pemalsuan mutlak (non-transferable).

📌 Executive Summary
Verifikasi ijazah konvensional sangat bergantung pada ketersediaan server pusat (seperti PPDikti/SIVIL). Jika server down atau mengalami gangguan jaringan, proses validasi ijazah oleh instansi atau penyedia kerja akan terhambat.

AcademixSBT menyelesaikan permasalahan ini dengan pendekatan Hybrid Web2/Web3:

Zero-Downtime Verification: Bukti keabsahan ijazah di-anchor ke dalam public blockchain ledger. Publik atau HRD dapat memverifikasi keaslian dokumen 24/7 tanpa bergantung pada ketersediaan server database kampus/pemerintah.

Anti-Pemalsuan Mutlak: Menggunakan spesifikasi Soulbound Token (SBT), sertifikat digital terikat secara permanen pada alamat wallet alumni dan tidak dapat ditransfer atau diperjualbelikan ke akun lain.

Privasi Terjaga: Hanya hash cryptographic (IPFS CID & SHA-256 metadata) dan identitas institusi yang disimpan di blockchain, sementara data sensitif alumni dienkripsi di basis data relasional (hybrid architecture).

🛠️ Tech Stack & Skills
Backend & Web3 Core
Smart Contract: Solidity (^0.8.20), OpenZeppelin Contracts (ERC-721 / ERC-5192 extension).

Development Framework: Hardhat / Foundry.

Blockchain Network: Polygon Amoy Testnet / Arbitrum Sepolia (EVM Compatible, low gas fee).

Backend API: Go (Golang) / Node.js (TypeScript) dengan Gin / Express framework.

Web3 Library: ethers.js v6 / viem / wagmi untuk interaksi smart contract dan signing transaction.

Off-Chain Storage: IPFS (Pinata / Web3.Storage) untuk menyimpan metadata ijazah.

Database: PostgreSQL (penyimpanan data internal kampus, audit log, dan registrasi wallet).

Frontend
Framework: Next.js / Vue.js (Tailwind CSS).

Wallet Connection: RainbowKit / AppKit / Metamask Connector.

🤖 Agents & Roles Definition
Sistem ini membagi aktor dan agen pengelola ke dalam beberapa tingkatan hak akses:

+-----------------------------------------------------------------------------------+
|                                  SYSTEM ROLES                                     |
+--------------------------+--------------------------+-----------------------------+
| 🏢 Institution Agent     | 👨‍🎓 Alumni / Graduate     | 🔍 Public / Verifier        |
| (Kampus / Registrator)   | (Pemilik Ijazah)         | (HRD / Instansi)            |
+--------------------------+--------------------------+-----------------------------+
| • Mendaftarkan metadata  | • Menerima SBT ijazah    | • Memindai QR / Wallet ID   |
| • Melakukan Minting SBT  | • Mengatur visibilitas   | • Memverifikasi status SBT  |
| • Revoke/Burn (jika      |   data publik            |   langsung dari Blockchain  |
|   terjadi kesalahan)     | • Membagikan link/QR     |   secara real-time          |
+--------------------------+--------------------------+-----------------------------+
🏗️ System Architecture & Data Flow
Architectural Diagram
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
Flow Proses Penerbitan & Verifikasi
Penerbitan (Minting Flow):

Admin Kampus menginput data kelulusan mahasiswa ke Portal Utama.

Backend mengunggah berkas metadata ijazah (termasuk hash ijazah PDF) ke IPFS dan mendapatkan IPFS Hash / CID.

Backend memanggil fungsi safeMintSBT(studentWallet, tokenURI) pada Smart Contract.

Token terbit dan langsung terkunci (locked) di wallet alumni.

Verifikasi (Verification Flow):

Alumni memberikan Token ID atau QR Code kepada Verifikator (HRD).

Verifikator membuka portal verifikasi publik (atau melakukan query read via RPC endpoint blockchain secara langsung).

Smart Contract mengecek:

Apakah Token ID valid & locked (isLocked() == true)?

Siapa penerbitnya (issuerAddress match dengan kampus terverifikasi)?

Metadata diambil dari IPFS untuk membandingkan kecocokan nama, NIM, jurusan, dan hash PDF ijazah.

🗄️ Database Schema & Smart Contract Data Structure

1. PostgreSQL Schema (Web2 Storage)
   Table: institutions
   Column Name	Type	Constraints	Description
   id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()	ID unik institusi
   code	VARCHAR(20)	UNIQUE, NOT NULL	Kode Perguruan Tinggi
   name	VARCHAR(255)	NOT NULL	Nama Kampus
   wallet_address	VARCHAR(42)	UNIQUE, NOT NULL	Alamat Wallet Ethereum Kampus
   created_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Waktu pendaftaran

Table: graduates
Column Name	Type	Constraints	Description
id	UUID	PRIMARY KEY	ID unik mahasiswa
nim	VARCHAR(50)	UNIQUE, NOT NULL	Nomor Induk Mahasiswa
full_name	VARCHAR(255)	NOT NULL	Nama Lengkap sesuai Ijazah
study_program	VARCHAR(100)	NOT NULL	Program Studi
wallet_address	VARCHAR(42)	NOT NULL	Alamat Wallet Alumni
degree	VARCHAR(50)	NOT NULL	Gelar Akademik (misal: S.Kom)

Table: diploma_tokens
Column Name	Type	Constraints	Description
id	UUID	PRIMARY KEY	ID Rekam Minting
graduate_id	UUID	FK -> graduates(id)	Reference ke data alumni
token_id	BIGINT	UNIQUE, NOT NULL	Token ID pada Smart Contract
ipfs_cid	VARCHAR(255)	NOT NULL	Content Identifier IPFS
tx_hash	VARCHAR(66)	NOT NULL	Hash Transaksi Minting Blockchain
certificate_number	VARCHAR(100)	UNIQUE, NOT NULL	Nomor Ijazah Nasional (PIN)
is_revoked	BOOLEAN	DEFAULT FALSE	Status pembatalan ijazah
minted_at	TIMESTAMP	DEFAULT CURRENT_TIMESTAMP	Tanggal pencetakan di blockchain

2. Smart Contract Data Structure (Solidity - Conceptual Draft)
   Solidity

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
  🚀 Getting Started & Local Development Guide
  Prerequisites
  Node.js >= 18.0.0

Docker & Docker Compose (untuk PostgreSQL & Local Hardhat Node)

Pinata API Key (untuk IPFS pinning)

Steps
Clone Repository:

Bash

git clone https://github.com/username/academix-sbt-poc.git
cd academix-sbt-poc
Environment Setup (.env):

Cuplikan kode

DATABASE_URL="postgresql://user:pass@localhost:5432/academix_db"
RPC_URL="https://rpc-amoy.polygon.technology"
PRIVATE_KEY="0x_YOUR_CONTRACT_DEPLOYER_PRIVATE_KEY"
PINATA_API_KEY="YOUR_PINATA_API_KEY"
PINATA_SECRET_KEY="YOUR_PINATA_SECRET_KEY"
Compile Smart Contract:

Bash

npx hardhat compile
Deploy Contract to Testnet:

Bash

npx hardhat run scripts/deploy.ts --network amoy
Run Backend API & Frontend:

Bash

npm run dev
📝 Roadmap
[x] Perancangan Spesifikasi SBT & Arsitektur Database Hybrid.

[ ] Implementasi Smart Contract ERC-5192 pada Testnet.

[ ] Integrasi API Backend untuk Pengunggahan Metadata ke IPFS.

[ ] Pembuatan Portal Verifikasi Publik tanpa Login Wallet (Read-Only via RPC Provider).

[ ] Pengujian Fitur Revocation (Pembatalan Ijazah Bermasalah).
