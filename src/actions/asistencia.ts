"use server";

import { and, asc, eq, sql, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { asistencia, asignaturas, matriculas } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor } from "./_security";

export async function listarAsistenciaPorClase(
  claseId: string,
  pagination: PaginationInput = {},
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  return db
    .select()
    .from(asistencia)
    .where(eq(asistencia.claseId, claseId))
    .orderBy(asc(asistencia.fechaRegistro), asc(asistencia.id))
    .limit(limit)
    .offset(offset);
}

export async function obtenerAsistenciaMatriculaEnClase(
  claseId: string,
  matriculaId: string,
) {
  const db = getDb();

  const [row] = await db
    .select()
    .from(asistencia)
    .where(and(eq(asistencia.claseId, claseId), eq(asistencia.matriculaId, matriculaId)))
    .limit(1);

  return row ?? null;
}

export type AsistenciaResumenAlumno = {
  asignaturaId: string;
  asignaturaNombre: string;
  presente: number;
  ausente: number;
  tardanza: number;
  justificado: number;
  total: number;
};

export async function obtenerResumenAsistenciaAlumno(): Promise<AsistenciaResumenAlumno[]> {
  const actorResult = await requireActionActor("alumno_asistencia_resumen", ["alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  const rows = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      estado: asistencia.estado,
      count: sql<number>`count(*)`,
    })
    .from(asistencia)
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .groupBy(asignaturas.id, asignaturas.nombre, asistencia.estado);

  const map = new Map<string, AsistenciaResumenAlumno>();

  for (const row of rows) {
    let entry = map.get(row.asignaturaId);

    if (!entry) {
      entry = {
        asignaturaId: row.asignaturaId,
        asignaturaNombre: row.asignaturaNombre,
        presente: 0,
        ausente: 0,
        tardanza: 0,
        justificado: 0,
        total: 0,
      };
      map.set(row.asignaturaId, entry);
    }

    const count = Number(row.count) || 0;

    if (row.estado === "presente") entry.presente = count;
    else if (row.estado === "ausente") entry.ausente = count;
    else if (row.estado === "tardanza") entry.tardanza = count;
    else if (row.estado === "justificado") entry.justificado = count;

    entry.total += count;
  }

  return Array.from(map.values());
}
