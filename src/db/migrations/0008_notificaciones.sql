CREATE TYPE "public"."tipo_notificacion" AS ENUM('general', 'curso', 'individual');--> statement-breakpoint

CREATE TABLE "notificaciones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "titulo" text NOT NULL,
  "contenido" text NOT NULL,
  "tipo" "tipo_notificacion" DEFAULT 'general',
  "emisor_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "asignatura_id" uuid REFERENCES "asignaturas"("id"),
  "created_at" timestamp with time zone DEFAULT now(),
  "eliminado_at" timestamp with time zone
);--> statement-breakpoint

CREATE TABLE "notificaciones_destinatarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "notificacion_id" uuid NOT NULL REFERENCES "notificaciones"("id"),
  "alumno_id" uuid NOT NULL REFERENCES "usuarios"("id"),
  "leido_at" timestamp with time zone,
  CONSTRAINT "notificaciones_destinatarios_notificacion_id_alumno_id_unique" UNIQUE("notificacion_id", "alumno_id")
);--> statement-breakpoint

CREATE INDEX "notificaciones_emisor_idx" ON "notificaciones" USING btree ("emisor_id");--> statement-breakpoint
CREATE INDEX "notificaciones_created_at_idx" ON "notificaciones" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notif_dest_notificacion_idx" ON "notificaciones_destinatarios" USING btree ("notificacion_id");--> statement-breakpoint
CREATE INDEX "notif_dest_alumno_idx" ON "notificaciones_destinatarios" USING btree ("alumno_id");
