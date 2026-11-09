# 📝 AcademixSBT — Todo List

> Todo list terpisah dari [README.md](./readme.md). Prioritas: **P0** = inti PoC, **P1** = penting untuk demo/uji, **P2** = nice-to-have / riset.
> Dasar kebutuhan: analisa gap [SIVIL](https://www.ijazahkemdikbud.web.id/), [PDDikti](https://pddikti.kemdiktisaintek.go.id/), dan [PISN](https://pisn.kemdiktisaintek.go.id/) — lihat section *Analisa Kekurangan Sistem Eksisting* di README.

---

## ✅ Selesai

- [x] Perancangan Spesifikasi SBT & Arsitektur Database Hybrid.
- [x] Analisa gap SIVIL / PDDikti / PISN sebagai dasar kebutuhan fitur.
- [x] README dirapikan (struktur, tabel, code block) + file `LICENSE` (MIT).

---

## 🔜 P0 — Core PoC

### Smart Contract

- [x] Implementasi Smart Contract ERC-5192 (`DiplomaSBT`) — selesai & lulus test lokal.
- [ ] Deploy kontrak ke Testnet (Polygon Amoy / Arbitrum Sepolia) — butuh `PRIVATE_KEY` + RPC.
- [x] Role `MINTER_ROLE` / `DEFAULT_ADMIN_ROLE` via OpenZeppelin `AccessControl`.
- [x] `safeMintSBT(address, tokenId, uri)` + event `Locked(tokenId)`.
- [x] `revokeDiploma(tokenId)` + mapping `isRevoked` + event `Revoked(tokenId)`.
- [x] `tokenURI(tokenId)` mengembalikan URI metadata IPFS.
- [x] Pengujian Fitur Revocation (Pembatalan Ijazah Bermasalah).
- [x] Test non-transferable: transfer antar wallet harus revert (`SBTError: Token is soulbound and non-transferable`).
- [x] Test hanya wallet institusi terdaftar (`issuerAddress`) yang dapat minting.

### Backend & IPFS

- [ ] Integrasi API Backend untuk Pengunggahan Metadata ke IPFS (Pinata / Web3.Storage).
- [ ] Hitung hash SHA-256 berkas PDF ijazah di backend; simpan hash + IPFS CID di metadata.
- [ ] Simpan record minting ke PostgreSQL (`diploma_tokens`: `token_id`, `ipfs_cid`, `tx_hash`, `certificate_number`, `is_revoked`, `minted_at`).
- [ ] Audit log: siapa memasukkan/mengubah data apa, kapan.

### Frontend — Portal Verifikasi Publik

- [ ] Pembuatan Portal Verifikasi Publik tanpa Login Wallet (Read-Only via RPC Provider).
- [ ] Verifikasi via QR Code (berisi Token ID / URL verifikasi) yang dapat dipindai HRD.
- [ ] Verifikasi via Token ID dan Wallet Address sebagai alternatif.
- [ ] Kartu hasil verifikasi: status valid, nama, NIM, Prodi, gelar, institusi, tanggal minting, link IPFS, status revoked.
- [ ] Tampilkan perbandingan hash PDF (hash di metadata vs hash berkas yang diunggah verifier).

---

## 🎯 P1 — Penting (dari analisa SIVIL / PDDikti / PISN)

### Zero-Downtime & Anti Single-Point-of-Failure

- [ ] Portal verifikasi read-only via RPC blockchain + IPFS (tetap berfungsi saat backend/PostgreSQL down, pakai fallback RPC provider publik).
- [ ] Cache metadata IPFS di CDN/edge agar verifikasi tetap cepat saat trafik tinggi.
- [ ] Status kesehatan layanan (health-check) + halaman status downtime transparan.

### Pre-Mint Validator ala PISN

- [ ] Checklist eligible sebelum minting: Prodi terakreditasi, status Lulus, tanggal yudisium terisi, masa studi, minimal SKS & IPK, NIK/passport terisi.
- [ ] Laporan data tidak eligible + alasan spesifik (bukan sekadar "tidak ditemukan").
- [ ] Alur koreksi data di PostgreSQL + audit log.
- [ ] (Opsional) Alur eksepsi terdokumentasi: upload SK Yudisium/BA Sidang + SPTJM, persetujuan pimpinan PT, tercatat di audit log.

### Integrasi & Interoperabilitas

- [ ] API verifikasi resmi untuk HRD/instansi (auth via API key, rate-limit, dokumentasi OpenAPI).
- [ ] Batch verification (verifikasi banyak Token ID sekaligus via CSV/API).
- [ ] Ekspor bukti verifikasi (PDF/JSON bertanda waktu dari hasil query on-chain).
- [ ] (Riset) Mapping kolom `certificate_number` (PIN) ke format Nomor Ijazah Nasional PISN agar kompatibel dengan PDDikti.

### Privasi, Keamanan & Kepatuhan

- [ ] Enkripsi data sensitif alumni di PostgreSQL; hanya hash & identitas institusi yang on-chain.
- [ ] Role-based access (Institution / Alumni / Public Verifier).
- [ ] Review keamanan smart contract sebelum mainnet.
- [ ] Kajian kepatuhan: UU PDP, regulasi PDDikti/PISN, dan penomoran ijazah nasional (Permendikbudristek No. 6 Tahun 2022).

---

## 🌱 P2 — Nice-to-Have / Riset

- [ ] Alur khusus lulusan lama / ijazah luar negeri / PT tutup (verval manual + tanda `manual_verified` di metadata).
- [ ] Tool migrasi/input massal dari data CSV kampus (validasi format sebelum minting massal).
- [ ] Integrasi SIAKAD kampus (sumber data kelulusan) untuk mengurangi input manual operator.
- [ ] Dukungan multi-chain / multi-institusi dengan registry issuer on-chain.
- [ ] Versi English dari README & TODO (`README.en.md`).

---

## 📌 Milestone yang Diusulkan

| Milestone | Isi | Status |
|---|---|---|
| **M1 — Kontrak jalan** | P0 Smart Contract ter-deploy di testnet + test lulus | ⬜ |
| **M2 — Minting end-to-end** | Backend → IPFS → minting → SBT terkunci di wallet alumni | ⬜ |
| **M3 — Verifikasi publik** | Portal read-only + QR/Token ID/Wallet, tampilkan status & hash | ⬜ |
| **M4 — Revocation & validator** | Revoke on-chain terlihat di portal + pre-mint validator ala PISN | ⬜ |
| **M5 — API untuk HRD** | API key + batch verification + ekspor bukti | ⬜ |

---

## 🔗 Referensi

- SIVIL: https://www.ijazahkemdikbud.web.id/
- PDDikti: https://pddikti.kemdiktisaintek.go.id/
- PISN: https://pisn.kemdiktisaintek.go.id/ · FAQ: https://pisn.kemdiktisaintek.go.id/faq
- README (arsitektur, schema DB, draft Solidity): [readme.md](./readme.md)
