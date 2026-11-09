-- P2: tanda verval manual (lulusan lama / luar negeri / PT tutup)
ALTER TABLE diploma_tokens ADD COLUMN IF NOT EXISTS manual_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE diploma_tokens ADD COLUMN IF NOT EXISTS verification_mode VARCHAR(20) NOT NULL DEFAULT 'standard';
