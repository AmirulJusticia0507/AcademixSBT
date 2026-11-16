# ðŸ“ AcademixSBT â€” Todo List (English)

> ðŸŒ [Bahasa Indonesia](./TODO.md) | **English**
>
> Priorities: **P0** = PoC core, **P1** = important for demo/testing, **P2** = nice-to-have/research.
> Needs are based on the gap analysis of [SIVIL](https://www.ijazahkemdikbud.web.id/), [PDDikti](https://pddikti.kemdiktisaintek.go.id/), and [PISN](https://pisn.kemdiktisaintek.go.id/) â€” see the *Gap Analysis* section in [README.en.md](./README.en.md).

---

## âœ… Done

- [x] SBT specification & hybrid database architecture
- [x] Gap analysis of SIVIL / PDDikti / PISN
- [x] README tidied + `LICENSE` (MIT) file

---

## ðŸ”œ P0 â€” Core PoC

### Smart Contract

- [x] ERC-5192 smart contract (`DiplomaSBT`) â€” implemented & local tests passing
- [ ] Deploy contract to Testnet (Polygon Amoy / Arbitrum Sepolia) â€” needs `PRIVATE_KEY` + RPC
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

### Frontend â€” Public Verification Portal

- [x] Public verification portal without wallet login (read-only via RPC provider)
- [x] Verification via QR Code (Token ID / verification URL) scannable by HR
- [x] Verification via Token ID and Wallet Address
- [x] Verification result card: valid status, name, NIM, program, degree, institution, minted date, IPFS link, revoked status
- [x] PDF hash comparison (metadata hash vs verifier-uploaded file)

---

## ðŸŽ¯ P1 â€” Important (from SIVIL / PDDikti / PISN analysis)

### Zero-Downtime & Anti Single-Point-of-Failure

- [x] Read-only verification via blockchain RPC + IPFS (works when backend/PostgreSQL is down)
- [x] IPFS metadata cache for fast verification under load
- [x] Service health-check + transparent downtime status

### Pre-Mint Validator (PISN-style)

- [x] Eligibility checklist before minting: accredited program, Graduated status, graduation date, study duration, minimum credits & GPA, NIK/passport
- [x] Ineligible-data report with specific reasons
- [x] Data correction flow in PostgreSQL + audit log
- [x] (Optional) Documented exception flow: SK Yudisium/BA Sidang + SPTJM upload, leadership approval, audit log â€” see [docs/EXCEPTION_FLOW.md](./docs/EXCEPTION_FLOW.md).

### Integration & Interoperability

- [x] Official verification API for HR/institutions (API-key auth, rate limit, OpenAPI docs)
- [x] Batch verification (many Token IDs via API)
- [x] Verification proof export (timestamped JSON from on-chain queries)
- [x] (Research) Map `certificate_number` (PIN) to the PISN national diploma number format (NINa) for PDDikti compatibility â€” see [docs/PISN_NUMBER_MAPPING.md](./docs/PISN_NUMBER_MAPPING.md).

### Privacy, Security & Compliance

- [x] Encrypt sensitive graduate data in PostgreSQL; only hashes & institution identity on-chain
- [x] Role-based access (Institution / Graduate / Public Verifier)
- [x] Smart-contract security review before mainnet
- [x] Compliance study: PDP Law, PDDikti/PISN regulation, national diploma numbering (Permendikbudristek No. 6/2022)

---

## ðŸŒ± P2 â€” Nice-to-Have / Research

- [x] Special flow for legacy / foreign / closed-institution graduates (manual verification + `manual_verified` flag in metadata)
- [x] Bulk CSV migration/import tool (format validation before mass minting)
- [x] Campus SIAKAD integration (graduation data source) to reduce manual operator input
- [x] Multi-chain / multi-institution support with on-chain issuer registry
- [x] English version of README & TODO (`README.en.md` / `TODO.en.md`)

---

## ðŸ“Œ Milestones

| Milestone | Contents | Status |
|---|---|---|
| **M1 â€” Contract live** | P0 smart contract deployed to testnet + tests passing | â¬œ |
| **M2 â€” End-to-end minting** | Backend â†’ IPFS â†’ minting â†’ locked SBT in graduate wallet | âœ… |
| **M3 â€” Public verification** | Read-only portal + QR/Token ID/Wallet, status & hash display | âœ… |
| **M4 â€” Revocation & validator** | On-chain revoke visible in portal + PISN-style pre-mint validator | âœ… |
| **M5 â€” HRD API** | API key + batch verification + proof export | âœ… |

---

## ðŸ”— References

- SIVIL: https://www.ijazahkemdikbud.web.id/
- PDDikti: https://pddikti.kemdiktisaintek.go.id/
- PISN: https://pisn.kemdiktisaintek.go.id/ Â· FAQ: https://pisn.kemdiktisaintek.go.id/faq
- Architecture, DB schema, Solidity draft: [README.en.md](./README.en.md)

