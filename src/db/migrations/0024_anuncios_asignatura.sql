CREATE TABLE IF NOT EXISTS "anuncios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asignatura_id" uuid NOT NULL REFERENCES "asignaturas"("id"),
  "autor_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "titulo" text NOT NULL,
  "contenido" text NOT NULL,
  "fijado" boolean NOT NULL DEFAULT false,
  "eliminado_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "anuncios_asignatura_idx" ON "anuncios" ("asignatura_id")
  WHERE "eliminado_at" IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "anuncios" TO otec;
