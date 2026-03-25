-- QR tokens para registro de asistencia por clase
CREATE TABLE IF NOT EXISTS "qr_asistencia_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clase_id" uuid NOT NULL REFERENCES "clases"("id"),
  "token" text NOT NULL UNIQUE,
  "created_by" uuid NOT NULL REFERENCES "usuarios"("id"),
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "qr_asistencia_token_idx" ON "qr_asistencia_tokens" ("token");
CREATE INDEX IF NOT EXISTS "qr_asistencia_clase_idx" ON "qr_asistencia_tokens" ("clase_id");

-- Mensajería interna por asignatura
CREATE TABLE IF NOT EXISTS "mensajes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asignatura_id" uuid NOT NULL REFERENCES "asignaturas"("id"),
  "emisor_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "contenido" text NOT NULL,
  "creado_at" timestamp with time zone DEFAULT now(),
  "eliminado_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "mensajes_asignatura_idx" ON "mensajes" ("asignatura_id");
CREATE INDEX IF NOT EXISTS "mensajes_creado_at_idx" ON "mensajes" ("creado_at");
