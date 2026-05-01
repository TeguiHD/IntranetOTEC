ALTER TABLE "evaluaciones"
ADD COLUMN IF NOT EXISTS "duracion_minutos" integer;

CREATE TABLE IF NOT EXISTS "evaluacion_intentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "evaluacion_id" uuid NOT NULL REFERENCES "evaluaciones"("id"),
  "matricula_id" uuid NOT NULL REFERENCES "matriculas"("id"),
  "intento" integer NOT NULL DEFAULT 1,
  "iniciado_at" timestamp with time zone NOT NULL DEFAULT now(),
  "enviado_at" timestamp with time zone,
  "expirado_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "evaluacion_intentos_evaluacion_id_matricula_id_intento_unique"
    UNIQUE("evaluacion_id", "matricula_id", "intento")
);

CREATE INDEX IF NOT EXISTS "evaluacion_intentos_activos_idx"
ON "evaluacion_intentos" ("evaluacion_id", "matricula_id", "iniciado_at")
WHERE "enviado_at" IS NULL AND "expirado_at" IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "evaluacion_intentos" TO otec;
