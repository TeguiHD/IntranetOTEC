"use server";

import { and, asc, count, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, clases, matriculas } from "@/db/schema";
import { activo } from "@/db/filters";
import { registrarAudit } from "@/lib/audit";
import { enviarPushADestinatarios } from "@/actions/notificaciones";
import { finalizarAsignaturasVencidas } from "@/lib/courseLifecycle";
import { logEvent } from "@/lib/observability/logger";
import { sanitizeText } from "@/lib/sanitize";
import { crearClaseInputSchema, editarClaseInputSchema } from "@/lib/validations/admin";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

const parseIntegerField = (value: string): number | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const clean = sanitizeText(value).replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : undefined;
};

const parsePageField = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

export async function listarClasesPorAsignatura(
  asignaturaId: string,
  pagination: PaginationInput = {},
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  return db
    .select()
    .from(clases)
    .where(and(eq(clases.asignaturaId, asignaturaId), activo(clases)))
    .orderBy(asc(clases.numeroSesion))
    .limit(limit)
    .offset(offset);
}

export async function listarClasesAdmin(
  pagination: PaginationInput = {},
  options?: { asignaturaId?: string; incluirArchivadas?: boolean; q?: string },
) {
  const actorResult = await requireActionActor("admin_clase_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const baseQuery = db
    .select({
      id: clases.id,
      asignaturaId: clases.asignaturaId,
      titulo: clases.titulo,
      descripcion: clases.descripcion,
      numeroSesion: clases.numeroSesion,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      urlGrabacion: clases.urlGrabacion,
      tipoUrl: clases.tipoUrl,
      publicada: clases.publicada,
      eliminadoAt: clases.eliminadoAt,
      createdAt: clases.createdAt,
      asignaturaNombre: asignaturas.nombre,
      asignaturaEstado: asignaturas.estado,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .orderBy(desc(clases.createdAt))
    .limit(limit)
    .offset(offset);

  // Build text search filter: match by title, date, or session number
  const qFilter = (() => {
    const q = options?.q?.trim();
    if (!q) return undefined;
    const term = `%${escapeLike(q)}%`;
    // If q is a pure integer, also match by session number
    const sessionNum = Number.parseInt(q, 10);
    const bySession =
      Number.isFinite(sessionNum) && String(sessionNum) === q
        ? sql`${clases.numeroSesion} = ${sessionNum}`
        : undefined;
    return bySession
      ? or(ilike(clases.titulo, term), ilike(clases.fecha, term), bySession)
      : or(ilike(clases.titulo, term), ilike(clases.fecha, term));
  })();

  if (options?.asignaturaId && options?.incluirArchivadas) {
    const base = and(eq(clases.asignaturaId, options.asignaturaId), activo(clases));
    return baseQuery.where(qFilter ? and(base, qFilter) : base);
  }

  if (options?.asignaturaId) {
    const base = and(
      eq(clases.asignaturaId, options.asignaturaId),
      ne(asignaturas.estado, "archivado"),
      activo(clases),
    );
    return baseQuery.where(qFilter ? and(base, qFilter) : base);
  }

  if (options?.incluirArchivadas) {
    return baseQuery.where(qFilter ? and(activo(clases), qFilter) : activo(clases));
  }

  const base = and(ne(asignaturas.estado, "archivado"), activo(clases));
  return baseQuery.where(qFilter ? and(base, qFilter) : base);
}

export async function countClasesAdmin(
  options?: { asignaturaId?: string; incluirArchivadas?: boolean; q?: string },
): Promise<number> {
  const actorResult = await requireActionActor("admin_clase_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const baseQuery = db
    .select({ total: count() })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id));

  const qFilter = (() => {
    const q = options?.q?.trim();
    if (!q) return undefined;
    const term = `%${escapeLike(q)}%`;
    const sessionNum = Number.parseInt(q, 10);
    const bySession =
      Number.isFinite(sessionNum) && String(sessionNum) === q
        ? sql`${clases.numeroSesion} = ${sessionNum}`
        : undefined;
    return bySession
      ? or(ilike(clases.titulo, term), ilike(clases.fecha, term), bySession)
      : or(ilike(clases.titulo, term), ilike(clases.fecha, term));
  })();

  let result;

  if (options?.asignaturaId && options?.incluirArchivadas) {
    const base = and(eq(clases.asignaturaId, options.asignaturaId), activo(clases));
    result = await baseQuery.where(qFilter ? and(base, qFilter) : base);
  } else if (options?.asignaturaId) {
    const base = and(
      eq(clases.asignaturaId, options.asignaturaId),
      ne(asignaturas.estado, "archivado"),
      activo(clases),
    );
    result = await baseQuery.where(qFilter ? and(base, qFilter) : base);
  } else if (options?.incluirArchivadas) {
    result = await baseQuery.where(qFilter ? and(activo(clases), qFilter) : activo(clases));
  } else {
    const base = and(ne(asignaturas.estado, "archivado"), activo(clases));
    result = await baseQuery.where(qFilter ? and(base, qFilter) : base);
  }

  return Number(result[0]?.total ?? 0);
}

export async function editarClaseAction(input: {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  horaInicio?: string;
  tipoUrl?: "youtube" | "vimeo" | "drive" | "directo";
  urlGrabacion?: string;
  publicada: boolean;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_clase_edit", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = editarClaseInputSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos para editar clase." };
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: clases.id })
      .from(clases)
      .where(eq(clases.id, parsed.data.id))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
    }

    await db
      .update(clases)
      .set({
        titulo: sanitizeText(parsed.data.titulo),
        descripcion: sanitizeOptionalText(parsed.data.descripcion),
        fecha: parsed.data.fecha,
        horaInicio: parsed.data.horaInicio || null,
        tipoUrl: parsed.data.tipoUrl ?? null,
        urlGrabacion: parsed.data.urlGrabacion || null,
        publicada: parsed.data.publicada,
      })
      .where(eq(clases.id, parsed.data.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "clases",
      entidadId: parsed.data.id,
      payload: { titulo: parsed.data.titulo },
      exitoso: true,
    });

    return { ok: true, code: "clase_updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_clase_edit_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "clase_edit_failed", message: "No fue posible editar la clase." };
  }
}

export async function editarClaseFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const page = parsePageField(getStringField(formData, "page"));
  const result = await editarClaseAction({
    id: getStringField(formData, "id"),
    titulo: getStringField(formData, "titulo"),
    descripcion: getStringField(formData, "descripcion") || undefined,
    fecha: getStringField(formData, "fecha"),
    horaInicio: getStringField(formData, "horaInicio") || undefined,
    tipoUrl: (getStringField(formData, "tipoUrl") || undefined) as
      | "youtube"
      | "vimeo"
      | "drive"
      | "directo"
      | undefined,
    urlGrabacion: getStringField(formData, "urlGrabacion") || undefined,
    publicada: getStringField(formData, "publicada") === "on",
  });

  revalidatePath("/admin/clases");
  const filterQuery = asignaturaId
    ? `&asignaturaId=${encodeURIComponent(asignaturaId)}`
    : "";
  const pageQuery = page ? `&page=${page}` : "";
  redirect(`/admin/clases?state=${result.ok ? result.code : "error"}${filterQuery}${pageQuery}`);
}

export async function crearClaseAction(input: {
  asignaturaId: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  horaInicio?: string;
  numeroSesion?: number;
  tipoUrl?: "youtube" | "vimeo" | "drive" | "directo";
  urlGrabacion?: string;
  publicada: boolean;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_clase_create", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = crearClaseInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para crear clase.",
    };
  }

  const db = getDb();

  try {
    const [subject] = await db
      .select({
        id: asignaturas.id,
        estado: asignaturas.estado,
      })
      .from(asignaturas)
      .where(eq(asignaturas.id, parsed.data.asignaturaId))
      .limit(1);

    if (!subject) {
      return {
        ok: false,
        code: "asignatura_not_found",
        message: "No se encontró la asignatura.",
      };
    }

    if (subject.estado === "archivado" || subject.estado === "finalizado") {
      return {
        ok: false,
        code: "asignatura_closed",
        message: "No puedes crear clases en asignaturas cerradas.",
      };
    }

    let numeroSesion = parsed.data.numeroSesion;

    if (!numeroSesion) {
      const [sequence] = await db
        .select({
          maxSesion: sql<number>`coalesce(max(${clases.numeroSesion}), 0)`,
        })
        .from(clases)
        .where(eq(clases.asignaturaId, parsed.data.asignaturaId));

      numeroSesion = (sequence?.maxSesion ?? 0) + 1;
    }

    const [created] = await db
      .insert(clases)
      .values({
        asignaturaId: parsed.data.asignaturaId,
        titulo: sanitizeText(parsed.data.titulo),
        descripcion: sanitizeOptionalText(parsed.data.descripcion),
        numeroSesion,
        fecha: parsed.data.fecha,
        horaInicio: parsed.data.horaInicio,
        urlGrabacion: parsed.data.urlGrabacion,
        tipoUrl: parsed.data.tipoUrl,
        publicada: parsed.data.publicada,
        createdAt: new Date(),
      })
      .returning({ id: clases.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "clases",
      entidadId: created.id,
      payload: {
        asignaturaId: parsed.data.asignaturaId,
        numeroSesion,
      },
      exitoso: true,
    });

    // Push a alumnos matriculados (solo si clase está publicada)
    if (parsed.data.publicada) {
      const [asigData] = await db
        .select({ nombre: asignaturas.nombre })
        .from(asignaturas)
        .where(eq(asignaturas.id, parsed.data.asignaturaId))
        .limit(1);

      const matriculados = await db
        .select({ alumnoId: matriculas.alumnoId })
        .from(matriculas)
        .where(
          and(
            eq(matriculas.asignaturaId, parsed.data.asignaturaId),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
          ),
        );

      const alumnoIds = matriculados.map((m) => m.alumnoId);
      if (alumnoIds.length > 0 && asigData) {
        const fechaStr = new Date(parsed.data.fecha + "T12:00:00").toLocaleDateString("es-CL", {
          day: "2-digit", month: "long", year: "numeric",
        });
        enviarPushADestinatarios(
          alumnoIds,
          `Nueva clase: ${sanitizeText(parsed.data.titulo)}`,
          `Nueva clase en ${asigData.nombre} el ${fechaStr}${parsed.data.horaInicio ? ` a las ${parsed.data.horaInicio}` : ""}.`,
        ).catch(() => {});
      }
    }

    return { ok: true, code: "clase_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_clase_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "clase_create_failed",
      message: "No fue posible crear la clase.",
    };
  }
}

export async function eliminarClaseAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_clase_delete", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  if (!id || typeof id !== "string") {
    return { ok: false, code: "invalid_input", message: "ID de clase inválido." };
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: clases.id, eliminadoAt: clases.eliminadoAt })
      .from(clases)
      .where(eq(clases.id, id))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
    }

    if (existing.eliminadoAt) {
      return { ok: true, code: "already_deleted" };
    }

    await db
      .update(clases)
      .set({ eliminadoAt: new Date(), eliminadoPor: actorResult.actor.userId })
      .where(eq(clases.id, id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "archivar",
      entidad: "clases",
      entidadId: id,
      exitoso: true,
    });

    revalidatePath("/admin/clases");
    return { ok: true, code: "clase_deleted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_clase_delete_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "clase_delete_failed", message: "No fue posible eliminar la clase." };
  }
}

export async function eliminarClaseFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const page = parsePageField(getStringField(formData, "page"));
  const result = await eliminarClaseAction(getStringField(formData, "id"));

  revalidatePath("/admin/clases");
  const filterQuery = asignaturaId
    ? `&asignaturaId=${encodeURIComponent(asignaturaId)}`
    : "";
  const pageQuery = page ? `&page=${page}` : "";
  redirect(`/admin/clases?state=${result.ok ? result.code : "error"}${filterQuery}${pageQuery}`);
}

export async function crearClaseFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const page = parsePageField(getStringField(formData, "page"));
  const result = await crearClaseAction({
    asignaturaId,
    titulo: getStringField(formData, "titulo"),
    descripcion: getStringField(formData, "descripcion"),
    fecha: getStringField(formData, "fecha"),
    horaInicio: getStringField(formData, "horaInicio") || undefined,
    numeroSesion: parseIntegerField(getStringField(formData, "numeroSesion")),
    tipoUrl: (getStringField(formData, "tipoUrl") ||
      undefined) as "youtube" | "vimeo" | "drive" | "directo" | undefined,
    urlGrabacion: getStringField(formData, "urlGrabacion") || undefined,
    publicada: getStringField(formData, "publicada") === "on",
  });

  revalidatePath("/admin/clases");
  const filterQuery = asignaturaId
    ? `&asignaturaId=${encodeURIComponent(asignaturaId)}`
    : "";
  const pageQuery = page ? `&page=${page}` : "";

  redirect(`/admin/clases?state=${result.ok ? result.code : "error"}${filterQuery}${pageQuery}`);
}
