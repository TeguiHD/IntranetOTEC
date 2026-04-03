-- Migración 0015: Estado de ciclo de vida del alumno
-- Agrega enum estado_alumno, columna en usuarios, y tabla de historial

CREATE TYPE "estado_alumno" AS ENUM ('activo', 'egresado', 'retirado', 'suspendido', 'desertor');
--> statement-breakpoint

ALTER TABLE "usuarios" ADD COLUMN "estado_alumno" "estado_alumno";
--> statement-breakpoint

-- Poblar datos existentes desde columna activo
UPDATE "usuarios" SET "estado_alumno" = 'activo' WHERE "rol" = 'alumno' AND "activo" = true AND "eliminado_at" IS NULL;
UPDATE "usuarios" SET "estado_alumno" = 'retirado' WHERE "rol" = 'alumno' AND "activo" = false;
--> statement-breakpoint

CREATE TABLE "historial_estado_alumno" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alumno_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "estado_anterior" "estado_alumno",
  "estado_nuevo" "estado_alumno" NOT NULL,
  "motivo" text,
  "cambiado_por" uuid NOT NULL REFERENCES "usuarios"("id"),
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "historial_estado_alumno_idx" ON "historial_estado_alumno" ("alumno_id");
