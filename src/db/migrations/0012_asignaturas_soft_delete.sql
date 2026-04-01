-- Migration: Soft delete para asignaturas
ALTER TABLE "asignaturas" ADD COLUMN IF NOT EXISTS "eliminado_at" timestamp with time zone;
ALTER TABLE "asignaturas" ADD COLUMN IF NOT EXISTS "eliminado_por" uuid;
