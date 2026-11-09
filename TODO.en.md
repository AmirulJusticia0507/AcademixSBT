# 📝 AcademixSBT — Todo List (English)

> 🌐 [Bahasa Indonesia](./TODO.md) | **English**
>
> Priorities: **P0** = PoC core, **P1** = important for demo/testing, **P2** = nice-to-have/research.
> Needs are based on the gap analysis of [SIVIL](https://www.ijazahkemdikbud.web.id/), [PDDikti](https://pddikti.kemdiktisaintek.go.id/), and [PISN](https://pisn.kemdiktisaintek.go.id/) — see the *Gap Analysis* section in [README.en.md](./README.en.md).

---

## ✅ Done

- [x] SBT specification & hybrid database architecture
- [x] Gap analysis of SIVIL / PDDikti / PISN
- [x] README tidied + `LICENSE` (MIT) file

---

## 🔜 P0 — Core PoC

### Smart Contract

- [x] ERC-5192 smart contract (`DiplomaSBT`) — implemented & local tests passing
- [ ] Deploy contract to Testnet (Polygon Amoy / Arbitrum Sepolia) — needs `PRIVATE_KEY` + RPC
- [x] `MINTER_ROLE` / `DEFAULT_ADMIN_ROLE` via OpenZeppelin `AccessControl`
- [x] `safeMintSBT(address, tokenId, uri)` + `Locked(tokenId)` event
- [x] `revokeDiploma(tokenId)` + `isRevoked` mapping + `Revoked(tokenId)` event
- [x] `tokenURI(tokenId)` returns IPFS metadata URI
- [x] Revocation feature testing
- [x] Non-transferable test: transfers revert (`SBTError: Token is soulbound and non-transferable`)
- [x] Only registered issuer wallets can mint

### Backend & IPFS

- [x] Backend API integration for uploading metadata to IPFS (Pinata / local)
- [x] SHA-256 hash of diploma PDF in backend; hash + IPFS CID stored in metadata
- [x] Minting records saved to PostgreSQL (`diploma_tokens`)
- [x] Audit log: who changed what, when

### Frontend — Public Verification Portal

- [x] Public verification portal without wallet login (read-only via RPC provider)
- [x] Verification via QR Code (Token ID / verification URL) scannable by HR
- [x] Verification via Token ID and Wallet Address
- [x] Verification result card: valid status, name, NIM, program, degree, institution, minted date, IPFS link, revoked status
- [x] PDF hash comparison (metadata hash vs verifier-uploaded file)

---

## 🎯 P1 — Important (from SIVIL / PDDikti / PISN analysis)

### Zero-Downtime & Anti Single-Point-of-Failure

- [x] Read-only verification via blockchain RPC + IPFS (works when backend/PostgreSQL is down)
- [x] IPFS metadata cache for fast verification under load
- [x] Service health-check + transparent downtime status

### Pre-Mint Validator (PISN-style)

- [x] Eligibility checklist before minting: accredited program, Graduated status, graduation date, study duration, minimum credits & GPA, NIK/passport
- [x] Ineligible-data report with specific reasons
- [x] Data correction flow in PostgreSQL + audit log
- [ ] (Optional) Documented exception flow: SK Yudisium/BA Sidang + SPTJM upload — *exception flag + reason exist; document upload pending*

### Integration & Interoperability

- [x] Official verification API for HR/institutions (API-key auth, rate limit, OpenAPI docs)
- [x] Batch verification (many Token IDs via API)
- [x] Verification proof export (timestamped JSON from on-chain queries)
- [ ] (Research) Map `certificate_number` (PIN) to the PISN national diploma number format

### Privacy, Security & Compliance

- [x] Encrypt sensitive graduate data in PostgreSQL; only hashes & institution identity on-chain
- [x] Role-based access (Institution / Graduate / Public Verifier)
- [x] Smart-contract security review before mainnet
- [x] Compliance study: PDP Law, PDDikti/PISN regulation, national diploma numbering (Permendikbudristek No. 6/2022)

---

## 🌱 P2 — Nice-to-Have / Research

- [x] Special flow for legacy / foreign / closed-institution graduates (manual verification + `manual_verified` flag in metadata)
- [x] Bulk CSV migration/import tool (format validation before mass minting)
- [x] Campus SIAKAD integration (graduation data source) to reduce manual operator input
- [x] Multi-chain / multi-institution support with on-chain issuer registry
- [x] English version of README & TODO (`README.en.md` / `TODO.en.md`)

---

## 📌 Milestones

| Milestone | Contents | Status |
|---|---|---|
| **M1 — Contract live** | P0 smart contract deployed to testnet + tests passing | ⬜ |
| **M2 — End-to-end minting** | Backend → IPFS → minting → locked SBT in graduate wallet | ⬜ |
| **M3 — Public verification** | Read-only portal + QR/Token ID/Wallet, status & hash display | ⬜ |
| **M4 — Revocation & validator** | On-chain revoke visible in portal + PISN-style pre-mint validator | ✅ |
| **M5 — HRD API** | API key + batch verification + proof export | ✅ |

---

## 🔗 References

- SIVIL: https://www.ijazahkemdikbud.web.id/
- PDDikti: https://pddikti.kemdiktisaintek.go.id/
- PISN: https://pisn.kemdiktisaintek.go.id/ · FAQ: https://pisn.kemdiktisaintek.go.id/faq
- Architecture, DB schema, Solidity draft: [README.en.md](./README.en.md)
