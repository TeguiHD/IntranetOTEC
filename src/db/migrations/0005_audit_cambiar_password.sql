-- Add 'cambiar_password' to audit_accion enum
-- PostgreSQL requires ALTER TYPE to add enum values
ALTER TYPE audit_accion ADD VALUE IF NOT EXISTS 'cambiar_password';
