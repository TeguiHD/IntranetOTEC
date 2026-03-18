"use server";

import { desc, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  notasDocente,
  observacionesDocente,
  usuarios,
} from "@/db/schema";

import { requireActionActor } from "./_security";

export type ResumenDocenteData = {
  docenteId: string;
  docenteNombre: string;
  docenteApellido: string;
  asignaturas: {
    asignaturaId: string;
    asignaturaNombre: string;
    totalClases: number;
    totalAsistencias: number;
    totalNotas: number;
    totalObservaciones: number;
  }[];
};

export async function obtenerResumenDatosDocentes(): Promise<ResumenDocenteData[]> {
  const actorResult = await requireActionActor("admin_resumen_docentes", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  const clasesAgg = await db
    .select({
      docenteId: asignaturas.docenteId,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      totalClases: sql<number>`count(distinct ${clases.id})`,
      totalAsistencias: sql<number>`count(distinct ${asistencia.id})`,
    })
    .from(asignaturas)
    .innerJoin(usuarios, sql`${asignaturas.docenteId} = ${usuarios.id}`)
    .leftJoin(clases, sql`${clases.asignaturaId} = ${asignaturas.id} AND ${clases.eliminadoAt} IS NULL`)
    .leftJoin(asistencia, sql`${asistencia.claseId} = ${clases.id}`)
    .groupBy(asignaturas.docenteId, usuarios.nombre, usuarios.apellido, asignaturas.id, asignaturas.nombre)
    .orderBy(desc(asignaturas.createdAt));

  const notasAgg = await db
    .select({
      asignaturaId: notasDocente.asignaturaId,
      total: sql<number>`count(*)`,
    })
    .from(notasDocente)
    .groupBy(notasDocente.asignaturaId);

  const obsAgg = await db
    .select({
      asignaturaId: observacionesDocente.asignaturaId,
      total: sql<number>`count(*)`,
    })
    .from(observacionesDocente)
    .groupBy(observacionesDocente.asignaturaId);

  const notasMap = new Map(notasAgg.map((r) => [r.asignaturaId, Number(r.total) || 0]));
  const obsMap = new Map(obsAgg.map((r) => [r.asignaturaId, Number(r.total) || 0]));

  const docenteMap = new Map<string, ResumenDocenteData>();

  for (const row of clasesAgg) {
    if (!row.docenteId) continue;

    let entry = docenteMap.get(row.docenteId);

    if (!entry) {
      entry = {
        docenteId: row.docenteId,
        docenteNombre: row.docenteNombre,
        docenteApellido: row.docenteApellido,
        asignaturas: [],
      };
      docenteMap.set(row.docenteId, entry);
    }

    entry.asignaturas.push({
      asignaturaId: row.asignaturaId,
      asignaturaNombre: row.asignaturaNombre,
      totalClases: Number(row.totalClases) || 0,
      totalAsistencias: Number(row.totalAsistencias) || 0,
      totalNotas: notasMap.get(row.asignaturaId) ?? 0,
      totalObservaciones: obsMap.get(row.asignaturaId) ?? 0,
    });
  }

  return Array.from(docenteMap.values());
}
