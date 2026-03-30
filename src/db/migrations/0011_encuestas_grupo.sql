-- Migration: Encuestas grupo_id para campañas multi-asignatura
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "grupo_id" uuid;

CREATE INDEX IF NOT EXISTS "evaluaciones_grupo_idx"
  ON "evaluaciones" ("grupo_id")
  WHERE "grupo_id" IS NOT NULL;
