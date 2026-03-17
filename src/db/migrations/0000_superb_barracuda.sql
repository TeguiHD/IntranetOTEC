CREATE TYPE "public"."audit_accion" AS ENUM('login_ok', 'login_fail', 'logout', 'crear', 'editar', 'desactivar', 'archivar', 'cerrar_ciclo', 'emitir_certificado', 'invalidar_certificado', 'subir_material', 'exportar_excel', 'cambiar_nota', 'registrar_asistencia');--> statement-breakpoint
CREATE TYPE "public"."estado_asig" AS ENUM('borrador', 'activo', 'finalizado', 'archivado');--> statement-breakpoint
CREATE TYPE "public"."estado_asist" AS ENUM('presente', 'ausente', 'tardanza', 'justificado');--> statement-breakpoint
CREATE TYPE "public"."estado_pago" AS ENUM('pendiente', 'pagado', 'mora', 'becado');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('admin', 'docente', 'alumno');--> statement-breakpoint
CREATE TYPE "public"."tipo_cert" AS ENUM('alumno_regular', 'termino_curso');--> statement-breakpoint
CREATE TYPE "public"."tipo_eval" AS ENUM('formulario', 'tarea', 'examen', 'proyecto');--> statement-breakpoint
CREATE TYPE "public"."tipo_fin" AS ENUM('ingreso', 'gasto');--> statement-breakpoint
CREATE TYPE "public"."tipo_preg" AS ENUM('opcion_multiple', 'verdadero_falso', 'respuesta_corta', 'desarrollo');--> statement-breakpoint
CREATE TYPE "public"."tipo_video" AS ENUM('youtube', 'vimeo', 'drive', 'directo');--> statement-breakpoint
CREATE TABLE "asignaturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"codigo" text,
	"docente_id" uuid,
	"fecha_inicio" date NOT NULL,
	"duracion_meses" integer NOT NULL,
	"estado" "estado_asig" DEFAULT 'borrador',
	"max_alumnos" integer DEFAULT 30,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "asignaturas_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "asistencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clase_id" uuid NOT NULL,
	"matricula_id" uuid NOT NULL,
	"estado" "estado_asist" DEFAULT 'ausente',
	"observacion" text,
	"registrado_por" uuid,
	"fecha_registro" timestamp with time zone DEFAULT now(),
	CONSTRAINT "asistencia_clase_id_matricula_id_unique" UNIQUE("clase_id","matricula_id")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"user_rol" "rol",
	"accion" "audit_accion" NOT NULL,
	"entidad" text,
	"entidad_id" uuid,
	"payload" jsonb,
	"ip" text,
	"user_agent" text,
	"exitoso" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo_unico" text NOT NULL,
	"matricula_id" uuid NOT NULL,
	"tipo" "tipo_cert" NOT NULL,
	"datos_snapshot" jsonb NOT NULL,
	"url_publica" text,
	"qr_payload" text,
	"generado_por" uuid,
	"fecha_emision" timestamp with time zone DEFAULT now(),
	"valido" boolean DEFAULT true,
	CONSTRAINT "certificados_codigo_unico_unique" UNIQUE("codigo_unico")
);
--> statement-breakpoint
CREATE TABLE "clases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"numero_sesion" integer NOT NULL,
	"fecha" date NOT NULL,
	"hora_inicio" time,
	"url_grabacion" text,
	"tipo_url" "tipo_video",
	"publicada" boolean DEFAULT false,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "clases_asignatura_id_numero_sesion_unique" UNIQUE("asignatura_id","numero_sesion")
);
--> statement-breakpoint
CREATE TABLE "evaluaciones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"tipo" "tipo_eval" NOT NULL,
	"ponderacion" numeric(5, 2),
	"fecha_inicio" timestamp with time zone,
	"fecha_limite" timestamp with time zone,
	"intentos_max" integer DEFAULT 1,
	"instrucciones" text,
	"publicada" boolean DEFAULT false,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "finanzas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo" "tipo_fin" NOT NULL,
	"monto" numeric(12, 2) NOT NULL,
	"descripcion" text NOT NULL,
	"categoria" text,
	"asignatura_id" uuid,
	"fecha" date NOT NULL,
	"comprobante_url" text,
	"created_by" uuid,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "material" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clase_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"storage_path" text NOT NULL,
	"hash_md5" text NOT NULL,
	"tamanio_bytes" integer,
	"subido_por" uuid,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "matriculas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alumno_id" uuid NOT NULL,
	"asignatura_id" uuid NOT NULL,
	"monto_arancel" numeric(10, 2),
	"estado_pago" "estado_pago" DEFAULT 'pendiente',
	"fecha_pago" date,
	"activa" boolean DEFAULT true,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "matriculas_alumno_id_asignatura_id_unique" UNIQUE("alumno_id","asignatura_id")
);
--> statement-breakpoint
CREATE TABLE "notas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluacion_id" uuid NOT NULL,
	"matricula_id" uuid NOT NULL,
	"nota" numeric(3, 1),
	"observacion" text,
	"entrega_url" text,
	"calificado_por" uuid,
	"fecha_nota" timestamp with time zone DEFAULT now(),
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	CONSTRAINT "notas_evaluacion_id_matricula_id_unique" UNIQUE("evaluacion_id","matricula_id")
);
--> statement-breakpoint
CREATE TABLE "preguntas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluacion_id" uuid NOT NULL,
	"enunciado" text NOT NULL,
	"tipo" "tipo_preg" NOT NULL,
	"opciones" jsonb,
	"puntaje" numeric(5, 2) DEFAULT '1',
	"orden" integer,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid
);
--> statement-breakpoint
CREATE TABLE "rate_limit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ip" text NOT NULL,
	"endpoint" text NOT NULL,
	"intentos" integer DEFAULT 1,
	"bloqueado_at" timestamp with time zone,
	"ventana_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "respuestas_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluacion_id" uuid NOT NULL,
	"matricula_id" uuid NOT NULL,
	"pregunta_id" uuid NOT NULL,
	"respuesta" text,
	"es_correcta" boolean,
	"intento" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rut" text,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"email" text,
	"password" text,
	"rol" "rol" NOT NULL,
	"avatar_url" text,
	"activo" boolean DEFAULT true,
	"eliminado_at" timestamp with time zone,
	"eliminado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "usuarios_rut_unique" UNIQUE("rut"),
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "asignaturas" ADD CONSTRAINT "asignaturas_docente_id_usuarios_id_fk" FOREIGN KEY ("docente_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asignaturas" ADD CONSTRAINT "asignaturas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_clase_id_clases_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_matricula_id_matriculas_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asistencia" ADD CONSTRAINT "asistencia_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_matricula_id_matriculas_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_generado_por_usuarios_id_fk" FOREIGN KEY ("generado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clases" ADD CONSTRAINT "clases_asignatura_id_asignaturas_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluaciones" ADD CONSTRAINT "evaluaciones_asignatura_id_asignaturas_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finanzas" ADD CONSTRAINT "finanzas_asignatura_id_asignaturas_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "finanzas" ADD CONSTRAINT "finanzas_created_by_usuarios_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_clase_id_clases_id_fk" FOREIGN KEY ("clase_id") REFERENCES "public"."clases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material" ADD CONSTRAINT "material_subido_por_usuarios_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_alumno_id_usuarios_id_fk" FOREIGN KEY ("alumno_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matriculas" ADD CONSTRAINT "matriculas_asignatura_id_asignaturas_id_fk" FOREIGN KEY ("asignatura_id") REFERENCES "public"."asignaturas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_evaluacion_id_evaluaciones_id_fk" FOREIGN KEY ("evaluacion_id") REFERENCES "public"."evaluaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_matricula_id_matriculas_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notas" ADD CONSTRAINT "notas_calificado_por_usuarios_id_fk" FOREIGN KEY ("calificado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preguntas" ADD CONSTRAINT "preguntas_evaluacion_id_evaluaciones_id_fk" FOREIGN KEY ("evaluacion_id") REFERENCES "public"."evaluaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_formulario" ADD CONSTRAINT "respuestas_formulario_evaluacion_id_evaluaciones_id_fk" FOREIGN KEY ("evaluacion_id") REFERENCES "public"."evaluaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_formulario" ADD CONSTRAINT "respuestas_formulario_matricula_id_matriculas_id_fk" FOREIGN KEY ("matricula_id") REFERENCES "public"."matriculas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "respuestas_formulario" ADD CONSTRAINT "respuestas_formulario_pregunta_id_preguntas_id_fk" FOREIGN KEY ("pregunta_id") REFERENCES "public"."preguntas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_accion_idx" ON "audit_logs" USING btree ("accion");--> statement-breakpoint
CREATE INDEX "audit_fecha_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "clases_activas_idx" ON "clases" USING btree ("asignatura_id") WHERE "clases"."eliminado_at" IS NULL AND "clases"."publicada" = true;--> statement-breakpoint
CREATE INDEX "evaluaciones_activas_idx" ON "evaluaciones" USING btree ("asignatura_id") WHERE "evaluaciones"."eliminado_at" IS NULL AND "evaluaciones"."publicada" = true;--> statement-breakpoint
CREATE INDEX "finanzas_activas_idx" ON "finanzas" USING btree ("fecha") WHERE "finanzas"."eliminado_at" IS NULL;--> statement-breakpoint
CREATE INDEX "material_storage_path_idx" ON "material" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "material_activo_idx" ON "material" USING btree ("clase_id") WHERE "material"."eliminado_at" IS NULL;--> statement-breakpoint
CREATE INDEX "material_hash_idx" ON "material" USING btree ("hash_md5");--> statement-breakpoint
CREATE INDEX "matriculas_activas_idx" ON "matriculas" USING btree ("asignatura_id") WHERE "matriculas"."eliminado_at" IS NULL;--> statement-breakpoint
CREATE INDEX "notas_activas_idx" ON "notas" USING btree ("matricula_id") WHERE "notas"."eliminado_at" IS NULL;--> statement-breakpoint
CREATE INDEX "preguntas_activas_idx" ON "preguntas" USING btree ("evaluacion_id") WHERE "preguntas"."eliminado_at" IS NULL;--> statement-breakpoint
CREATE INDEX "rate_limit_ip_endpoint_idx" ON "rate_limit_log" USING btree ("ip","endpoint");--> statement-breakpoint
CREATE INDEX "rate_limit_bloqueado_idx" ON "rate_limit_log" USING btree ("bloqueado_at");