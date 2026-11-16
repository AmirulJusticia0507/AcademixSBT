# ðŸŽ“ AcademixSBT â€” Decentralized Diploma & Credential Verification System

> ðŸŒ [Bahasa Indonesia](./readme.md) | **English**

> **Proof of Concept (PoC)** for issuing and verifying higher-education diplomas using **Soulbound Tokens (SBT / ERC-5192 / ERC-721)** to guarantee unlimited data availability (zero downtime) and absolute anti-forgery security (non-transferable).

![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)
![Blockchain](https://img.shields.io/badge/Network-Polygon%20Amoy%20%7C%20Arbitrum%20Sepolia-purple)
![Database](https://img.shields.io/badge/Database-PostgreSQL-blue)
![Storage](https://img.shields.io/badge/Storage-IPFS-orange)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ðŸ“‘ Table of Contents

- [Executive Summary](#-executive-summary)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Agents & Roles](#-agents--roles)
- [System Architecture](#%EF%B8%8F-system-architecture--data-flow)
- [Database Schema & Smart Contract](#%EF%B8%8F-database-schema--smart-contract-data-structure)
- [Getting Started](#-getting-started--local-development-guide)
- [Gap Analysis: SIVIL / PDDikti / PISN](#-gap-analysis-sivil--pddikti--pisn)
- [Project Structure](#%EF%B8%8F-project-structure)
- [Roadmap](#-roadmap)
- [License](#-license)
- [Disclaimer](#%EF%B8%8F-disclaimer)

Full details (in Indonesian): [readme.md](./readme.md) Â· Task list: [TODO.md](./TODO.md) Â· [TODO.en.md](./TODO.en.md)

---

## ðŸ“Œ Executive Summary

Conventional diploma verification depends on centralised servers (e.g. PDDikti/SIVIL). When the server is down, verification by employers stalls.

AcademixSBT uses a **Hybrid Web2/Web3** approach:

| Feature | Explanation |
|---|---|
| **Zero-Downtime Verification** | Authenticity is anchored on a public blockchain ledger. Anyone can verify 24/7 without relying on campus/government database servers. |
| **Absolute Anti-Forgery** | Soulbound Tokens (ERC-5192) are permanently bound to the graduate's wallet and cannot be transferred or sold. |
| **Privacy Preserved** | Only cryptographic hashes (IPFS CID & SHA-256) and institution identity are stored on-chain; sensitive graduate data is encrypted in a relational database. |

---

## ðŸ› ï¸ Tech Stack

| Component | Technology |
|---|---|
| Smart Contract | Solidity (^0.8.20), OpenZeppelin (ERC-721 / ERC-5192) |
| Dev Framework | Hardhat / Foundry |
| Network | Polygon Amoy Testnet / Arbitrum Sepolia (EVM, low gas) |
| Backend API | Go (Golang) / Node.js (TypeScript) â€” Gin / Express |
| Web3 Library | ethers.js v6 / viem / wagmi |
| Off-Chain Storage | IPFS (Pinata / Web3.Storage) |
| Database | PostgreSQL |
| Frontend | Next.js / Vue.js (Tailwind CSS), RainbowKit / AppKit |

---

## ðŸ¤– Agents & Roles

| ðŸ¢ Institution (Campus) | ðŸ‘¨â€ðŸŽ“ Graduate | ðŸ” Public / Verifier (HR) |
|---|---|---|
| Register metadata, mint SBT, revoke on error | Receive SBT, control public visibility, share QR/link | Scan QR/Wallet ID, verify SBT status on-chain in real time |

---

## ðŸ—ï¸ System Architecture & Data Flow

```text
[ Frontend: Campus / Verifier Portal ]
         â”‚                    â”‚
  (REST API / Web3)     (Read-Only RPC Query)
         â”‚                    â”‚
         â–¼                    â–¼
[ Backend API ] â”€â”€â”€â”€â”€â”€â–º [ Polygon / EVM Testnet ]
         â”‚              (Smart Contract ERC-5192)
         â–¼                    â–²
[ PostgreSQL ]                â”‚ (Fetch Metadata)
 (Relational DB)             â–¼
                       [ IPFS Storage ]
```

**Minting:** Campus inputs graduate data â†’ backend uploads diploma metadata (incl. PDF hash) to IPFS â†’ calls `safeMintSBT(studentWallet, tokenURI)` â†’ token is issued and locked in the graduate's wallet.

**Verification:** Graduate shares Token ID/QR â†’ verifier opens the public portal or queries RPC directly â†’ contract checks `isLocked()`, issuer address, and IPFS metadata (name, NIM, program, PDF hash).

---

## ðŸ—„ï¸ Database Schema & Smart Contract Data Structure

PostgreSQL tables: `institutions`, `graduates`, `diploma_tokens` (see Indonesian README for full column tables).

Smart contract draft (`DiplomaSBT`, Solidity ^0.8.20, OpenZeppelin ERC-721 + AccessControl): soulbound `_update` override that reverts any transfer between wallets, `safeMintSBT`, `revokeDiploma`, `tokenURI`, `Locked`/`Revoked` events. Full code in [readme.md](./readme.md#2-smart-contract-data-structure-solidity---conceptual-draft).

---

## dYs? Getting Started

**Prerequisites:** Node.js >= 18, Docker & Docker Compose (for PostgreSQL), Pinata API Key (optional if using local IPFS).

```bash
git clone https://github.com/username/academix-sbt-poc.git
cd academix-sbt-poc

# Copy env examples and adjust values:
# backend/.env.example   -> backend/.env
# frontend/.env.example  -> frontend/.env.local
# contracts/.env.example -> contracts/.env (for contract compile/deploy)

# Install dependencies
npm install          # root runner (concurrently)
npm run install:all  # backend & frontend
# optional: cd contracts && npm install

# Run backend + frontend with one command
npm run dev
```

- Backend API: `http://localhost:4000`
- Frontend: `http://localhost:3000`
- Aliases: `npm run task` / `npm run run`. Run separately: `npm run dev:backend` or `npm run dev:frontend`.
- With [Taskfile](https://taskfile.dev) CLI installed: `task run` (see `Taskfile.yml`).

Contracts (separate): `cd contracts && npx hardhat compile` and `npm run deploy:amoy` (needs funded testnet key).

---

## ðŸ” Gap Analysis: SIVIL / PDDikti / PISN

Based on [SIVIL](https://www.ijazahkemdikbud.web.id/), [PDDikti](https://pddikti.kemdiktisaintek.go.id/), and [PISN](https://pisn.kemdiktisaintek.go.id/):

| Weakness | AcademixSBT answer |
|---|---|
| Central server = single point of failure, sync delays | Read-only verification via public RPC + IPFS |
| Manual form + captcha, typo-prone | QR / Token ID / Wallet verification |
| No cryptographic document proof | PDF SHA-256 hash anchored on-chain |
| Transferable / forgeable | Non-transferable SBT bound to graduate wallet |
| Strict PISN validators + bureaucratic exceptions | Pre-mint validator with per-check report |
| Opaque revocation | On-chain `isRevoked` status, real-time |

Full analysis in Indonesian: [readme.md](./readme.md#-analisa-kekurangan-sistem-eksisting-sivil--pddikti--pisn)

---

## ðŸ—‚ï¸ Project Structure

```text
academix-sbt/
â”œâ”€â”€ contracts/   # DiplomaSBT.sol, deploy scripts, tests
â”œâ”€â”€ backend/     # REST API, IPFS, PostgreSQL, audit log
â”œâ”€â”€ frontend/    # Campus portal & public verification portal
â”œâ”€â”€ docs/        # Architecture notes
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ TODO.md / TODO.en.md
â”œâ”€â”€ AGENTS.md
â””â”€â”€ README.md / README.en.md
```

---

## ðŸ“ Roadmap

See [TODO.md](./TODO.md) / [TODO.en.md](./TODO.en.md) for the prioritised task list (P0/P1/P2) and milestones M1â€“M5.

- [x] SBT specification & hybrid database architecture
- [x] Gap analysis of SIVIL/PDDikti/PISN
- [x] ERC-5192 `DiplomaSBT` contract + 15 passing Hardhat tests (local)
- [ ] Deploy contract to testnet (Polygon Amoy / Arbitrum Sepolia) â€” needs `PRIVATE_KEY` + funded RPC
- [x] Backend IPFS metadata upload (Pinata / local provider) + SHA-256 PDF hash
- [x] Public read-only verification portal
- [x] Revocation feature (on-chain + visible in portal)
- [x] End-to-end minting validated locally (backend â†’ IPFS â†’ on-chain â†’ graduate wallet) â€” see [docs/LOCAL_E2E.md](./docs/LOCAL_E2E.md)
- [x] Documented exception flow (SK Yudisium/BA Sidang + SPTJM + leadership approval) â€” see [docs/EXCEPTION_FLOW.md](./docs/EXCEPTION_FLOW.md)

---

## ðŸ“„ License

MIT License â€” see [LICENSE](./LICENSE).

## âš ï¸ Disclaimer

This project is a **Proof of Concept** for education and research. **Not for production use** without a smart-contract security audit, architecture review, and regulatory compliance (PDDikti / personal-data protection).

