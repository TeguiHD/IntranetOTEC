-- Migration: Unified Survey System
-- Extends evaluaciones table to support surveys (encuestas) with configurable questions,
-- audience targeting (alumnos/docentes/todos), and obligatory blocking.

-- New enum: audiencia_encuesta
DO $$ BEGIN
  CREATE TYPE "audiencia_encuesta" AS ENUM ('alumnos', 'docentes', 'todos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- New enum: estado_encuesta
DO $$ BEGIN
  CREATE TYPE "estado_encuesta" AS ENUM ('borrador', 'activa', 'cerrada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend tipo_preg enum with new question types
DO $$ BEGIN
  ALTER TYPE "tipo_preg" ADD VALUE IF NOT EXISTS 'likert';
  ALTER TYPE "tipo_preg" ADD VALUE IF NOT EXISTS 'si_no';
  ALTER TYPE "tipo_preg" ADD VALUE IF NOT EXISTS 'texto_libre';
END $$;

-- Add unified survey columns to evaluaciones
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "es_encuesta" boolean DEFAULT false;
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "audiencia" "audiencia_encuesta";
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "obligatoria" boolean DEFAULT false;
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "estado_encuesta" "estado_encuesta" DEFAULT 'borrador';
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "plantilla_origen" text;
ALTER TABLE "evaluaciones" ADD COLUMN IF NOT EXISTS "creado_por" uuid REFERENCES "usuarios"("id");

-- Index for active surveys
CREATE INDEX IF NOT EXISTS "evaluaciones_encuesta_activa_idx"
  ON "evaluaciones" ("asignatura_id")
  WHERE "es_encuesta" = true AND "eliminado_at" IS NULL;

-- Encuesta assignments table: tracks who must answer and completion status
CREATE TABLE IF NOT EXISTS "encuesta_asignaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "evaluacion_id" uuid NOT NULL REFERENCES "evaluaciones"("id"),
  "usuario_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "completada" boolean DEFAULT false,
  "completada_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "encuesta_asignaciones_eval_usuario_unique" UNIQUE("evaluacion_id", "usuario_id")
);

CREATE INDEX IF NOT EXISTS "encuesta_asig_pendiente_idx"
  ON "encuesta_asignaciones" ("usuario_id")
  WHERE "completada" = false;
