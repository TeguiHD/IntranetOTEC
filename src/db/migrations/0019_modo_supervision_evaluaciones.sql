BEGIN;

ALTER TABLE "evaluaciones"
  ADD COLUMN IF NOT EXISTS "modo_supervision" boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS "eventos_supervision" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "evaluacion_id" uuid NOT NULL REFERENCES "evaluaciones"("id"),
  "matricula_id" uuid REFERENCES "matriculas"("id"),
  "tipo" text NOT NULL,
  "payload" jsonb,
  "created_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "eventos_supervision_eval_idx"
  ON "eventos_supervision" ("evaluacion_id", "created_at");

CREATE INDEX IF NOT EXISTS "eventos_supervision_matricula_idx"
  ON "eventos_supervision" ("matricula_id", "created_at");

COMMIT;
