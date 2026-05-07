"use server";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, matriculas, notasDocente, usuarios } from "@/db/schema";

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
