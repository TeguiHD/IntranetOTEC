ALTER TABLE "evaluaciones"
  ADD COLUMN IF NOT EXISTS "mostrar_resultados" boolean NOT NULL DEFAULT false;
