-- AcademixSBT — initial schema (P0)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS graduates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  nim VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  study_program VARCHAR(100) NOT NULL,
  degree VARCHAR(50) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diploma_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graduate_id UUID NOT NULL REFERENCES graduates(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  token_id BIGINT UNIQUE NOT NULL,
  ipfs_cid VARCHAR(255) NOT NULL,
  token_uri VARCHAR(255) NOT NULL,
  document_hash VARCHAR(80) NOT NULL,
  tx_hash VARCHAR(66) NOT NULL,
  issuer_address VARCHAR(42) NOT NULL,
  certificate_number VARCHAR(100) UNIQUE NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  minted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor VARCHAR(42) NOT NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_diploma_tokens_wallet ON diploma_tokens (graduate_id);
CREATE INDEX IF NOT EXISTS idx_diploma_tokens_revoked ON diploma_tokens (is_revoked);
CREATE INDEX IF NOT EXISTS idx_graduates_wallet ON graduates (wallet_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs (entity_type, entity_id);
