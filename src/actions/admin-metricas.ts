"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  matriculas,
  periodosAcademicos,
  solicitudesDocumentos,
  usuarios,
} from "@/db/schema";

import { requireActionActor } from "./_security";

type PeriodoScopeOptions = {
  periodoId?: string | null;
};

export type DashboardPeriodoOption = {
  id: string;
  codigo: string;
  nombre: string;
  estado: "planificado" | "activo" | "cerrado";
  fechaInicio: string;
  fechaFin: string;
};

const normalizePeriodoId = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === "all") {
    return null;
  }

  return normalized;
};

const buildAsignaturasWhere = (periodoId: string | null) => {
  const activeAsignatura = isNull(asignaturas.eliminadoAt);
  return periodoId ? and(activeAsignatura, eq(asignaturas.periodoId, periodoId)) : activeAsignatura;
};

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

export async function listarPeriodosDashboard(): Promise<DashboardPeriodoOption[]> {
  const actorResult = await requireActionActor("admin_metricas_periodos", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  const rows = await db
    .select({
      id: periodosAcademicos.id,
      codigo: periodosAcademicos.codigo,
      nombre: periodosAcademicos.nombre,
      estado: periodosAcademicos.estado,
      fechaInicio: periodosAcademicos.fechaInicio,
      fechaFin: periodosAcademicos.fechaFin,
    })
    .from(periodosAcademicos)
    .where(isNull(periodosAcademicos.eliminadoAt))
    .orderBy(desc(periodosAcademicos.fechaInicio), desc(periodosAcademicos.createdAt));

  return rows.map((row) => ({
    id: row.id,
    codigo: row.codigo,
    nombre: row.nombre,
    estado: row.estado,
    fechaInicio: row.fechaInicio,
    fechaFin: row.fechaFin,
  }));
}

export async function obtenerMetricasGlobales(
  options: PeriodoScopeOptions = {},
): Promise<MetricasGlobales | null> {
  const actorResult = await requireActionActor("admin_metricas_globales", ["admin"]);

  if (!actorResult.ok) return null;

  const db = getDb();
  const periodoId = normalizePeriodoId(options.periodoId);

  const asignaturasWhere = buildAsignaturasWhere(periodoId);

  const [[docentesCount], [alumnosCount], asigRows, [clasesCount], [solicitudesCount]] = await Promise.all(
    periodoId
      ? [
          db
            .select({ count: sql<number>`count(distinct ${usuarios.id})` })
            .from(asignaturas)
            .innerJoin(
              usuarios,
              and(
                eq(asignaturas.docenteId, usuarios.id),
                eq(usuarios.rol, "docente"),
                eq(usuarios.activo, true),
                isNull(usuarios.eliminadoAt),
              ),
            )
            .where(asignaturasWhere),
          db
            .select({ count: sql<number>`count(distinct ${usuarios.id})` })
            .from(matriculas)
            .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
            .innerJoin(
              usuarios,
              and(
                eq(matriculas.alumnoId, usuarios.id),
                eq(usuarios.rol, "alumno"),
                eq(usuarios.activo, true),
                isNull(usuarios.eliminadoAt),
              ),
            )
            .where(and(isNull(matriculas.eliminadoAt), asignaturasWhere)),
          db
            .select({ estado: asignaturas.estado, count: sql<number>`count(*)` })
            .from(asignaturas)
            .where(asignaturasWhere)
            .groupBy(asignaturas.estado),
          db
            .select({ count: sql<number>`count(*)` })
            .from(clases)
            .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
            .where(and(isNull(clases.eliminadoAt), asignaturasWhere)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(solicitudesDocumentos)
            .where(eq(solicitudesDocumentos.estado, "pendiente")),
        ]
      : [
          db
            .select({ count: sql<number>`count(*)` })
            .from(usuarios)
            .where(and(eq(usuarios.rol, "docente"), eq(usuarios.activo, true), isNull(usuarios.eliminadoAt))),
          db
            .select({ count: sql<number>`count(*)` })
            .from(usuarios)
            .where(and(eq(usuarios.rol, "alumno"), eq(usuarios.activo, true), isNull(usuarios.eliminadoAt))),
          db
            .select({ estado: asignaturas.estado, count: sql<number>`count(*)` })
            .from(asignaturas)
            .where(asignaturasWhere)
            .groupBy(asignaturas.estado),
          db
            .select({ count: sql<number>`count(*)` })
            .from(clases)
            .where(isNull(clases.eliminadoAt)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(solicitudesDocumentos)
            .where(eq(solicitudesDocumentos.estado, "pendiente")),
        ],
  );

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

export async function obtenerMetricasPorAsignatura(
  options: PeriodoScopeOptions = {},
): Promise<AsignaturaMetrica[]> {
  const actorResult = await requireActionActor("admin_metricas_asignaturas", ["admin"]);

  if (!actorResult.ok) return [];

  const db = getDb();
  const periodoId = normalizePeriodoId(options.periodoId);
  const asignaturasWhere = buildAsignaturasWhere(periodoId);

  const [rows, alumnosCounts, clasesCounts, asistStats] = await Promise.all([
    db.select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      estado: asignaturas.estado,
      docenteNombre: usuarios.nombre,
    })
    .from(asignaturas)
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .where(asignaturasWhere),

    db.select({
      asignaturaId: matriculas.asignaturaId,
      count: sql<number>`count(distinct ${matriculas.alumnoId})`,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(and(eq(matriculas.activa, true), isNull(matriculas.eliminadoAt), asignaturasWhere))
    .groupBy(matriculas.asignaturaId),

    db.select({
      asignaturaId: clases.asignaturaId,
      count: sql<number>`count(*)`,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(and(isNull(clases.eliminadoAt), asignaturasWhere))
    .groupBy(clases.asignaturaId),

    db.select({
      asignaturaId: clases.asignaturaId,
      total: sql<number>`count(*)`,
      presentes: sql<number>`count(*) filter (where ${asistencia.estado} = 'presente' or ${asistencia.estado} = 'tardanza')`,
    })
    .from(asistencia)
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(and(isNull(clases.eliminadoAt), asignaturasWhere))
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

export type SeccionSinClasesRow = {
  asignaturaId: string;
  asignaturaNombre: string;
  cursoNombre: string;
  cursoCodigo: string | null;
  periodoCodigo: string;
  totalMatriculas: number;
  totalClases: number;
  sinDia: boolean;
};

export async function obtenerSeccionesSinClasesAdmin(): Promise<SeccionSinClasesRow[]> {
  const actorResult = await requireActionActor("admin_secciones_sin_clases", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db.execute(sql`
    SELECT
      a.id AS asignatura_id,
      a.nombre AS asignatura_nombre,
      c.nombre AS curso_nombre,
      c.codigo AS curso_codigo,
      p.codigo AS periodo_codigo,
      (SELECT COUNT(*) FROM matriculas m WHERE m.asignatura_id = a.id AND m.eliminado_at IS NULL) AS total_matriculas,
      (SELECT COUNT(*) FROM clases cl WHERE cl.asignatura_id = a.id AND cl.publicada = true AND cl.eliminado_at IS NULL) AS total_clases
    FROM asignaturas a
    INNER JOIN cursos c ON c.id = a.curso_id
    INNER JOIN periodos_academicos p ON p.id = a.periodo_id
    WHERE a.eliminado_at IS NULL
      AND p.eliminado_at IS NULL
      AND (SELECT COUNT(*) FROM matriculas m WHERE m.asignatura_id = a.id AND m.eliminado_at IS NULL) > 0
      AND (SELECT COUNT(*) FROM clases cl WHERE cl.asignatura_id = a.id AND cl.publicada = true AND cl.eliminado_at IS NULL) = 0
    ORDER BY total_matriculas DESC, c.nombre
  `);

  return (rows.rows as Array<{
    asignatura_id: string;
    asignatura_nombre: string;
    curso_nombre: string;
    curso_codigo: string | null;
    periodo_codigo: string;
    total_matriculas: number;
    total_clases: number;
  }>).map((r) => ({
    asignaturaId: r.asignatura_id,
    asignaturaNombre: r.asignatura_nombre,
    cursoNombre: r.curso_nombre,
    cursoCodigo: r.curso_codigo,
    periodoCodigo: r.periodo_codigo,
    totalMatriculas: Number(r.total_matriculas),
    totalClases: Number(r.total_clases),
    sinDia: !/\b(Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo)\b/i.test(r.asignatura_nombre),
  }));
}
