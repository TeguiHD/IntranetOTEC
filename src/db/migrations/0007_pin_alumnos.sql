ALTER TABLE "usuarios" ADD COLUMN "pin_cambiado" boolean DEFAULT false;
ALTER TYPE "audit_accion" ADD VALUE IF NOT EXISTS 'cambiar_password';
