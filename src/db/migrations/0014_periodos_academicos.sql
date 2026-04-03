DO $$ BEGIN
  CREATE TYPE "estado_periodo" AS ENUM ('planificado', 'activo', 'cerrado');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "periodos_academicos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "codigo" text NOT NULL,
  "nombre" text NOT NULL,
  "fecha_inicio" date NOT NULL,
  "fecha_fin" date NOT NULL,
  "estado" "estado_periodo" DEFAULT 'activo' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "periodos_academicos_codigo_unique" UNIQUE("codigo")
);

CREATE INDEX IF NOT EXISTS "periodos_academicos_rango_idx"
  ON "periodos_academicos" USING btree ("fecha_inicio", "fecha_fin");

ALTER TABLE "asignaturas"
  ADD COLUMN IF NOT EXISTS "periodo_id" uuid;

DO $$ BEGIN
  ALTER TABLE "asignaturas"
    ADD CONSTRAINT "asignaturas_periodo_id_periodos_academicos_id_fk"
    FOREIGN KEY ("periodo_id")
    REFERENCES "public"."periodos_academicos"("id")
    ON DELETE no action
    ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "asignaturas_periodo_idx"
  ON "asignaturas" USING btree ("periodo_id");
