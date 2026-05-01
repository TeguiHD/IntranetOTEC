ALTER TABLE "evaluacion_intentos"
  ADD COLUMN IF NOT EXISTS "prorrogada_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "anulado_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "anulado_por" uuid REFERENCES "usuarios"("id");

DROP INDEX IF EXISTS "evaluacion_intentos_activos_idx";
CREATE INDEX IF NOT EXISTS "evaluacion_intentos_activos_idx"
ON "evaluacion_intentos" ("evaluacion_id", "matricula_id", "iniciado_at")
WHERE "enviado_at" IS NULL AND "expirado_at" IS NULL AND "anulado_at" IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "evaluacion_intentos" TO otec;
