"use server";

import { and, asc, count, desc, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas } from "@/db/schema";
import { activo } from "@/db/filters";
import { clases } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { finalizarAsignaturasVencidas } from "@/lib/courseLifecycle";
import { logEvent } from "@/lib/observability/logger";
import { sanitizeText } from "@/lib/sanitize";
import { crearClaseInputSchema } from "@/lib/validations/admin";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

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
  options?: { asignaturaId?: string; incluirArchivadas?: boolean },
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

  if (options?.asignaturaId && options?.incluirArchivadas) {
    return baseQuery.where(eq(clases.asignaturaId, options.asignaturaId));
  }

  if (options?.asignaturaId) {
    return baseQuery.where(
      and(
        eq(clases.asignaturaId, options.asignaturaId),
        ne(asignaturas.estado, "archivado"),
      ),
    );
  }

  if (options?.incluirArchivadas) {
    return baseQuery;
  }

  return baseQuery.where(ne(asignaturas.estado, "archivado"));
}

export async function countClasesAdmin(
  options?: { asignaturaId?: string; incluirArchivadas?: boolean },
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

  let result;

  if (options?.asignaturaId && options?.incluirArchivadas) {
    result = await baseQuery.where(eq(clases.asignaturaId, options.asignaturaId));
  } else if (options?.asignaturaId) {
    result = await baseQuery.where(
      and(eq(clases.asignaturaId, options.asignaturaId), ne(asignaturas.estado, "archivado")),
    );
  } else if (options?.incluirArchivadas) {
    result = await baseQuery;
  } else {
    result = await baseQuery.where(ne(asignaturas.estado, "archivado"));
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

  if (!input.id || !input.titulo || !input.fecha) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: clases.id })
      .from(clases)
      .where(eq(clases.id, input.id))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
    }

    await db
      .update(clases)
      .set({
        titulo: sanitizeText(input.titulo),
        descripcion: sanitizeOptionalText(input.descripcion),
        fecha: input.fecha,
        horaInicio: input.horaInicio || null,
        tipoUrl: input.tipoUrl ?? null,
        urlGrabacion: input.urlGrabacion || null,
        publicada: input.publicada,
      })
      .where(eq(clases.id, input.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "clases",
      entidadId: input.id,
      payload: { titulo: input.titulo },
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
