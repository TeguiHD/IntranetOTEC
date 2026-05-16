ALTER TABLE "periodos_academicos"
  ADD COLUMN IF NOT EXISTS "eliminado_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "eliminado_por" uuid;

CREATE INDEX IF NOT EXISTS "periodos_academicos_activos_idx"
  ON "periodos_academicos" ("estado")
  WHERE "eliminado_at" IS NULL;
