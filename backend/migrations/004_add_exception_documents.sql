-- P1: alur eksepsi terdokumentasi.
-- Validator ala PISN boleh dilewati hanya jika ada dokumen pendukung:
--   - SK Yudisium ATAU BA Sidang
--   - SPTJM (Surat Pernyataan Tanggung Jawab Mutlak)
-- Dokumen disimpan di arsip server (bukan on-chain/IPFS publik) karena memuat data pribadi.
CREATE TABLE IF NOT EXISTS exception_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_number VARCHAR(100) NOT NULL,
  token_id BIGINT REFERENCES diploma_tokens(token_id) ON DELETE SET NULL,
  document_type VARCHAR(20) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size_bytes INTEGER NOT NULL,
  document_hash VARCHAR(80) NOT NULL,
  archive_id VARCHAR(120) NOT NULL,
  note TEXT,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  uploaded_by VARCHAR(100) NOT NULL,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT exception_documents_type_check
    CHECK (document_type IN ('sk_yudisium', 'ba_sidang', 'sptjm')),
  CONSTRAINT exception_documents_status_check
    CHECK (approval_status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_exception_documents_certificate
  ON exception_documents (certificate_number);
CREATE INDEX IF NOT EXISTS idx_exception_documents_token
  ON exception_documents (token_id);
CREATE INDEX IF NOT EXISTS idx_exception_documents_status
  ON exception_documents (approval_status);
