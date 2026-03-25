"use server";

import { and, asc, eq, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, matriculas, mensajes, usuarios } from "@/db/schema";
import { requireActionActor } from "@/actions/_security";

const MAX_CONTENIDO = 1000;

// ──────────────────────────────────────────────────────────
// Listar mensajes de una asignatura (últimos 100)
// ──────────────────────────────────────────────────────────
export async function listarMensajesAction(asignaturaId: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: mensajes.id,
      contenido: mensajes.contenido,
      creadoAt: mensajes.creadoAt,
      emisorId: mensajes.emisorId,
      emisorNombre: usuarios.nombre,
      emisorApellido: usuarios.apellido,
      emisorRol: usuarios.rol,
    })
    .from(mensajes)
    .innerJoin(usuarios, eq(mensajes.emisorId, usuarios.id))
    .where(
      and(
        eq(mensajes.asignaturaId, asignaturaId),
        isNull(mensajes.eliminadoAt),
      ),
    )
    .orderBy(asc(mensajes.creadoAt))
    .limit(100);

  return rows.map((r) => ({
    ...r,
    creadoAt: r.creadoAt?.toISOString() ?? null,
    esMio: r.emisorId === session.user!.id,
  }));
}

// ──────────────────────────────────────────────────────────
// Enviar mensaje (docente o alumno matriculado)
// ──────────────────────────────────────────────────────────
export async function enviarMensajeAction(asignaturaId: string, contenido: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const authResult = await requireActionActor("mensaje_enviar", ["admin", "docente", "alumno"]);
  if (!authResult.ok) return { ok: false, error: "No autorizado" };
  const { actor } = authResult;

  const texto = contenido.trim().slice(0, MAX_CONTENIDO);
  if (!texto) return { ok: false, error: "El mensaje no puede estar vacío" };

  const db = getDb();

  // Verificar acceso: docente dueño o alumno matriculado
  if (actor.userRol === "docente") {
    const [asig] = await db
      .select({ id: asignaturas.id })
      .from(asignaturas)
      .where(and(eq(asignaturas.id, asignaturaId), eq(asignaturas.docenteId, actor.userId)))
      .limit(1);
    if (!asig) return { ok: false, error: "No tienes acceso a esta asignatura" };
  } else if (actor.userRol === "alumno") {
    const [mat] = await db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.asignaturaId, asignaturaId),
          eq(matriculas.alumnoId, actor.userId),
          eq(matriculas.activa, true),
          isNull(matriculas.eliminadoAt),
        ),
      )
      .limit(1);
    if (!mat) return { ok: false, error: "No estás matriculado en este curso" };
  }

  await db.insert(mensajes).values({
    asignaturaId,
    emisorId: actor.userId,
    contenido: texto,
  });

  return { ok: true };
}

// ──────────────────────────────────────────────────────────
// Eliminar mensaje propio (o admin)
// ──────────────────────────────────────────────────────────
export async function eliminarMensajeAction(mensajeId: string): Promise<{ ok: boolean }> {
  const authResult = await requireActionActor("mensaje_eliminar", ["admin", "docente", "alumno"]);
  if (!authResult.ok) return { ok: false };
  const { actor } = authResult;

  const db = getDb();

  const [msg] = await db
    .select({ emisorId: mensajes.emisorId })
    .from(mensajes)
    .where(eq(mensajes.id, mensajeId))
    .limit(1);

  if (!msg || (msg.emisorId !== actor.userId && actor.userRol !== "admin")) return { ok: false };

  await db
    .update(mensajes)
    .set({ eliminadoAt: new Date() })
    .where(eq(mensajes.id, mensajeId));

  return { ok: true };
}
