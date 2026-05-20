"use server";

import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, matriculas, notasDocente, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";

import { requireActionActor } from "./_security";

const NOTAS_PAGE_SIZE_DEFAULT = 50;
const NOTAS_PAGE_SIZE_MAX = 200;
const NOTA_APROBACION_MIN = 4.0;

type NotasFilters = {
  q?: string;
  asignaturaId?: string;
  periodoId?: string;
};

const buildNotasFilters = (options?: NotasFilters): SQL[] => {
  const conditions: SQL[] = [];

  if (options?.asignaturaId) {
    conditions.push(eq(notasDocente.asignaturaId, options.asignaturaId));
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

export type NotaAdminRow = {
  id: string;
  nota: string;
  fechaRegistro: string;
  anioRegistro: number;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  asignaturaNombre: string;
  asignaturaId: string;
  docenteNombre: string;
  docenteApellido: string;
};

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const parseDateInput = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeRedirectTo = (redirectTo: string, fallback = "/admin/notas"): string => {
  const [pathname, search = ""] = redirectTo.startsWith("/admin/notas")
    ? redirectTo.split("?")
    : [fallback, ""];
  return search ? `${pathname}?${search}` : pathname;
};

export type MatriculaNotaAdminOption = {
  matriculaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
};

export async function listarMatriculasParaNotaAdmin(
  asignaturaId?: string,
): Promise<MatriculaNotaAdminOption[]> {
  const actorResult = await requireActionActor("admin_notas_matriculas_list", ["admin"]);
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

export async function listarNotasAdmin(
  options?: NotasFilters & { limit?: number; offset?: number },
): Promise<NotaAdminRow[]> {
  const actorResult = await requireActionActor("admin_notas_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const limit = Math.max(
    1,
    Math.min(options?.limit ?? NOTAS_PAGE_SIZE_DEFAULT, NOTAS_PAGE_SIZE_MAX),
  );
  const offset = Math.max(0, options?.offset ?? 0);

  const docenteAlias = db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
    })
    .from(usuarios)
    .as("docente");

  const baseQuery = db
    .select({
      id: notasDocente.id,
      nota: notasDocente.nota,
      fechaRegistro: notasDocente.fechaRegistro,
      anioRegistro: notasDocente.anioRegistro,
      asignaturaId: notasDocente.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      docenteNombre: docenteAlias.nombre,
      docenteApellido: docenteAlias.apellido,
    })
    .from(notasDocente)
    .innerJoin(matriculas, eq(notasDocente.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .innerJoin(asignaturas, eq(notasDocente.asignaturaId, asignaturas.id))
    .innerJoin(docenteAlias, eq(notasDocente.docenteId, docenteAlias.id));

  const conditions = buildNotasFilters(options);
  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  return filtered
    .orderBy(desc(notasDocente.fechaRegistro), asc(usuarios.apellido))
    .limit(limit)
    .offset(offset);
}

export async function countNotasAdmin(options?: NotasFilters): Promise<number> {
  const actorResult = await requireActionActor("admin_notas_list", ["admin"]);
  if (!actorResult.ok) return 0;

  const db = getDb();
  const conditions = buildNotasFilters(options);

  const baseQuery = db
    .select({ total: count(notasDocente.id) })
    .from(notasDocente)
    .innerJoin(matriculas, eq(notasDocente.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .innerJoin(asignaturas, eq(notasDocente.asignaturaId, asignaturas.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const [row] = await filtered;
  return Number(row?.total ?? 0);
}

export type ResumenNotasAdmin = {
  total: number;
  aprobados: number;
  reprobados: number;
  promedio: number | null;
};

/**
 * Calcula totales y promedios de notas en SQL. Antes esto se hacia trayendo
 * todas las filas a JS, lo que escalaba mal con periodos extensos.
 */
export async function resumenNotasAdmin(
  options?: NotasFilters,
): Promise<ResumenNotasAdmin> {
  const actorResult = await requireActionActor("admin_notas_list", ["admin"]);
  if (!actorResult.ok) {
    return { total: 0, aprobados: 0, reprobados: 0, promedio: null };
  }

  const db = getDb();
  const conditions = buildNotasFilters(options);

  const baseQuery = db
    .select({
      total: count(notasDocente.id),
      aprobados: sql<number>`count(*) filter (where ${notasDocente.nota} >= ${NOTA_APROBACION_MIN})::int`,
      reprobados: sql<number>`count(*) filter (where ${notasDocente.nota} < ${NOTA_APROBACION_MIN})::int`,
      promedio: sql<number | null>`avg(${notasDocente.nota})::float`,
    })
    .from(notasDocente)
    .innerJoin(matriculas, eq(notasDocente.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .innerJoin(asignaturas, eq(notasDocente.asignaturaId, asignaturas.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const [row] = await filtered;

  return {
    total: Number(row?.total ?? 0),
    aprobados: Number(row?.aprobados ?? 0),
    reprobados: Number(row?.reprobados ?? 0),
    promedio:
      row?.promedio === null || row?.promedio === undefined ? null : Number(row.promedio),
  };
}

export async function actualizarNotaAdminAction(input: {
  notaId: string;
  nota: string;
}) {
  const actorResult = await requireActionActor("admin_nota_update", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const notaValue = Number.parseFloat(input.nota.replace(",", "."));
  if (!input.notaId || !Number.isFinite(notaValue) || notaValue < 1 || notaValue > 7) {
    return { ok: false, code: "invalid_input", message: "La nota debe estar entre 1.0 y 7.0." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: notasDocente.id })
    .from(notasDocente)
    .where(eq(notasDocente.id, input.notaId))
    .limit(1);

  if (!existing) {
    return { ok: false, code: "grade_not_found", message: "Nota no encontrada." };
  }

  await db
    .update(notasDocente)
    .set({ nota: notaValue.toFixed(1) })
    .where(eq(notasDocente.id, input.notaId));

  revalidatePath("/admin/notas");
  revalidatePath("/alumno/notas");
  revalidatePath("/alumno/asignaturas");

  return { ok: true, code: "grade_updated" };
}

export async function crearNotaAdminAction(input: {
  asignaturaId: string;
  matriculaId: string;
  nota: string;
  fechaRegistro: string;
}) {
  const actorResult = await requireActionActor("admin_nota_create", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const notaValue = Number.parseFloat(input.nota.replace(",", "."));
  const fechaRegistro = parseDateInput(input.fechaRegistro);
  if (
    !input.asignaturaId ||
    !input.matriculaId ||
    !Number.isFinite(notaValue) ||
    notaValue < 1 ||
    notaValue > 7 ||
    !fechaRegistro
  ) {
    return { ok: false, code: "invalid_input", message: "Datos invalidos para registrar la nota." };
  }

  const db = getDb();

  const [matriculaRow] = await db
    .select({
      id: matriculas.id,
      asignaturaId: matriculas.asignaturaId,
      alumnoId: matriculas.alumnoId,
    })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.id, input.matriculaId),
        eq(matriculas.asignaturaId, input.asignaturaId),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matriculaRow) {
    return { ok: false, code: "matricula_not_found", message: "Matricula no encontrada." };
  }

  const [asignaturaRow] = await db
    .select({ id: asignaturas.id })
    .from(asignaturas)
    .where(eq(asignaturas.id, input.asignaturaId))
    .limit(1);

  if (!asignaturaRow) {
    return { ok: false, code: "asignatura_not_found", message: "Seccion no encontrada." };
  }

  const [created] = await db
    .insert(notasDocente)
    .values({
      docenteId: actorResult.actor.userId,
      asignaturaId: input.asignaturaId,
      matriculaId: input.matriculaId,
      nota: notaValue.toFixed(1),
      fechaRegistro: input.fechaRegistro,
      anioRegistro: fechaRegistro.getUTCFullYear(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: notasDocente.id });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "cambiar_nota",
    entidad: "notas_docente",
    entidadId: created.id,
    payload: {
      origen: "admin",
      asignaturaId: input.asignaturaId,
      matriculaId: input.matriculaId,
      alumnoId: matriculaRow.alumnoId,
      nota: notaValue.toFixed(1),
      fechaRegistro: input.fechaRegistro,
    },
    exitoso: true,
  });

  revalidatePath("/admin/notas");
  revalidatePath("/alumno/notas");
  revalidatePath("/alumno/asignaturas");

  return { ok: true, code: "grade_created" };
}

export async function actualizarNotaAdminFormAction(formData: FormData): Promise<void> {
  const redirectTo = getStringField(formData, "redirectTo") || "/admin/notas";
  const result = await actualizarNotaAdminAction({
    notaId: getStringField(formData, "notaId"),
    nota: getStringField(formData, "nota"),
  });

  const [pathname, search = ""] = normalizeRedirectTo(redirectTo).split("?");
  const params = new URLSearchParams(search);
  params.set("state", result.ok ? result.code : "error");
  redirect(`${pathname}?${params.toString()}`);
}

export async function crearNotaAdminFormAction(formData: FormData): Promise<void> {
  const redirectTo = getStringField(formData, "redirectTo") || "/admin/notas";
  const result = await crearNotaAdminAction({
    asignaturaId: getStringField(formData, "asignaturaId"),
    matriculaId: getStringField(formData, "matriculaId"),
    nota: getStringField(formData, "nota"),
    fechaRegistro: getStringField(formData, "fechaRegistro"),
  });

  const [pathname, search = ""] = normalizeRedirectTo(redirectTo).split("?");
  const params = new URLSearchParams(search);
  params.set("state", result.ok ? result.code : result.code);
  redirect(`${pathname}?${params.toString()}`);
}
