"use server";

import { and, avg, count, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  cursos,
  evaluaciones,
  matriculas,
  notas,
  periodosAcademicos,
  usuarios,
} from "@/db/schema";

import { requireActionActor } from "./_security";

// ---- Rendimiento académico ----

export async function reporteRendimientoAcademico(periodoId?: string) {
  const actorResult = await requireActionActor("reporte_rendimiento", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const conditions = [isNull(asignaturas.eliminadoAt)];
  if (periodoId) conditions.push(eq(asignaturas.periodoId, periodoId));

  return db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      cursoNombre: cursos.nombre,
      periodoNombre: periodosAcademicos.nombre,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      totalMatriculas: sql<number>`(
        SELECT COUNT(*)::int
        FROM matriculas m
        WHERE m.asignatura_id = ${asignaturas.id}
          AND m.eliminado_at IS NULL
      )`.mapWith(Number),
      promedioGeneral: avg(notas.nota).mapWith(Number),
    })
    .from(asignaturas)
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .leftJoin(evaluaciones, and(eq(evaluaciones.asignaturaId, asignaturas.id), isNull(evaluaciones.eliminadoAt)))
    .leftJoin(notas, and(eq(notas.evaluacionId, evaluaciones.id), isNull(notas.eliminadoAt)))
    .where(and(...conditions))
    .groupBy(
      asignaturas.id,
      asignaturas.nombre,
      cursos.nombre,
      periodosAcademicos.nombre,
      usuarios.nombre,
      usuarios.apellido,
    )
    .orderBy(asignaturas.nombre);
}

// ---- Retención / Deserción ----

export async function reporteRetencion(periodoId?: string) {
  const actorResult = await requireActionActor("reporte_retencion", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const conditions = [isNull(asignaturas.eliminadoAt), eq(usuarios.rol, "alumno")];
  if (periodoId) conditions.push(eq(asignaturas.periodoId, periodoId));

  const rows = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      periodoNombre: periodosAcademicos.nombre,
      estadoAlumno: usuarios.estadoAlumno,
      total: count(matriculas.id).mapWith(Number),
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(and(...conditions))
    .groupBy(
      asignaturas.id,
      asignaturas.nombre,
      periodosAcademicos.nombre,
      usuarios.estadoAlumno,
    )
    .orderBy(asignaturas.nombre);

  // Agrupar por asignatura
  const map = new Map<string, {
    asignaturaId: string;
    asignaturaNombre: string;
    periodoNombre: string | null;
    activos: number;
    egresados: number;
    retirados: number;
    otros: number;
    total: number;
  }>();

  for (const row of rows) {
    const existing = map.get(row.asignaturaId) ?? {
      asignaturaId: row.asignaturaId,
      asignaturaNombre: row.asignaturaNombre,
      periodoNombre: row.periodoNombre,
      activos: 0,
      egresados: 0,
      retirados: 0,
      otros: 0,
      total: 0,
    };

    if (row.estadoAlumno === "activo") existing.activos += row.total;
    else if (row.estadoAlumno === "egresado") existing.egresados += row.total;
    else if (row.estadoAlumno === "retirado" || row.estadoAlumno === "desertor") existing.retirados += row.total;
    else existing.otros += row.total;

    existing.total += row.total;
    map.set(row.asignaturaId, existing);
  }

  return Array.from(map.values());
}

// ---- Asistencia ----

export async function reporteAsistencia(periodoId?: string) {
  const actorResult = await requireActionActor("reporte_asistencia", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const conditions = [isNull(asignaturas.eliminadoAt)];
  if (periodoId) conditions.push(eq(asignaturas.periodoId, periodoId));

  return db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      periodoNombre: periodosAcademicos.nombre,
      totalClases: sql<number>`COUNT(DISTINCT ${clases.id})`.mapWith(Number),
      totalAsistencias: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'presente' THEN 1 END)`.mapWith(Number),
      totalAusencias: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'ausente' THEN 1 END)`.mapWith(Number),
      totalTardanzas: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'tardanza' THEN 1 END)`.mapWith(Number),
    })
    .from(asignaturas)
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .leftJoin(clases, and(eq(clases.asignaturaId, asignaturas.id), isNull(clases.eliminadoAt)))
    .leftJoin(asistencia, eq(asistencia.claseId, clases.id))
    .where(and(...conditions))
    .groupBy(asignaturas.id, asignaturas.nombre, periodosAcademicos.nombre)
    .orderBy(asignaturas.nombre);
}

// ---- Distribución de notas ----

export async function reporteDistribucionNotas(asignaturaId?: string, periodoId?: string) {
  const actorResult = await requireActionActor("reporte_notas", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const conditions = [isNull(notas.eliminadoAt)];
  if (asignaturaId) conditions.push(eq(evaluaciones.asignaturaId, asignaturaId));
  if (periodoId) conditions.push(eq(asignaturas.periodoId, periodoId));

  return db
    .select({
      rango: sql<string>`
        CASE
          WHEN ${notas.nota}::numeric >= 6.0 THEN '6.0-7.0'
          WHEN ${notas.nota}::numeric >= 5.0 THEN '5.0-5.9'
          WHEN ${notas.nota}::numeric >= 4.0 THEN '4.0-4.9'
          WHEN ${notas.nota}::numeric >= 3.0 THEN '3.0-3.9'
          ELSE '1.0-2.9'
        END
      `,
      cantidad: count(notas.id).mapWith(Number),
    })
    .from(notas)
    .innerJoin(evaluaciones, eq(notas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(...conditions))
    .groupBy(sql`
      CASE
        WHEN ${notas.nota}::numeric >= 6.0 THEN '6.0-7.0'
        WHEN ${notas.nota}::numeric >= 5.0 THEN '5.0-5.9'
        WHEN ${notas.nota}::numeric >= 4.0 THEN '4.0-4.9'
        WHEN ${notas.nota}::numeric >= 3.0 THEN '3.0-3.9'
        ELSE '1.0-2.9'
      END
    `);
}

// ---- KPIs del dashboard admin ----

export async function obtenerKpisPeriodo(periodoId?: string) {
  const actorResult = await requireActionActor("reporte_kpis", ["admin"]);
  if (!actorResult.ok) return null;

  const db = getDb();

  const conditions = [isNull(asignaturas.eliminadoAt)];
  if (periodoId) conditions.push(eq(asignaturas.periodoId, periodoId));

  const [totalSecciones] = await db
    .select({ total: count() })
    .from(asignaturas)
    .where(and(...conditions));

  const [totalAlumnos] = await db
    .select({ total: count(matriculas.id) })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(and(isNull(matriculas.eliminadoAt), ...conditions));

  const [promedioNotas] = await db
    .select({ promedio: avg(notas.nota) })
    .from(notas)
    .innerJoin(evaluaciones, eq(notas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(isNull(notas.eliminadoAt), ...conditions));

  return {
    totalSecciones: totalSecciones?.total ?? 0,
    totalAlumnos: totalAlumnos?.total ?? 0,
    promedioNotas: promedioNotas?.promedio ? Number(promedioNotas.promedio).toFixed(1) : null,
  };
}

// ---- Lista de periodos para filtros ----

export async function listarPeriodosParaReportes() {
  const actorResult = await requireActionActor("listar_periodos_reportes", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({ id: periodosAcademicos.id, nombre: periodosAcademicos.nombre, estado: periodosAcademicos.estado })
    .from(periodosAcademicos)
    .orderBy(periodosAcademicos.fechaInicio);
}
