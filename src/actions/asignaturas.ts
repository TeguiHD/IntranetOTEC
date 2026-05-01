"use server";

import { and, count, desc, eq, gte, ilike, isNull, lte, ne, or, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, cursos, periodosAcademicos, usuarios } from "@/db/schema";
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
import { assertPeriodoAbiertoByAsignaturaId } from "./_period-lock";
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

const parseDateFilter = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const clean = sanitizeText(value).replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : undefined;
};

const addMonthsToIsoDate = (isoDate: string, months: number): string => {
  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-").map((part) => Number.parseInt(part ?? "", 10));
  const year = Number.isFinite(yearRaw) ? yearRaw : 1970;
  const month = Number.isFinite(monthRaw) ? monthRaw : 1;
  const day = Number.isFinite(dayRaw) ? dayRaw : 1;

  const base = new Date(Date.UTC(year, month - 1, day));
  base.setUTCMonth(base.getUTCMonth() + months);
  const yyyy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const turnoCodeMap: Record<"manana" | "tarde" | "vespertino", "M" | "T" | "V"> = {
  manana: "M",
  tarde: "T",
  vespertino: "V",
};

const normalizeCodeSegment = (value: string, fallback: string, maxLength: number): string => {
  const normalized = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!normalized) return fallback;
  return normalized.slice(0, maxLength);
};

export type AsignaturaBusqueda = {
  id: string;
  nombre: string;
  codigo: string | null;
  estado: "borrador" | "activo" | "finalizado" | "archivado" | null;
  cursoNombre?: string | null;
  cursoCodigo?: string | null;
  periodoNombre?: string | null;
  periodoCodigo?: string | null;
  turno?: "manana" | "tarde" | "vespertino" | null;
};

export async function obtenerAsignaturaAdminById(
  id: string,
): Promise<AsignaturaBusqueda | null> {
  const actorResult = await requireActionActor("admin_asignatura_list", ["admin"]);

  if (!actorResult.ok) return null;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) return null;

  const db = getDb();
  const [row] = await db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
    })
    .from(asignaturas)
    .where(eq(asignaturas.id, id))
    .limit(1);

  return row ?? null;
}

export async function buscarAsignaturasAdminAction(
  query: string,
  options?: {
    includeFinalizadas?: boolean;
    includeArchivadas?: boolean;
    limit?: number;
  },
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
  const limit = Number.isFinite(options?.limit)
    ? Math.max(1, Math.min(Math.trunc(options?.limit ?? 15), 80))
    : 15;

  const conditions: (SQL | undefined)[] = [
    isNull(asignaturas.eliminadoAt),
    options?.includeFinalizadas ? undefined : ne(asignaturas.estado, "finalizado"),
    options?.includeArchivadas ? undefined : ne(asignaturas.estado, "archivado"),
    or(
      ilike(asignaturas.nombre, term),
      ilike(asignaturas.codigo, term),
      ilike(cursos.nombre, term),
      ilike(cursos.codigo, term),
      ilike(periodosAcademicos.nombre, term),
      ilike(periodosAcademicos.codigo, term),
    ),
  ];

  return db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
      cursoNombre: cursos.nombre,
      cursoCodigo: cursos.codigo,
      periodoNombre: periodosAcademicos.nombre,
      periodoCodigo: periodosAcademicos.codigo,
      turno: asignaturas.turno,
    })
    .from(asignaturas)
    .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .innerJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(and(...conditions))
    .orderBy(desc(asignaturas.fechaInicio), desc(asignaturas.createdAt))
    .limit(limit);
}

export async function countAsignaturasAdmin(
  options?: {
    incluirArchivadas?: boolean;
    q?: string;
    periodoId?: string;
    estado?: "borrador" | "activo" | "finalizado" | "archivado";
    fechaDesde?: string;
    fechaHasta?: string;
  },
): Promise<number> {
  const actorResult = await requireActionActor("admin_asignatura_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();
  const conditions: (SQL | undefined)[] = [isNull(asignaturas.eliminadoAt)];

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

  if (options?.periodoId) {
    conditions.push(eq(asignaturas.periodoId, options.periodoId));
  }

  const fechaDesde = parseDateFilter(options?.fechaDesde);
  if (fechaDesde) {
    conditions.push(gte(asignaturas.fechaInicio, fechaDesde));
  }

  const fechaHasta = parseDateFilter(options?.fechaHasta);
  if (fechaHasta) {
    conditions.push(lte(asignaturas.fechaInicio, fechaHasta));
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
  options?: {
    incluirArchivadas?: boolean;
    q?: string;
    periodoId?: string;
    estado?: "borrador" | "activo" | "finalizado" | "archivado";
    fechaDesde?: string;
    fechaHasta?: string;
  },
) {
  const actorResult = await requireActionActor("admin_asignatura_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const conditions: (SQL | undefined)[] = [isNull(asignaturas.eliminadoAt)];

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

  if (options?.periodoId) {
    conditions.push(eq(asignaturas.periodoId, options.periodoId));
  }

  const fechaDesde = parseDateFilter(options?.fechaDesde);
  if (fechaDesde) {
    conditions.push(gte(asignaturas.fechaInicio, fechaDesde));
  }

  const fechaHasta = parseDateFilter(options?.fechaHasta);
  if (fechaHasta) {
    conditions.push(lte(asignaturas.fechaInicio, fechaHasta));
  }

  const baseQuery = db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      descripcion: asignaturas.descripcion,
      codigo: asignaturas.codigo,
      fechaInicio: asignaturas.fechaInicio,
      fechaFin: asignaturas.fechaFin,
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
  cursoId: string;
  periodoId: string;
  turno: "manana" | "tarde" | "vespertino";
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

    const [curso] = await db
      .select({ id: cursos.id, codigo: cursos.codigo, activo: cursos.activo })
      .from(cursos)
      .where(and(eq(cursos.id, parsed.data.cursoId), isNull(cursos.eliminadoAt)))
      .limit(1);

    if (!curso) {
      return {
        ok: false,
        code: "curso_not_found",
        message: "El curso seleccionado no existe o no esta disponible.",
      };
    }

    if (curso.activo === false) {
      return {
        ok: false,
        code: "curso_inactivo",
        message: "No puedes crear secciones usando un curso inactivo.",
      };
    }

    const [periodo] = await db
      .select({ id: periodosAcademicos.id, codigo: periodosAcademicos.codigo, estado: periodosAcademicos.estado })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, parsed.data.periodoId))
      .limit(1);

    if (!periodo) {
      return {
        ok: false,
        code: "periodo_not_found",
        message: "El periodo academico seleccionado no existe.",
      };
    }

    if (periodo.estado === "cerrado") {
      return {
        ok: false,
        code: "periodo_closed",
        message: "No se pueden crear secciones en periodos cerrados.",
      };
    }

    const [sectionConflict] = await db
      .select({ id: asignaturas.id })
      .from(asignaturas)
      .where(
        and(
          eq(asignaturas.cursoId, parsed.data.cursoId),
          eq(asignaturas.periodoId, parsed.data.periodoId),
          eq(asignaturas.turno, parsed.data.turno),
          isNull(asignaturas.eliminadoAt),
        ),
      )
      .limit(1);

    if (sectionConflict) {
      return {
        ok: false,
        code: "section_conflict",
        message: "Ya existe una seccion para este curso, periodo y turno.",
      };
    }

    let sectionCode = parsed.data.codigo;
    if (!sectionCode) {
      const turnoCode = turnoCodeMap[parsed.data.turno];
      const cursoCode = normalizeCodeSegment(curso.codigo, "CURSO", 8);
      const periodoCode = normalizeCodeSegment(periodo.codigo, "PER", 10);
      const baseCode = `${cursoCode}-${periodoCode}-${turnoCode}`.slice(0, 24);

      sectionCode = baseCode;
      let suffix = 2;

      while (true) {
        const [existingCode] = await db
          .select({ id: asignaturas.id })
          .from(asignaturas)
          .where(and(eq(asignaturas.codigo, sectionCode), isNull(asignaturas.eliminadoAt)))
          .limit(1);

        if (!existingCode) break;

        const suffixText = `-${String(suffix).padStart(2, "0")}`;
        sectionCode = `${baseCode.slice(0, 24 - suffixText.length)}${suffixText}`;
        suffix += 1;
      }
    } else {
      const [existingCode] = await db
        .select({ id: asignaturas.id })
        .from(asignaturas)
        .where(and(eq(asignaturas.codigo, sectionCode), isNull(asignaturas.eliminadoAt)))
        .limit(1);

      if (existingCode) {
        return {
          ok: false,
          code: "codigo_duplicado",
          message: "Ya existe una seccion con ese codigo.",
        };
      }
    }

    const fechaFin = addMonthsToIsoDate(parsed.data.fechaInicio, parsed.data.duracionMeses);

    const [created] = await db
      .insert(asignaturas)
      .values({
        nombre: sanitizeText(parsed.data.nombre),
        descripcion: sanitizeOptionalText(parsed.data.descripcion),
        codigo: sectionCode,
        fechaInicio: parsed.data.fechaInicio,
        fechaFin,
        cursoId: parsed.data.cursoId,
        periodoId: parsed.data.periodoId,
        turno: parsed.data.turno,
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
        codigo: sectionCode,
        cursoId: parsed.data.cursoId,
        periodoId: parsed.data.periodoId,
        turno: parsed.data.turno,
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

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(parsed.data.asignaturaId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
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
    cursoId: getStringField(formData, "cursoId"),
    periodoId: getStringField(formData, "periodoId"),
    turno: (getStringField(formData, "turno") || "") as "manana" | "tarde" | "vespertino",
    fechaInicio: getStringField(formData, "fechaInicio"),
    duracionMeses: parseIntegerField(getStringField(formData, "duracionMeses")) ?? 0,
    maxAlumnos: parseIntegerField(getStringField(formData, "maxAlumnos")) ?? 0,
    docenteId: getStringField(formData, "docenteId") || undefined,
  });

  revalidatePath("/admin/asignaturas");
  redirect(`/admin/asignaturas?state=${result.ok ? result.code : "error"}`);
}

export async function editarAsignaturaFormAction(formData: FormData): Promise<void> {
  const result = await editarAsignaturaAction({
    id: getStringField(formData, "id"),
    nombre: getStringField(formData, "nombre"),
    descripcion: getStringField(formData, "descripcion"),
    maxAlumnos: parseIntegerField(getStringField(formData, "maxAlumnos")) ?? 0,
    fechaInicio: getStringField(formData, "fechaInicio"),
    fechaFin: getStringField(formData, "fechaFin"),
    duracionMeses: parseIntegerField(getStringField(formData, "duracionMeses")) ?? 0,
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
  fechaFin: string;
  duracionMeses: number;
  docenteId?: string;
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

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(parsed.data.id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

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
        fechaFin: parsed.data.fechaFin,
        duracionMeses: parsed.data.duracionMeses,
        docenteId: parsed.data.docenteId ?? null,
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
        fechaInicio: parsed.data.fechaInicio,
        fechaFin: parsed.data.fechaFin,
        duracionMeses: parsed.data.duracionMeses,
        docenteId: parsed.data.docenteId ?? null,
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

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(input.id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
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

export async function desarchivariAsignaturaAction(input: { id: string }): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_asignatura_desarchivar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: asignaturas.id, estado: asignaturas.estado, nombre: asignaturas.nombre })
      .from(asignaturas)
      .where(and(eq(asignaturas.id, input.id), isNull(asignaturas.eliminadoAt)))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "asignatura_not_found", message: "No se encontró la asignatura." };
    }

    if (existing.estado !== "archivado") {
      return { ok: true, code: "not_archived" };
    }

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(input.id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    await db
      .update(asignaturas)
      .set({ estado: "activo", updatedAt: new Date() })
      .where(eq(asignaturas.id, input.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "asignaturas",
      entidadId: input.id,
      payload: { nombre: existing.nombre, accion: "desarchivar", estadoAnterior: "archivado", estadoNuevo: "activo" },
      exitoso: true,
    });

    return { ok: true, code: "asignatura_unarchived" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_asignatura_desarchivar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "error", message: "No fue posible desarchivar la asignatura." };
  }
}

export async function desarchivariAsignaturaFormAction(formData: FormData): Promise<void> {
  const result = await desarchivariAsignaturaAction({ id: getStringField(formData, "id") });
  revalidatePath("/admin/asignaturas");
  redirect(`/admin/asignaturas?state=${result.ok ? result.code : "error"}`);
}

export async function eliminarAsignaturaAction(input: { id: string }): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_asignatura_eliminar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: asignaturas.id, nombre: asignaturas.nombre, eliminadoAt: asignaturas.eliminadoAt })
      .from(asignaturas)
      .where(eq(asignaturas.id, input.id))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "asignatura_not_found", message: "No se encontró la asignatura." };
    }

    if (existing.eliminadoAt) {
      return { ok: true, code: "already_deleted" };
    }

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(input.id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    await db
      .update(asignaturas)
      .set({
        eliminadoAt: new Date(),
        eliminadoPor: actorResult.actor.userId,
        updatedAt: new Date(),
      })
      .where(eq(asignaturas.id, input.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "asignaturas",
      entidadId: input.id,
      payload: { nombre: existing.nombre, accion: "soft_delete" },
      exitoso: true,
    });

    return { ok: true, code: "asignatura_deleted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_asignatura_eliminar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "error", message: "No fue posible eliminar la asignatura." };
  }
}

export async function eliminarAsignaturaFormAction(formData: FormData): Promise<void> {
  const result = await eliminarAsignaturaAction({ id: getStringField(formData, "id") });
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
