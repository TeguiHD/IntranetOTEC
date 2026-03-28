-- Renombrar alumno_id → usuario_id en push_subscriptions
ALTER TABLE "push_subscriptions" RENAME COLUMN "alumno_id" TO "usuario_id";
DROP INDEX IF EXISTS "push_sub_alumno_idx";
CREATE INDEX "push_sub_usuario_idx" ON "push_subscriptions" ("usuario_id");

-- Renombrar alumno_id → usuario_id en notificaciones_destinatarios
ALTER TABLE "notificaciones_destinatarios" RENAME COLUMN "alumno_id" TO "usuario_id";
DROP INDEX IF EXISTS "notif_dest_alumno_idx";
CREATE INDEX "notif_dest_usuario_idx" ON "notificaciones_destinatarios" ("usuario_id");
-- Recrear unique constraint con nuevo nombre
ALTER TABLE "notificaciones_destinatarios"
  DROP CONSTRAINT IF EXISTS "notificaciones_destinatarios_notificacion_id_alumno_id_unique";
ALTER TABLE "notificaciones_destinatarios"
  ADD CONSTRAINT "notif_dest_unique" UNIQUE ("notificacion_id", "usuario_id");
