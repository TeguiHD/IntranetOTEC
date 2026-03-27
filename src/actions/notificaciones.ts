"use server";

import { and, count, desc, eq, isNull } from "drizzle-orm";
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

async function enviarPushADestinatarios(
  alumnoIds: string[],
  titulo: string,
  contenido: string,
) {
  const vapidSubject = process.env.VAPID_SUBJECT;
  const vapidPublic = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;

  if (!vapidSubject || !vapidPublic || !vapidPrivate || alumnoIds.length === 0) return;

  let webpush: typeof import("web-push") | null = null;
  try {
    webpush = (await import("web-push")).default as unknown as typeof import("web-push");
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch {
    return; // web-push no instalado — ignorar silenciosamente
  }

  const db = getDb();
  const subs = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .where(
      alumnoIds.length === 1
        ? eq(pushSubscriptions.alumnoId, alumnoIds[0])
        : // Para multiples, filtramos en JS (drizzle no tiene inArray en todos los casos)
          eq(pushSubscriptions.alumnoId, alumnoIds[0]),
    );

  // Para envio global/multiple hacemos la query sin filtro
  const allSubs = alumnoIds.length > 1
    ? await db.select({
        endpoint: pushSubscriptions.endpoint,
        p256dh: pushSubscriptions.p256dh,
        auth: pushSubscriptions.auth,
        alumnoId: pushSubscriptions.alumnoId,
      }).from(pushSubscriptions)
    : subs.map((s) => ({ ...s, alumnoId: alumnoIds[0] }));

  const filteredSubs = alumnoIds.length > 1
    ? allSubs.filter((s) => alumnoIds.includes(s.alumnoId))
    : allSubs;

  const payload = JSON.stringify({
    title: titulo,
    body: contenido.slice(0, 120),
    url: "/alumno/notificaciones",
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
  alumnoIds: z.array(z.string().uuid()).optional(),
});

export async function enviarNotificacionAction(input: {
  titulo: string;
  contenido: string;
  tipo: "general" | "curso" | "individual";
  asignaturaId?: string;
  alumnoIds?: string[];
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_notificaciones_enviar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = enviarNotificacionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const { tipo, asignaturaId, alumnoIds } = parsed.data;
  const titulo = sanitizeText(parsed.data.titulo);
  const contenido = sanitizeText(parsed.data.contenido);

  if (tipo === "curso" && !asignaturaId) {
    return { ok: false, code: "missing_asignatura", message: "Debes seleccionar un curso." };
  }

  if (tipo === "individual" && (!alumnoIds || alumnoIds.length === 0)) {
    return { ok: false, code: "missing_alumnos", message: "Debes seleccionar al menos un alumno." };
  }

  const db = getDb();

  // Crear la notificacion
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

  // Obtener destinatarios segun tipo
  let destinatarioIds: string[] = [];

  if (tipo === "general") {
    const alumnos = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.rol, "alumno"),
          eq(usuarios.activo, true),
          isNull(usuarios.eliminadoAt),
        ),
      );
    destinatarioIds = alumnos.map((a) => a.id);
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
  } else if (tipo === "individual" && alumnoIds) {
    destinatarioIds = alumnoIds;
  }

  // Insertar destinatarios
  if (destinatarioIds.length > 0) {
    await db.insert(notificacionesDestinatarios).values(
      destinatarioIds.map((alumnoId) => ({
        notificacionId: notif.id,
        alumnoId,
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

  // Enviar push notifications (best-effort, no bloquea)
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

  const notifs = await db
    .select({
      id: notificaciones.id,
      titulo: notificaciones.titulo,
      contenido: notificaciones.contenido,
      tipo: notificaciones.tipo,
      asignaturaNombre: asignaturas.nombre,
      createdAt: notificaciones.createdAt,
    })
    .from(notificaciones)
    .leftJoin(asignaturas, eq(notificaciones.asignaturaId, asignaturas.id))
    .where(isNull(notificaciones.eliminadoAt))
    .orderBy(desc(notificaciones.createdAt))
    .limit(50);

  return notifs;
}

export async function listarNotificacionesAlumno() {
  const actorResult = await requireActionActor("alumno_notificaciones_list", ["alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  const notifs = await db
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
        eq(notificacionesDestinatarios.alumnoId, actorResult.actor.userId),
        isNull(notificaciones.eliminadoAt),
      ),
    )
    .orderBy(desc(notificaciones.createdAt))
    .limit(50);

  return notifs;
}

export async function countNotificacionesNoLeidasAlumno(): Promise<number> {
  const actorResult = await requireActionActor("alumno_notificaciones_count", ["alumno"]);

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
        eq(notificacionesDestinatarios.alumnoId, actorResult.actor.userId),
        isNull(notificacionesDestinatarios.leidoAt),
        isNull(notificaciones.eliminadoAt),
      ),
    );

  return Number(result?.total ?? 0);
}

export async function marcarNotificacionesLeidasAlumnoAction(): Promise<MutationResult> {
  const actorResult = await requireActionActor("alumno_notificaciones_marcar", ["alumno"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const db = getDb();
  const now = new Date();

  await db
    .update(notificacionesDestinatarios)
    .set({ leidoAt: now })
    .where(
      and(
        eq(notificacionesDestinatarios.alumnoId, actorResult.actor.userId),
        isNull(notificacionesDestinatarios.leidoAt),
      ),
    );

  revalidatePath("/alumno/notificaciones");

  return { ok: true, code: "marked_read" };
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

export async function listarAlumnosActivosAdmin() {
  const actorResult = await requireActionActor("admin_notificaciones_alumnos", ["admin"]);

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
    })
    .from(usuarios)
    .where(
      and(
        eq(usuarios.rol, "alumno"),
        eq(usuarios.activo, true),
        isNull(usuarios.eliminadoAt),
      ),
    )
    .orderBy(usuarios.apellido, usuarios.nombre)
    .limit(500);
}
