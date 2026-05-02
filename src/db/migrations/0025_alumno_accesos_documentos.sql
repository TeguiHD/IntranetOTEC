CREATE TABLE IF NOT EXISTS "alumno_accesos_documentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alumno_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "beneficio_habilitado" boolean NOT NULL DEFAULT true,
  "credencial_habilitada" boolean NOT NULL DEFAULT true,
  "actualizado_por" uuid REFERENCES "usuarios"("id"),
  "updated_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "alumno_accesos_documentos_alumno_unique" UNIQUE("alumno_id")
);

CREATE INDEX IF NOT EXISTS "alumno_accesos_documentos_alumno_idx"
  ON "alumno_accesos_documentos" ("alumno_id");

INSERT INTO "alumno_accesos_documentos" ("alumno_id", "beneficio_habilitado", "credencial_habilitada")
SELECT "id", true, true
FROM "usuarios"
WHERE "rol" = 'alumno'
ON CONFLICT ("alumno_id") DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "alumno_accesos_documentos" TO otec;
