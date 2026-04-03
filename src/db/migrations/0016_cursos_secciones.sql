-- Migración 0016: Tabla cursos (templates), enum turno, columnas nuevas en asignaturas

CREATE TYPE "turno" AS ENUM ('manana', 'tarde', 'vespertino');
--> statement-breakpoint

CREATE TABLE "cursos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nombre" text NOT NULL,
  "codigo" text NOT NULL UNIQUE,
  "descripcion" text,
  "horas_teoricas" integer DEFAULT 0,
  "horas_practicas" integer DEFAULT 0,
  "activo" boolean DEFAULT true,
  "created_by" uuid REFERENCES "usuarios"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "eliminado_at" timestamp with time zone,
  "eliminado_por" uuid
);
--> statement-breakpoint

CREATE INDEX "cursos_activo_idx" ON "cursos" ("activo") WHERE "eliminado_at" IS NULL;
--> statement-breakpoint

ALTER TABLE "asignaturas" ADD COLUMN "curso_id" uuid REFERENCES "cursos"("id");
--> statement-breakpoint
ALTER TABLE "asignaturas" ADD COLUMN "turno" "turno";
--> statement-breakpoint
ALTER TABLE "asignaturas" ADD COLUMN "fecha_fin" date;
--> statement-breakpoint

ALTER TABLE "clases" ADD COLUMN "hora_fin" time;
--> statement-breakpoint
ALTER TABLE "clases" ADD COLUMN "sala" text;
--> statement-breakpoint

ALTER TABLE "notas" ADD COLUMN "entrega_id" uuid;
--> statement-breakpoint

CREATE TABLE "bloques_horario" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "asignatura_id" uuid NOT NULL REFERENCES "asignaturas"("id"),
  "dia_semana" integer NOT NULL,
  "hora_inicio" time NOT NULL,
  "hora_fin" time NOT NULL,
  "sala" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "eliminado_at" timestamp with time zone
);
--> statement-breakpoint

CREATE INDEX "bloques_horario_asignatura_idx" ON "bloques_horario" ("asignatura_id");
--> statement-breakpoint

CREATE TYPE "estado_entrega" AS ENUM ('pendiente', 'revisado', 'requiere_correccion');
--> statement-breakpoint

CREATE TABLE "entregas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "evaluacion_id" uuid NOT NULL REFERENCES "evaluaciones"("id"),
  "matricula_id" uuid NOT NULL REFERENCES "matriculas"("id"),
  "intento" integer NOT NULL DEFAULT 1,
  "archivo_url" text,
  "archivo_nombre" text,
  "comentario_alumno" text,
  "estado" "estado_entrega" DEFAULT 'pendiente',
  "entregado_at" timestamp with time zone DEFAULT now(),
  "created_at" timestamp with time zone DEFAULT now(),
  UNIQUE ("evaluacion_id", "matricula_id", "intento")
);
--> statement-breakpoint

CREATE INDEX "entregas_evaluacion_idx" ON "entregas" ("evaluacion_id");
CREATE INDEX "entregas_matricula_idx" ON "entregas" ("matricula_id");
--> statement-breakpoint

CREATE TABLE "retroalimentacion" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entrega_id" uuid NOT NULL REFERENCES "entregas"("id"),
  "docente_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "comentario" text NOT NULL,
  "archivo_url" text,
  "nota" numeric(3,1),
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX "retroalimentacion_entrega_idx" ON "retroalimentacion" ("entrega_id");
