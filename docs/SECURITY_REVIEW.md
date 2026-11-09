# Security Review — Smart Contract & Backend (P1)

> Review mandiri untuk PoC. **Bukan audit profesional.** Wajib audit pihak ketiga sebelum mainnet/production.

## Smart Contract (`contracts/contracts/DiplomaSBT.sol`)

| Area | Status | Catatan |
|---|---|---|
| Soulbound | ✅ | `_update` revert transfer antar wallet; mint/burn diizinkan |
| AccessControl | ✅ | `MINTER_ROLE` untuk mint, `DEFAULT_ADMIN_ROLE` untuk revoke & kelola issuer |
| Issuer registry | ✅ | `isRegisteredIssuer` + `issuerOf(tokenId)` untuk verifikasi publik |
| Revocation | ✅ | Tidak burn; set `isRevoked` + event `Revoked` (bukti tetap teraudit) |
| Reentrancy | ✅ | Tidak ada transfer ETH / callback eksternal selain `_safeMint` ERC721 standar |
| Integer / overflow | ✅ | Solidity 0.8.x checked arithmetic |
| Front-running tokenId | ⚠️ | Token ID dipilih operator; pertimbangkan auto-increment / commit-reveal |
| Upgradeability | — | Kontrak tidak upgradeable (proxy); perubahan = deploy baru + migrasi |

Checklist sebelum mainnet:
- [ ] Audit pihak ketiga (Slither, Mythril, review manual)
- [ ] Uji fuzz untuk invariant soulbound & role
- [ ] Verifikasi kontrak di Polygonscan/Arbiscan + simpan ABI & alamat resmi
- [ ] Multisig untuk `DEFAULT_ADMIN_ROLE` (bukan EOA tunggal)

## Backend

| Area | Status | Catatan |
|---|---|---|
| Auth | ✅ | API key timing-safe (`timingSafeEqual`), RBAC admin/verifier/public |
| Rate-limit | ✅ | In-memory 120 req/menit/IP; ganti Redis untuk multi-instance |
| Upload | ✅ | Hanya PDF, maks 10 MB, disimpan di memory (tidak ditulis ke disk) |
| Validasi input | ✅ | Zod di semua endpoint; Token ID & wallet strict regex |
| Enkripsi sensitif | ✅ | AES-256-GCM untuk NIK/paspor (`ENCRYPTION_KEY` base64 32 byte) |
| Logging | ✅ | Audit log mint/revoke di PostgreSQL; jangan log API key / private key |
| Secrets | ✅ | `.env` di-`.gitignore`; tidak pernah commit `PRIVATE_KEY` |

## Yang belum dilakukan (terblokir / manual)

- [ ] Audit smart contract pihak ketiga — butuh vendor & anggaran, di luar scope PoC
- [ ] Pentest backend & review dependency (`npm audit`)
- [ ] Penilaian DPIA UU PDP oleh DPO institusi
