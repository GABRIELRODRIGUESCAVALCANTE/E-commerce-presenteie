-- Migration: 004_add_verified_at_to_email_verifications.sql
-- Descrição: Registra quando um código OTP foi validado com sucesso. O cadastro por e-mail/senha
-- passa a exigir uma verificação recente no servidor (antes a checagem existia apenas no front-end).

ALTER TABLE email_verifications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
