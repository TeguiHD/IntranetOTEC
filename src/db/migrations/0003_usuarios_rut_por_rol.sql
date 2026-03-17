ALTER TABLE "usuarios" DROP CONSTRAINT IF EXISTS "usuarios_rut_unique";
DROP INDEX IF EXISTS "usuarios_rut_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_rut_rol_unique"
  ON "usuarios" ("rut", "rol")
  WHERE "rut" IS NOT NULL;
