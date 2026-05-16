"use server";

import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  certificados,
  clases,
  cursos,
  matriculas,
  notasDocente,
  periodosAcademicos,
  usuarios,
} from "@/db/schema";

import { requireActionActor } from "./_security";

export type AlumnoFicha = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  activo: boolean | null;
  eliminadoAt: Date | null;
  createdAt: Date | null;
};

export type MatriculaHistorialRow = {
  matriculaId: string;
  asignaturaId: string;
  asignaturaNombre: string;
  asignaturaCodigo: string | null;
  turno: string | null;
  estadoAsignatura: string | null;
  cursoNombre: string;
  cursoCodigo: string | null;
  periodoCodigo: string;
  periodoNombre: string;
  periodoEliminado: boolean;
  asignaturaEliminada: boolean;
  matriculaActiva: boolean | null;
  estadoPago: string | null;
  fechaInscripcion: Date | null;
  docenteNombre: string | null;
  asistenciaPct: number | null;
  promedioNotas: number | null;
  totalCertificados: number;
};

export type AlumnoHistorialPayload = {
  alumno: AlumnoFicha;
  matriculas: MatriculaHistorialRow[];
  totales: {
    matriculas: number;
    matriculasActivas: number;
    cursosDistintos: number;
    periodosDistintos: number;
    certificados: number;
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function obtenerHistorialAlumnoAdmin(
  alumnoId: string,
): Promise<AlumnoHistorialPayload | null> {
  const actor = await requireActionActor("admin_alumno_historial", ["admin"]);
  if (!actor.ok || !UUID_REGEX.test(alumnoId)) return null;

  const db = getDb();

  const [alumno] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
      email: usuarios.email,
      activo: usuarios.activo,
      eliminadoAt: usuarios.eliminadoAt,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(and(eq(usuarios.id, alumnoId), eq(usuarios.rol, "alumno")))
    .limit(1);

  if (!alumno) return null;

  const rows = await db
    .select({
      matriculaId: matriculas.id,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      asignaturaCodigo: asignaturas.codigo,
      turno: asignaturas.turno,
      estadoAsignatura: asignaturas.estado,
      asignaturaEliminadoAt: asignaturas.eliminadoAt,
      cursoNombre: cursos.nombre,
      cursoCodigo: cursos.codigo,
      periodoCodigo: periodosAcademicos.codigo,
      periodoNombre: periodosAcademicos.nombre,
      periodoEliminadoAt: periodosAcademicos.eliminadoAt,
      matriculaActiva: matriculas.activa,
      estadoPago: matriculas.estadoPago,
      fechaInscripcion: matriculas.createdAt,
      docenteNombre: sql<string | null>`
        CASE WHEN ${asignaturas.docenteId} IS NOT NULL
          THEN (SELECT u.nombre || ' ' || u.apellido FROM ${usuarios} u WHERE u.id = ${asignaturas.docenteId})
          ELSE NULL END`,
      totalClasesAsignatura: sql<number>`(
        SELECT COUNT(*) FROM ${clases} c
        WHERE c.asignatura_id = ${asignaturas.id} AND c.eliminado_at IS NULL
      )`,
      totalAsistencias: sql<number>`(
        SELECT COUNT(*) FROM ${asistencia} a
        INNER JOIN ${clases} c ON c.id = a.clase_id
        WHERE a.matricula_id = ${matriculas.id}
          AND a.estado IN ('presente','tardanza','justificado')
          AND c.eliminado_at IS NULL
      )`,
      totalAsistenciaRegistros: sql<number>`(
        SELECT COUNT(*) FROM ${asistencia} a
        INNER JOIN ${clases} c ON c.id = a.clase_id
        WHERE a.matricula_id = ${matriculas.id}
          AND c.eliminado_at IS NULL
      )`,
      promedioNotas: sql<number | null>`(
        SELECT AVG(n.nota::numeric)::float FROM ${notasDocente} n
        WHERE n.matricula_id = ${matriculas.id}
      )`,
      totalCertificados: sql<number>`(
        SELECT COUNT(*) FROM ${certificados} c
        WHERE c.matricula_id = ${matriculas.id} AND c.valido = true
      )`,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(asignaturas.id, matriculas.asignaturaId))
    .innerJoin(cursos, eq(cursos.id, asignaturas.cursoId))
    .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, asignaturas.periodoId))
    .where(eq(matriculas.alumnoId, alumnoId))
    .orderBy(desc(periodosAcademicos.fechaInicio), asignaturas.nombre);

  const lista: MatriculaHistorialRow[] = rows.map((r) => {
    const reg = Number(r.totalAsistenciaRegistros ?? 0);
    const pres = Number(r.totalAsistencias ?? 0);
    const pct = reg > 0 ? Math.round((pres / reg) * 100) : null;
    return {
      matriculaId: r.matriculaId,
      asignaturaId: r.asignaturaId,
      asignaturaNombre: r.asignaturaNombre,
      asignaturaCodigo: r.asignaturaCodigo ?? null,
      turno: r.turno,
      estadoAsignatura: r.estadoAsignatura,
      cursoNombre: r.cursoNombre,
      cursoCodigo: r.cursoCodigo ?? null,
      periodoCodigo: r.periodoCodigo,
      periodoNombre: r.periodoNombre,
      periodoEliminado: r.periodoEliminadoAt !== null,
      asignaturaEliminada: r.asignaturaEliminadoAt !== null,
      matriculaActiva: r.matriculaActiva,
      estadoPago: r.estadoPago,
      fechaInscripcion: r.fechaInscripcion,
      docenteNombre: r.docenteNombre,
      asistenciaPct: pct,
      promedioNotas: r.promedioNotas,
      totalCertificados: Number(r.totalCertificados ?? 0),
    };
  });

  const activas = lista.filter((m) => m.matriculaActiva).length;
  const cursosDistintos = new Set(lista.map((m) => m.cursoNombre)).size;
  const periodosDistintos = new Set(lista.map((m) => m.periodoCodigo)).size;
  const totalCerts = lista.reduce((acc, m) => acc + m.totalCertificados, 0);

  return {
    alumno,
    matriculas: lista,
    totales: {
      matriculas: lista.length,
      matriculasActivas: activas,
      cursosDistintos,
      periodosDistintos,
      certificados: totalCerts,
    },
  };
}
