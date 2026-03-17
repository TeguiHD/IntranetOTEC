CREATE TYPE "public"."tipo_solicitud_doc" AS ENUM('credencial', 'alumno_regular', 'tarjeta_beneficio');--> statement-breakpoint
CREATE TYPE "public"."estado_solicitud_doc" AS ENUM('pendiente', 'aprobada', 'rechazada');--> statement-breakpoint

CREATE TABLE "solicitudes_documentos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "alumno_id" uuid NOT NULL,
  "tipo" "tipo_solicitud_doc" NOT NULL,
  "estado" "estado_solicitud_doc" DEFAULT 'pendiente' NOT NULL,
  "observacion" text,
  "resuelto_por" uuid,
  "resuelto_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "solicitudes_documentos" ADD CONSTRAINT "solicitudes_documentos_alumno_id_usuarios_id_fk"
  FOREIGN KEY ("alumno_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solicitudes_documentos" ADD CONSTRAINT "solicitudes_documentos_resuelto_por_usuarios_id_fk"
  FOREIGN KEY ("resuelto_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "solicitudes_doc_alumno_fecha_idx" ON "solicitudes_documentos" USING btree ("alumno_id", "created_at");--> statement-breakpoint
