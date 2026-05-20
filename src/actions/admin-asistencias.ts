"use server";

import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, asistencia, clases, matriculas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";

import { requireActionActor } from "./_security";

const ASISTENCIAS_PAGE_SIZE_DEFAULT = 50;
const ASISTENCIAS_PAGE_SIZE_MAX = 200;

type AsistenciasFilters = {
  q?: string;
  asignaturaId?: string;
  periodoId?: string;
};

const buildAsistenciasFilters = (options?: AsistenciasFilters): SQL[] => {
  const conditions: SQL[] = [];

  if (options?.asignaturaId) {
    conditions.push(eq(asignaturas.id, options.asignaturaId));
  }

  if (options?.periodoId) {
    conditions.push(eq(asignaturas.periodoId, options.periodoId));
  }

  if (options?.q) {
    const term = `%${escapeLike(options.q)}%`;
    const ors = or(
      ilike(usuarios.nombre, term),
      ilike(usuarios.apellido, term),
      ilike(usuarios.rut, term),
    );
    if (ors) conditions.push(ors);
  }

  return conditions;
};

export type AsistenciaAdminRow = {
  id: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
  observacion: string | null;
  fechaRegistro: Date | null;
  claseId: string;
  claseTitulo: string;
  claseFecha: string;
  numeroSesion: number;
  asignaturaNombre: string;
  asignaturaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
};

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

const ESTADOS_ASISTENCIA = new Set(["presente", "ausente", "tardanza", "justificado"]);

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const normalizeRedirectTo = (redirectTo: string, fallback = "/admin/asistencias"): string => {
  const [pathname, search = ""] = redirectTo.startsWith("/admin/asistencias")
    ? redirectTo.split("?")
    : [fallback, ""];
  return search ? `${pathname}?${search}` : pathname;
};

export type MatriculaAsistenciaAdminOption = {
  matriculaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
};

export type ClaseAsistenciaAdminOption = {
  claseId: string;
  titulo: string;
  fecha: string;
  numeroSesion: number;
};

export async function listarMatriculasParaAsistenciaAdmin(
  asignaturaId?: string,
): Promise<MatriculaAsistenciaAdminOption[]> {
  const actorResult = await requireActionActor("admin_asistencias_matriculas_list", ["admin"]);
  if (!actorResult.ok || !asignaturaId) return [];

  const db = getDb();

  return db
    .select({
      matriculaId: matriculas.id,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(
      and(
        eq(matriculas.asignaturaId, asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
        isNull(usuarios.eliminadoAt),
      ),
    )
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));
}

export async function listarClasesParaAsistenciaAdmin(
  asignaturaId?: string,
): Promise<ClaseAsistenciaAdminOption[]> {
  const actorResult = await requireActionActor("admin_asistencias_clases_list", ["admin"]);
  if (!actorResult.ok || !asignaturaId) return [];

  const db = getDb();

  return db
    .select({
      claseId: clases.id,
      titulo: clases.titulo,
      fecha: clases.fecha,
      numeroSesion: clases.numeroSesion,
    })
    .from(clases)
    .where(and(eq(clases.asignaturaId, asignaturaId), isNull(clases.eliminadoAt)))
    .orderBy(asc(clases.fecha), asc(clases.numeroSesion));
}

export async function listarAsistenciasAdmin(
  options?: AsistenciasFilters & { limit?: number; offset?: number },
): Promise<AsistenciaAdminRow[]> {
  const actorResult = await requireActionActor("admin_asistencias_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const conditions = buildAsistenciasFilters(options);
  const limit = Math.max(
    1,
    Math.min(options?.limit ?? ASISTENCIAS_PAGE_SIZE_DEFAULT, ASISTENCIAS_PAGE_SIZE_MAX),
  );
  const offset = Math.max(0, options?.offset ?? 0);

  const baseQuery = db
    .select({
      id: asistencia.id,
      estado: asistencia.estado,
      observacion: asistencia.observacion,
      fechaRegistro: asistencia.fechaRegistro,
      claseId: clases.id,
      claseTitulo: clases.titulo,
      claseFecha: clases.fecha,
      numeroSesion: clases.numeroSesion,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(asistencia)
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  return filtered
    .orderBy(desc(clases.fecha), asc(clases.numeroSesion), asc(usuarios.apellido))
    .limit(limit)
    .offset(offset);
}

export async function countAsistenciasAdmin(options?: AsistenciasFilters): Promise<number> {
  const actorResult = await requireActionActor("admin_asistencias_list", ["admin"]);
  if (!actorResult.ok) return 0;

  const db = getDb();
  const conditions = buildAsistenciasFilters(options);

  const baseQuery = db
    .select({ total: count(asistencia.id) })
    .from(asistencia)
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const [row] = await filtered;
  return Number(row?.total ?? 0);
}

export type ResumenAsistenciaAdmin = {
  total: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  justificados: number;
};

/**
 * Agrega los contadores por estado en SQL en lugar de traer todas las filas
 * al servidor de Next y contarlas en JS. Permite que las metricas escalen
 * a operaciones grandes sin bloqueo.
 */
export async function resumenAsistenciasAdmin(
  options?: AsistenciasFilters,
): Promise<ResumenAsistenciaAdmin> {
  const actorResult = await requireActionActor("admin_asistencias_list", ["admin"]);
  if (!actorResult.ok) {
    return { total: 0, presentes: 0, ausentes: 0, tardanzas: 0, justificados: 0 };
  }

  const db = getDb();
  const conditions = buildAsistenciasFilters(options);

  const baseQuery = db
    .select({
      total: count(asistencia.id),
      presentes: sql<number>`count(*) filter (where ${asistencia.estado} = 'presente')::int`,
      ausentes: sql<number>`count(*) filter (where ${asistencia.estado} = 'ausente')::int`,
      tardanzas: sql<number>`count(*) filter (where ${asistencia.estado} = 'tardanza')::int`,
      justificados: sql<number>`count(*) filter (where ${asistencia.estado} = 'justificado')::int`,
    })
    .from(asistencia)
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const [row] = await filtered;

  return {
    total: Number(row?.total ?? 0),
    presentes: Number(row?.presentes ?? 0),
    ausentes: Number(row?.ausentes ?? 0),
    tardanzas: Number(row?.tardanzas ?? 0),
    justificados: Number(row?.justificados ?? 0),
  };
}

export async function actualizarAsistenciaAdminAction(input: {
  asistenciaId: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado";
  observacion?: string;
}) {
  const actorResult = await requireActionActor("admin_asistencia_update", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.asistenciaId || !ESTADOS_ASISTENCIA.has(input.estado)) {
    return { ok: false, code: "invalid_input", message: "Datos de asistencia invalidos." };
  }

  const db = getDb();
  const observacion = input.observacion?.trim() || null;

  const [existing] = await db
    .select({ id: asistencia.id })
    .from(asistencia)
    .where(eq(asistencia.id, input.asistenciaId))
    .limit(1);

  if (!existing) {
    return { ok: false, code: "attendance_not_found", message: "Registro de asistencia no encontrado." };
  }

  await db
    .update(asistencia)
    .set({
      estado: input.estado,
      observacion,
      fechaRegistro: new Date(),
    })
    .where(eq(asistencia.id, input.asistenciaId));

  revalidatePath("/admin/asistencias");
  revalidatePath("/alumno/asignaturas");
  revalidatePath("/alumno/asistencias");

  return { ok: true, code: "attendance_updated" };
}

export async function crearAsistenciaAdminAction(input: {
  claseId: string;
  matriculaId: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado";
  observacion?: string;
}) {
  const actorResult = await requireActionActor("admin_asistencia_create", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.claseId || !input.matriculaId || !ESTADOS_ASISTENCIA.has(input.estado)) {
    return { ok: false, code: "invalid_input", message: "Datos de asistencia invalidos." };
  }

  const db = getDb();
  const observacion = input.observacion?.trim() || null;

  const [claseRow] = await db
    .select({
      id: clases.id,
      asignaturaId: clases.asignaturaId,
    })
    .from(clases)
    .where(and(eq(clases.id, input.claseId), isNull(clases.eliminadoAt)))
    .limit(1);

  if (!claseRow) {
    return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
  }

  const [matriculaRow] = await db
    .select({
      id: matriculas.id,
      alumnoId: matriculas.alumnoId,
      asignaturaId: matriculas.asignaturaId,
    })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.id, input.matriculaId),
        eq(matriculas.asignaturaId, claseRow.asignaturaId),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matriculaRow) {
    return { ok: false, code: "matricula_not_found", message: "Matricula no encontrada." };
  }

  const [existing] = await db
    .select({ id: asistencia.id })
    .from(asistencia)
    .where(and(eq(asistencia.claseId, input.claseId), eq(asistencia.matriculaId, input.matriculaId)))
    .limit(1);

  const fechaRegistro = new Date();

  if (existing) {
    await db
      .update(asistencia)
      .set({
        estado: input.estado,
        observacion,
        registradoPor: actorResult.actor.userId,
        fechaRegistro,
      })
      .where(eq(asistencia.id, existing.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "registrar_asistencia",
      entidad: "asistencia",
      entidadId: existing.id,
      payload: {
        origen: "admin",
        accion: "actualizar_existente",
        claseId: input.claseId,
        matriculaId: input.matriculaId,
        alumnoId: matriculaRow.alumnoId,
        asignaturaId: claseRow.asignaturaId,
        estado: input.estado,
      },
      exitoso: true,
    });

    revalidatePath("/admin/asistencias");
    revalidatePath("/alumno/asignaturas");
    revalidatePath("/alumno/asistencias");

    return { ok: true, code: "attendance_updated" };
  }

  const [created] = await db
    .insert(asistencia)
    .values({
      claseId: input.claseId,
      matriculaId: input.matriculaId,
      estado: input.estado,
      observacion,
      registradoPor: actorResult.actor.userId,
      fechaRegistro,
    })
    .returning({ id: asistencia.id });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "registrar_asistencia",
    entidad: "asistencia",
    entidadId: created.id,
    payload: {
      origen: "admin",
      claseId: input.claseId,
      matriculaId: input.matriculaId,
      alumnoId: matriculaRow.alumnoId,
      asignaturaId: claseRow.asignaturaId,
      estado: input.estado,
    },
    exitoso: true,
  });

  revalidatePath("/admin/asistencias");
  revalidatePath("/alumno/asignaturas");
  revalidatePath("/alumno/asistencias");

  return { ok: true, code: "attendance_created" };
}

export async function actualizarAsistenciaAdminFormAction(formData: FormData): Promise<void> {
  const redirectTo = getStringField(formData, "redirectTo") || "/admin/asistencias";
  const result = await actualizarAsistenciaAdminAction({
    asistenciaId: getStringField(formData, "asistenciaId"),
    estado: getStringField(formData, "estado") as "presente" | "ausente" | "tardanza" | "justificado",
    observacion: getStringField(formData, "observacion"),
  });

  const [pathname, search = ""] = normalizeRedirectTo(redirectTo).split("?");
  const params = new URLSearchParams(search);
  params.set("state", result.ok ? result.code : "error");
  redirect(`${pathname}?${params.toString()}`);
}

export async function crearAsistenciaAdminFormAction(formData: FormData): Promise<void> {
  const redirectTo = getStringField(formData, "redirectTo") || "/admin/asistencias";
  const result = await crearAsistenciaAdminAction({
    claseId: getStringField(formData, "claseId"),
    matriculaId: getStringField(formData, "matriculaId"),
    estado: getStringField(formData, "estado") as "presente" | "ausente" | "tardanza" | "justificado",
    observacion: getStringField(formData, "observacion"),
  });

  const [pathname, search = ""] = normalizeRedirectTo(redirectTo).split("?");
  const params = new URLSearchParams(search);
  params.set("state", result.ok ? result.code : result.code);
  redirect(`${pathname}?${params.toString()}`);
}
