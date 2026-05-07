"use server";

import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, asistencia, clases, matriculas, usuarios } from "@/db/schema";

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
