-- #45: unique constraint on notas_docente (matricula + asignatura + fecha)
ALTER TABLE "notas_docente"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS "notas_docente_matricula_asig_fecha_uniq"
  ON "notas_docente" ("matricula_id", "asignatura_id", "fecha_registro");

-- #46: unique constraint on observaciones_docente (matricula + asignatura + fecha)
ALTER TABLE "observaciones_docente"
  ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS "obs_docente_matricula_asig_fecha_uniq"
  ON "observaciones_docente" ("matricula_id", "asignatura_id", "fecha_registro");
