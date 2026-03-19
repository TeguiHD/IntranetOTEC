"use server";

import { and, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  matriculas,
  solicitudesDocumentos,
  usuarios,
} from "@/db/schema";

import { requireActionActor } from "./_security";

export type MetricasGlobales = {
  totalDocentes: number;
  totalAlumnos: number;
  totalAsignaturas: number;
  asignaturasActivas: number;
  asignaturasPorFinalizar: number;
  totalClases: number;
  solicitudesPendientes: number;
};

export type AsignaturaMetrica = {
  id: string;
  nombre: string;
  estado: string | null;
  docenteNombre: string | null;
  totalAlumnos: number;
  totalClases: number;
  asistenciaPromedio: number | null;
};

export async function obtenerMetricasGlobales(): Promise<MetricasGlobales | null> {
  const actorResult = await requireActionActor("admin_metricas_globales", ["admin"]);

  if (!actorResult.ok) return null;

  const db = getDb();

  const [
    [docentesCount],
    [alumnosCount],
    asigRows,
    [clasesCount],
    [solicitudesCount],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(usuarios)
      .where(and(eq(usuarios.rol, "docente"), eq(usuarios.activo, true), isNull(usuarios.eliminadoAt))),
    db.select({ count: sql<number>`count(*)` })
      .from(usuarios)
      .where(and(eq(usuarios.rol, "alumno"), eq(usuarios.activo, true), isNull(usuarios.eliminadoAt))),
    db.select({ estado: asignaturas.estado, count: sql<number>`count(*)` })
      .from(asignaturas)
      .groupBy(asignaturas.estado),
    db.select({ count: sql<number>`count(*)` })
      .from(clases)
      .where(isNull(clases.eliminadoAt)),
    db.select({ count: sql<number>`count(*)` })
      .from(solicitudesDocumentos)
      .where(eq(solicitudesDocumentos.estado, "pendiente")),
  ]);

  const totalAsig = asigRows.reduce((s, r) => s + Number(r.count), 0);
  const activasCount = Number(asigRows.find((r) => r.estado === "activo")?.count ?? 0);
  const finalizadoCount = Number(asigRows.find((r) => r.estado === "finalizado")?.count ?? 0);

  return {
    totalDocentes: Number(docentesCount?.count ?? 0),
    totalAlumnos: Number(alumnosCount?.count ?? 0),
    totalAsignaturas: totalAsig,
    asignaturasActivas: activasCount,
    asignaturasPorFinalizar: finalizadoCount,
    totalClases: Number(clasesCount?.count ?? 0),
    solicitudesPendientes: Number(solicitudesCount?.count ?? 0),
  };
}

export async function obtenerMetricasPorAsignatura(): Promise<AsignaturaMetrica[]> {
  const actorResult = await requireActionActor("admin_metricas_asignaturas", ["admin"]);

  if (!actorResult.ok) return [];

  const db = getDb();

  const [rows, alumnosCounts, clasesCounts, asistStats] = await Promise.all([
    db.select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      estado: asignaturas.estado,
      docenteNombre: usuarios.nombre,
    })
    .from(asignaturas)
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id)),

    db.select({
      asignaturaId: matriculas.asignaturaId,
      count: sql<number>`count(distinct ${matriculas.alumnoId})`,
    })
    .from(matriculas)
    .where(and(eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)))
    .groupBy(matriculas.asignaturaId),

    db.select({
      asignaturaId: clases.asignaturaId,
      count: sql<number>`count(*)`,
    })
    .from(clases)
    .where(isNull(clases.eliminadoAt))
    .groupBy(clases.asignaturaId),

    db.select({
      asignaturaId: clases.asignaturaId,
      total: sql<number>`count(*)`,
      presentes: sql<number>`count(*) filter (where ${asistencia.estado} = 'presente' or ${asistencia.estado} = 'tardanza')`,
    })
    .from(asistencia)
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .where(isNull(clases.eliminadoAt))
    .groupBy(clases.asignaturaId),
  ]);

  const alumnosMap = new Map(alumnosCounts.map((r) => [r.asignaturaId, Number(r.count)]));
  const clasesMap = new Map(clasesCounts.map((r) => [r.asignaturaId, Number(r.count)]));
  const asistMap = new Map(
    asistStats.map((r) => {
      const total = Number(r.total);
      const presentes = Number(r.presentes);
      return [r.asignaturaId, total > 0 ? Math.round((presentes / total) * 100) : null];
    }),
  );

  return rows.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    estado: r.estado,
    docenteNombre: r.docenteNombre,
    totalAlumnos: alumnosMap.get(r.id) ?? 0,
    totalClases: clasesMap.get(r.id) ?? 0,
    asistenciaPromedio: asistMap.get(r.id) ?? null,
  }));
}
