CREATE TABLE IF NOT EXISTS "evaluacion_destinatarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "evaluacion_id" uuid NOT NULL REFERENCES "evaluaciones"("id"),
  "matricula_id" uuid NOT NULL REFERENCES "matriculas"("id"),
  "asignado_por" uuid REFERENCES "usuarios"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "evaluacion_destinatarios_evaluacion_id_matricula_id_unique" UNIQUE("evaluacion_id", "matricula_id")
);

CREATE INDEX IF NOT EXISTS "evaluacion_destinatarios_eval_idx"
  ON "evaluacion_destinatarios" ("evaluacion_id");

CREATE INDEX IF NOT EXISTS "evaluacion_destinatarios_matricula_idx"
  ON "evaluacion_destinatarios" ("matricula_id");

CREATE TABLE IF NOT EXISTS "calendario_docente_eventos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "docente_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "fecha" date NOT NULL,
  "titulo" text NOT NULL,
  "nota" text,
  "tipo" text DEFAULT 'recordatorio' NOT NULL,
  "color" text DEFAULT '#6366F1' NOT NULL,
  "relevante" boolean DEFAULT false NOT NULL,
  "eliminado_at" timestamp with time zone,
  "eliminado_por" uuid REFERENCES "usuarios"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "calendario_docente_eventos_docente_fecha_idx"
  ON "calendario_docente_eventos" ("docente_id", "fecha")
  WHERE "eliminado_at" IS NULL;
