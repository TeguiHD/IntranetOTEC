"use server";

import { and, count, desc, eq, ilike, isNull, ne, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sendEmail, templateDocenteAsignado } from "@/lib/email";
import { finalizarAsignaturasVencidas } from "@/lib/courseLifecycle";
import { logEvent } from "@/lib/observability/logger";
import { sanitizeText } from "@/lib/sanitize";
import {
  asignarDocenteInputSchema,
  asignaturaInputSchema,
  comboboxSearchQuerySchema,
  editarAsignaturaInputSchema,
} from "@/lib/validations/admin";

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

export type AsignaturaBusqueda = {
  id: string;
  nombre: string;
  codigo: string | null;
  estado: "borrador" | "activo" | "finalizado" | "archivado" | null;
};

export async function buscarAsignaturasAdminAction(
  query: string,
): Promise<AsignaturaBusqueda[]> {
  const actorResult = await requireActionActor("admin_asignatura_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const parsed = comboboxSearchQuerySchema.safeParse(query);

  if (!parsed.success) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();
  const term = `%${escapeLike(parsed.data)}%`;

  return db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
    })
    .from(asignaturas)
    .where(
      and(
        ne(asignaturas.estado, "finalizado"),
        ne(asignaturas.estado, "archivado"),
        or(ilike(asignaturas.nombre, term), ilike(asignaturas.codigo, term)),
      ),
    )
    .orderBy(desc(asignaturas.createdAt))
    .limit(15);
}

export async function countAsignaturasAdmin(
  options?: { incluirArchivadas?: boolean; q?: string; estado?: "borrador" | "activo" | "finalizado" | "archivado" },
): Promise<number> {
  const actorResult = await requireActionActor("admin_asignatura_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();
  const conditions = [];

  if (!options?.incluirArchivadas) {
    conditions.push(ne(asignaturas.estado, "archivado"));
  }

  if (options?.estado) {
    conditions.push(eq(asignaturas.estado, options.estado));
  }

  if (options?.q) {
    const term = `%${escapeLike(options.q)}%`;
    conditions.push(
      or(ilike(asignaturas.nombre, term), ilike(asignaturas.codigo, term)),
    );
  }

  const baseQuery = db.select({ total: count() }).from(asignaturas);

  const result = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  return Number(result[0]?.total ?? 0);
}

export async function listarAsignaturas(
  pagination: PaginationInput = {},
  options?: { incluirArchivadas?: boolean },
) {
  const actorResult = await requireActionActor("listar_asignaturas", ["admin", "docente", "alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  if (options?.incluirArchivadas) {
    return db
      .select()
      .from(asignaturas)
      .orderBy(desc(asignaturas.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(asignaturas)
    .where(ne(asignaturas.estado, "archivado"))
    .orderBy(desc(asignaturas.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listarAsignaturasAdmin(
  pagination: PaginationInput = {},
  options?: { incluirArchivadas?: boolean; q?: string; estado?: "borrador" | "activo" | "finalizado" | "archivado" },
) {
  const actorResult = await requireActionActor("admin_asignatura_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const conditions = [];

  if (!options?.incluirArchivadas) {
    conditions.push(ne(asignaturas.estado, "archivado"));
  }

  if (options?.estado) {
    conditions.push(eq(asignaturas.estado, options.estado));
  }

  if (options?.q) {
    const term = `%${escapeLike(options.q)}%`;
    conditions.push(
      or(ilike(asignaturas.nombre, term), ilike(asignaturas.codigo, term)),
    );
  }

  const baseQuery = db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      descripcion: asignaturas.descripcion,
      codigo: asignaturas.codigo,
      fechaInicio: asignaturas.fechaInicio,
      duracionMeses: asignaturas.duracionMeses,
      estado: asignaturas.estado,
      maxAlumnos: asignaturas.maxAlumnos,
      docenteId: asignaturas.docenteId,
      createdAt: asignaturas.createdAt,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      docenteActivo: usuarios.activo,
    })
    .from(asignaturas)
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id));

  if (conditions.length > 0) {
    return baseQuery
      .where(and(...conditions))
      .orderBy(desc(asignaturas.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return baseQuery
    .orderBy(desc(asignaturas.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function crearAsignaturaAction(input: {
  nombre: string;
  descripcion?: string;
  codigo?: string;
  fechaInicio: string;
  duracionMeses: number;
  maxAlumnos: number;
  docenteId?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_asignatura_create", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = asignaturaInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para crear asignatura.",
    };
  }

  const db = getDb();

  try {
    if (parsed.data.docenteId) {
      const [docente] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(
          and(
            eq(usuarios.id, parsed.data.docenteId),
            eq(usuarios.rol, "docente"),
            eq(usuarios.activo, true),
            isNull(usuarios.eliminadoAt),
          ),
        )
        .limit(1);

      if (!docente) {
        return {
          ok: false,
          code: "docente_not_found",
          message: "Docente no disponible para asignación.",
        };
      }
    }

    const [created] = await db
      .insert(asignaturas)
      .values({
        nombre: sanitizeText(parsed.data.nombre),
        descripcion: sanitizeOptionalText(parsed.data.descripcion),
        codigo: parsed.data.codigo,
        fechaInicio: parsed.data.fechaInicio,
        duracionMeses: parsed.data.duracionMeses,
        maxAlumnos: parsed.data.maxAlumnos,
        docenteId: parsed.data.docenteId,
        createdBy: actorResult.actor.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: asignaturas.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "asignaturas",
      entidadId: created.id,
      payload: {
        codigo: parsed.data.codigo ?? null,
        docenteId: parsed.data.docenteId ?? null,
      },
      exitoso: true,
    });

    return { ok: true, code: "asignatura_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_asignatura_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "create_failed",
      message: "No fue posible crear la asignatura.",
    };
  }
}

export async function asignarDocenteAction(input: {
  asignaturaId: string;
  docenteId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_asignatura_assign_docente", [
    "admin",
  ]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = asignarDocenteInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para asignación de docente.",
    };
  }

  const db = getDb();

  try {
    const [subject] = await db
      .select({ id: asignaturas.id, estado: asignaturas.estado, nombre: asignaturas.nombre, codigo: asignaturas.codigo, fechaInicio: asignaturas.fechaInicio })
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
        message: "No puedes asignar docentes a asignaturas cerradas.",
      };
    }

    const [docente] = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, email: usuarios.email })
      .from(usuarios)
      .where(
        and(
          eq(usuarios.id, parsed.data.docenteId),
          eq(usuarios.rol, "docente"),
          eq(usuarios.activo, true),
          isNull(usuarios.eliminadoAt),
        ),
      )
      .limit(1);

    if (!docente) {
      return {
        ok: false,
        code: "docente_not_found",
        message: "Docente no disponible para asignación.",
      };
    }

    await db
      .update(asignaturas)
      .set({
        docenteId: parsed.data.docenteId,
        updatedAt: new Date(),
      })
      .where(eq(asignaturas.id, parsed.data.asignaturaId));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "asignaturas",
      entidadId: parsed.data.asignaturaId,
      payload: {
        docenteId: parsed.data.docenteId,
      },
      exitoso: true,
    });

    // Send email notification (non-blocking)
    if (docente.email) {
      const { subject: emailSubject, html } = templateDocenteAsignado({
        docenteNombre: docente.nombre ?? "Docente",
        asignaturaNombre: subject.nombre,
        asignaturaCodigo: subject.codigo,
        fechaInicio: subject.fechaInicio,
      });
      sendEmail(docente.email, emailSubject, html).catch(() => {});
    }

    return { ok: true, code: "docente_assigned" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_asignatura_assign_docente_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "assign_failed",
      message: "No fue posible asignar docente.",
    };
  }
}

export async function crearAsignaturaFormAction(formData: FormData): Promise<void> {
  const result = await crearAsignaturaAction({
    nombre: getStringField(formData, "nombre"),
    descripcion: getStringField(formData, "descripcion"),
    codigo: getStringField(formData, "codigo"),
    fechaInicio: getStringField(formData, "fechaInicio"),
    duracionMeses: parseIntegerField(getStringField(formData, "duracionMeses")) ?? 0,
    maxAlumnos: parseIntegerField(getStringField(formData, "maxAlumnos")) ?? 0,
    docenteId: getStringField(formData, "docenteId") || undefined,
  });

  revalidatePath("/admin/asignaturas");
  redirect(`/admin/asignaturas?state=${result.ok ? result.code : "error"}`);
}

export async function editarAsignaturaAction(input: {
  id: string;
  nombre: string;
  descripcion?: string;
  maxAlumnos: number;
  fechaInicio: string;
  duracionMeses: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_asignatura_edit", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = editarAsignaturaInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para editar asignatura.",
    };
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: asignaturas.id, estado: asignaturas.estado })
      .from(asignaturas)
      .where(eq(asignaturas.id, parsed.data.id))
      .limit(1);

    if (!existing) {
      return {
        ok: false,
        code: "asignatura_not_found",
        message: "No se encontró la asignatura.",
      };
    }

    if (existing.estado === "archivado") {
      return {
        ok: false,
        code: "asignatura_archived",
        message: "No puedes editar asignaturas archivadas.",
      };
    }

    const sanitizedDesc = parsed.data.descripcion
      ? sanitizeText(parsed.data.descripcion).replace(/\s+/g, " ").trim() || undefined
      : undefined;

    await db
      .update(asignaturas)
      .set({
        nombre: sanitizeText(parsed.data.nombre),
        descripcion: sanitizedDesc,
        maxAlumnos: parsed.data.maxAlumnos,
        fechaInicio: parsed.data.fechaInicio,
        duracionMeses: parsed.data.duracionMeses,
        updatedAt: new Date(),
      })
      .where(eq(asignaturas.id, parsed.data.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "asignaturas",
      entidadId: parsed.data.id,
      payload: {
        nombre: parsed.data.nombre,
        maxAlumnos: parsed.data.maxAlumnos,
      },
      exitoso: true,
    });

    return { ok: true, code: "asignatura_updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_asignatura_edit_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "edit_failed",
      message: "No fue posible editar la asignatura.",
    };
  }
}

export async function archivarAsignaturaAction(input: { id: string }): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_asignatura_archivar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: asignaturas.id, estado: asignaturas.estado, nombre: asignaturas.nombre })
      .from(asignaturas)
      .where(eq(asignaturas.id, input.id))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "asignatura_not_found", message: "No se encontró la asignatura." };
    }

    if (existing.estado === "archivado") {
      return { ok: true, code: "already_archived" };
    }

    await db
      .update(asignaturas)
      .set({ estado: "archivado", updatedAt: new Date() })
      .where(eq(asignaturas.id, input.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "archivar",
      entidad: "asignaturas",
      entidadId: input.id,
      payload: { nombre: existing.nombre, estadoAnterior: existing.estado },
      exitoso: true,
    });

    return { ok: true, code: "asignatura_archived" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_asignatura_archivar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "archive_failed", message: "No fue posible archivar la asignatura." };
  }
}

export async function archivarAsignaturaFormAction(formData: FormData): Promise<void> {
  const result = await archivarAsignaturaAction({ id: getStringField(formData, "id") });
  revalidatePath("/admin/asignaturas");
  redirect(`/admin/asignaturas?state=${result.ok ? result.code : "error"}`);
}

export async function asignarDocenteFormAction(formData: FormData): Promise<void> {
  const result = await asignarDocenteAction({
    asignaturaId: getStringField(formData, "asignaturaId"),
    docenteId: getStringField(formData, "docenteId"),
  });

  revalidatePath("/admin/asignaturas");
  redirect(`/admin/asignaturas?state=${result.ok ? result.code : "error"}`);
}
