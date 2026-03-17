CREATE TABLE "notas_docente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "docente_id" uuid NOT NULL,
  "asignatura_id" uuid NOT NULL,
  "matricula_id" uuid NOT NULL,
  "nota" numeric(3,1) NOT NULL,
  "fecha_registro" date NOT NULL,
  "anio_registro" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE "observaciones_docente" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "docente_id" uuid NOT NULL,
  "asignatura_id" uuid NOT NULL,
  "matricula_id" uuid NOT NULL,
  "observacion" text NOT NULL,
  "fecha_registro" date NOT NULL,
  "anio_registro" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "notas_docente" ADD CONSTRAINT "notas_docente_docente_id_usuarios_id_fk"
  FOREIGN KEY ("docente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_docente" ADD CONSTRAINT "notas_docente_asignatura_id_asignaturas_id_fk"
  FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas_docente" ADD CONSTRAINT "notas_docente_matricula_id_matriculas_id_fk"
  FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "observaciones_docente" ADD CONSTRAINT "obs_docente_docente_id_usuarios_id_fk"
  FOREIGN KEY ("docente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observaciones_docente" ADD CONSTRAINT "obs_docente_asignatura_id_asignaturas_id_fk"
  FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observaciones_docente" ADD CONSTRAINT "obs_docente_matricula_id_matriculas_id_fk"
  FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "notas_docente_alumno_fecha_idx" ON "notas_docente" USING btree ("matricula_id", "fecha_registro");--> statement-breakpoint
CREATE INDEX "obs_docente_alumno_fecha_idx" ON "observaciones_docente" USING btree ("matricula_id", "fecha_registro");--> statement-breakpoint
