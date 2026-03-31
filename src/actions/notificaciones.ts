"use server";

import { alias } from "drizzle-orm/pg-core";
import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  asignaturas,
  matriculas,
  notificaciones,
  notificacionesDestinatarios,
  pushSubscriptions,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sanitizeText } from "@/lib/sanitize";

export async function enviarPushADestinatarios(
  usuarioIds: string[],
  titulo: string,
  contenido: string,
) {
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!vapidSubject || !vapidPublic || !vapidPrivate || usuarioIds.length === 0) return;

  let webpush: typeof import("web-push") | null = null;
  try {
    webpush = (await import("web-push")).default as unknown as typeof import("web-push");
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch {
    return;
  }

  const db = getDb();

  const subs = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
      usuarioId: pushSubscriptions.usuarioId,
    })
    .from(pushSubscriptions);

  const filteredSubs = subs.filter((s) => usuarioIds.includes(s.usuarioId));

  const payload = JSON.stringify({
    title: titulo,
    body: contenido.slice(0, 120),
    url: "/notificaciones",
  });

  await Promise.allSettled(
    filteredSubs.map((sub) =>
      webpush!.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  );
}

import { requireActionActor, type MutationResult } from "./_security";

const enviarNotificacionSchema = z.object({
  titulo: z.string().min(1).max(200),
  contenido: z.string().min(1).max(2000),
  tipo: z.enum(["general", "curso", "individual"]),
  asignaturaId: z.string().uuid().optional(),
  usuarioIds: z.array(z.string().uuid()).optional(),
});

export async function enviarNotificacionAction(input: {
  titulo: string;
  contenido: string;
  tipo: "general" | "curso" | "individual";
  asignaturaId?: string;
  usuarioIds?: string[];
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_notificaciones_enviar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = enviarNotificacionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const { tipo, asignaturaId, usuarioIds } = parsed.data;
  const titulo = sanitizeText(parsed.data.titulo);
  const contenido = sanitizeText(parsed.data.contenido);

  if (tipo === "curso" && !asignaturaId) {
    return { ok: false, code: "missing_asignatura", message: "Debes seleccionar un curso." };
  }

  if (tipo === "individual" && (!usuarioIds || usuarioIds.length === 0)) {
    return { ok: false, code: "missing_usuarios", message: "Debes seleccionar al menos un destinatario." };
  }

  const db = getDb();

  const [notif] = await db
    .insert(notificaciones)
    .values({
      titulo,
      contenido,
      tipo,
      emisorId: actorResult.actor.userId,
      asignaturaId: tipo === "curso" ? asignaturaId : null,
    })
    .returning({ id: notificaciones.id });

  if (!notif) {
    return { ok: false, code: "error", message: "No se pudo crear la notificación." };
  }

  let destinatarioIds: string[] = [];

  if (tipo === "general") {
    // General: alumnos y docentes activos
    const todos = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          inArray(usuarios.rol, ["alumno", "docente"]),
          eq(usuarios.activo, true),
          isNull(usuarios.eliminadoAt),
        ),
      );
    destinatarioIds = todos.map((u) => u.id);
  } else if (tipo === "curso" && asignaturaId) {
    const matriculados = await db
      .select({ alumnoId: matriculas.alumnoId })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.asignaturaId, asignaturaId),
          eq(matriculas.activa, true),
          isNull(matriculas.eliminadoAt),
        ),
      );
    destinatarioIds = matriculados.map((m) => m.alumnoId);
  } else if (tipo === "individual" && usuarioIds) {
    destinatarioIds = usuarioIds;
  }

  if (destinatarioIds.length > 0) {
    await db.insert(notificacionesDestinatarios).values(
      destinatarioIds.map((usuarioId) => ({
        notificacionId: notif.id,
        usuarioId,
      })),
    );
  }

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "crear",
    entidad: "notificaciones",
    entidadId: notif.id,
    payload: { tipo, destinatarios: destinatarioIds.length },
    exitoso: true,
  });

  if (destinatarioIds.length > 0) {
    enviarPushADestinatarios(destinatarioIds, titulo, contenido).catch(() => {});
  }

  revalidatePath("/admin/notificaciones");

  return { ok: true, code: "notificacion_enviada" };
}

export async function listarNotificacionesAdmin() {
  const actorResult = await requireActionActor("admin_notificaciones_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  // Alias para emisor con tabla usuarios
  const emisor = alias(usuarios, "emisor");

  const rows = await db
    .select({
      id: notificaciones.id,
      titulo: notificaciones.titulo,
      contenido: notificaciones.contenido,
      tipo: notificaciones.tipo,
      asignaturaNombre: asignaturas.nombre,
      createdAt: notificaciones.createdAt,
      emisorNombre: emisor.nombre,
      emisorApellido: emisor.apellido,
      totalDestinatarios: sql<number>`(SELECT COUNT(*) FROM notificaciones_destinatarios nd WHERE nd.notificacion_id = ${notificaciones.id})::int`,
    })
    .from(notificaciones)
    .leftJoin(asignaturas, eq(notificaciones.asignaturaId, asignaturas.id))
    .leftJoin(emisor, eq(notificaciones.emisorId, emisor.id))
    .where(isNull(notificaciones.eliminadoAt))
    .orderBy(desc(notificaciones.createdAt))
    .limit(50);

  // Para tipo "individual", cargar preview de primeros 3 destinatarios
  const individualIds = rows
    .filter((r) => r.tipo === "individual")
    .map((r) => r.id);

  let destinatariosPreviewMap = new Map<string, string[]>();

  if (individualIds.length > 0) {
    const previews = await db
      .select({
        notificacionId: notificacionesDestinatarios.notificacionId,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
      })
      .from(notificacionesDestinatarios)
      .innerJoin(usuarios, eq(notificacionesDestinatarios.usuarioId, usuarios.id))
      .where(inArray(notificacionesDestinatarios.notificacionId, individualIds))
      .orderBy(usuarios.apellido, usuarios.nombre)
      .limit(individualIds.length * 4); // max 4 por notificacion

    for (const p of previews) {
      const arr = destinatariosPreviewMap.get(p.notificacionId) ?? [];
      if (arr.length < 3) arr.push(`${p.nombre} ${p.apellido}`);
      destinatariosPreviewMap.set(p.notificacionId, arr);
    }
  }

  return rows.map((r) => ({
    ...r,
    destinatariosPreview: destinatariosPreviewMap.get(r.id) ?? [],
  }));
}

// Función genérica para cualquier rol (alumno o docente)
export async function listarMisNotificaciones() {
  const actorResult = await requireActionActor("notificaciones_list", ["alumno", "docente"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: notificaciones.id,
      titulo: notificaciones.titulo,
      contenido: notificaciones.contenido,
      tipo: notificaciones.tipo,
      createdAt: notificaciones.createdAt,
      leidoAt: notificacionesDestinatarios.leidoAt,
    })
    .from(notificacionesDestinatarios)
    .innerJoin(
      notificaciones,
      eq(notificacionesDestinatarios.notificacionId, notificaciones.id),
    )
    .where(
      and(
        eq(notificacionesDestinatarios.usuarioId, actorResult.actor.userId),
        isNull(notificaciones.eliminadoAt),
      ),
    )
    .orderBy(desc(notificaciones.createdAt))
    .limit(50);
}

// Mantener alias para no romper imports existentes
export async function listarNotificacionesAlumno() {
  return listarMisNotificaciones();
}

export async function countMisNotificacionesNoLeidas(): Promise<number> {
  const actorResult = await requireActionActor("notificaciones_count", ["alumno", "docente"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const [result] = await db
    .select({ total: count() })
    .from(notificacionesDestinatarios)
    .innerJoin(
      notificaciones,
      eq(notificacionesDestinatarios.notificacionId, notificaciones.id),
    )
    .where(
      and(
        eq(notificacionesDestinatarios.usuarioId, actorResult.actor.userId),
        isNull(notificacionesDestinatarios.leidoAt),
        isNull(notificaciones.eliminadoAt),
      ),
    );

  return Number(result?.total ?? 0);
}

export async function countNotificacionesNoLeidasAlumno(): Promise<number> {
  return countMisNotificacionesNoLeidas();
}

export async function marcarMisNotificacionesLeidas(): Promise<MutationResult> {
  const actorResult = await requireActionActor("notificaciones_marcar", ["alumno", "docente"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const db = getDb();

  await db
    .update(notificacionesDestinatarios)
    .set({ leidoAt: new Date() })
    .where(
      and(
        eq(notificacionesDestinatarios.usuarioId, actorResult.actor.userId),
        isNull(notificacionesDestinatarios.leidoAt),
      ),
    );

  revalidatePath("/notificaciones");
  revalidatePath("/alumno/notificaciones");
  revalidatePath("/docente/notificaciones");

  return { ok: true, code: "marked_read" };
}

export async function marcarNotificacionesLeidasAlumnoAction(): Promise<MutationResult> {
  return marcarMisNotificacionesLeidas();
}

export async function listarAsignaturasActivasAdmin() {
  const actorResult = await requireActionActor("admin_notificaciones_asignaturas", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  return db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre })
    .from(asignaturas)
    .where(eq(asignaturas.estado, "activo"))
    .orderBy(asignaturas.nombre);
}

// Lista combinada de alumnos y docentes para envíos individuales
export async function listarUsuariosActivosAdmin() {
  const actorResult = await requireActionActor("admin_notificaciones_usuarios", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
      rol: usuarios.rol,
    })
    .from(usuarios)
    .where(
      and(
        inArray(usuarios.rol, ["alumno", "docente"]),
        eq(usuarios.activo, true),
        isNull(usuarios.eliminadoAt),
      ),
    )
    .orderBy(usuarios.apellido, usuarios.nombre)
    .limit(500);
}

export async function listarAlumnosActivosAdmin() {
  return listarUsuariosActivosAdmin();
}
