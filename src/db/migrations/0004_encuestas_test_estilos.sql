-- Tabla de configuración de encuesta por asignatura
CREATE TABLE IF NOT EXISTS "encuesta_docente_config" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asignatura_id" uuid NOT NULL REFERENCES "asignaturas"("id"),
  "habilitada" boolean DEFAULT false,
  "updated_at" timestamptz DEFAULT now(),
  CONSTRAINT "encuesta_docente_config_asignatura_id_unique" UNIQUE("asignatura_id")
);

-- Tabla de respuestas de encuesta docente/OTEC
CREATE TABLE IF NOT EXISTS "encuestas_docente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asignatura_id" uuid NOT NULL REFERENCES "asignaturas"("id"),
  "alumno_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "respuestas" jsonb NOT NULL,
  "promedio_docente" numeric(3,1),
  "promedio_otec" numeric(3,1),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "encuestas_docente_asig_alumno_unique" UNIQUE("asignatura_id", "alumno_id")
);

CREATE INDEX IF NOT EXISTS "encuesta_docente_asig_idx" ON "encuestas_docente" ("asignatura_id");

-- Tabla de test de estilos de aprendizaje
CREATE TABLE IF NOT EXISTS "test_estilos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alumno_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "intento" integer NOT NULL DEFAULT 1,
  "respuestas" jsonb NOT NULL,
  "puntaje_visual" numeric(4,1),
  "puntaje_auditivo" numeric(4,1),
  "puntaje_kinestesico" numeric(4,1),
  "estilo_preferente" text,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "test_estilos_alumno_intento_unique" UNIQUE("alumno_id", "intento")
);

CREATE INDEX IF NOT EXISTS "test_estilos_alumno_idx" ON "test_estilos" ("alumno_id");
