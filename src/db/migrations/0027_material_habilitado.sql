ALTER TABLE "material"
  ADD COLUMN IF NOT EXISTS "habilitado" boolean DEFAULT true NOT NULL;

DROP INDEX IF EXISTS "material_activo_idx";

CREATE INDEX IF NOT EXISTS "material_activo_idx"
  ON "material" ("clase_id")
  WHERE "eliminado_at" IS NULL AND "habilitado" = true;
