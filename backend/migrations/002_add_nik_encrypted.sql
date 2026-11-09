-- P1: kolom sensitif terenkripsi (NIK) — TIDAK pernah on-chain / IPFS publik
ALTER TABLE graduates ADD COLUMN IF NOT EXISTS nik_encrypted TEXT;
ALTER TABLE graduates ADD COLUMN IF NOT EXISTS passport_encrypted TEXT;
