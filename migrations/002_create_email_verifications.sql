-- Migration: 002_create_email_verifications.sql
-- Descrição: Criação da tabela para armazenamento seguro de códigos OTP de verificação de e-mail.

CREATE TABLE IF NOT EXISTS email_verifications (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    verification_token VARCHAR(64),
    attempts INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);
