"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { auditLogs, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { requireActionActor } from "./_security";

/**
 * Retorna la última marca de reset de la vista de auditoría.
 * Estas marcas se almacenan como logs con entidad="auditoria" y accion="cerrar_ciclo".
 */
export async function obtenerUltimaLimpiezaAuditoria(): Promise<{
  id: string;
  createdAt: Date | null;
  usuarioNombre: string | null;
  usuarioApellido: string | null;
} | null> {
  const db = getDb();

  const [row] = await db
    .select({
      id: auditLogs.id,
      createdAt: auditLogs.createdAt,
      usuarioNombre: usuarios.nombre,
      usuarioApellido: usuarios.apellido,
    })
    .from(auditLogs)
    .leftJoin(usuarios, eq(auditLogs.userId, usuarios.id))
    .where(and(eq(auditLogs.accion, "cerrar_ciclo"), eq(auditLogs.entidad, "auditoria")))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);

  return row ?? null;
}

/**
 * Marca un punto de reset visual en la auditoría.
 * No elimina ningún dato: inserta una entrada especial que el panel usa
 * para filtrar logs anteriores a esa fecha.
 * Preserva trazabilidad completa: quién limpió y cuándo.
 */
export async function limpiarVistaAuditoriaAction(): Promise<{ ok: boolean; message?: string }> {
  const actorResult = await requireActionActor("admin_auditoria_reset", ["admin"]);
  if (!actorResult.ok) {
    return { ok: false, message: "No autorizado." };
  }

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "cerrar_ciclo",
    entidad: "auditoria",
    payload: {
      descripcion: "Limpieza visual de la vista de auditoría",
      marca_reset: true,
    },
    exitoso: true,
  });

  return { ok: true };
}

export async function limpiarVistaAuditoriaFormAction(formData: FormData): Promise<void> {
  void formData; // no params needed
  await limpiarVistaAuditoriaAction();
  revalidatePath("/admin/auditoria");
  redirect("/admin/auditoria?state=auditoria_limpiada");
}
