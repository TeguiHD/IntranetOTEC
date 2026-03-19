"use server";

import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { activo } from "@/db/filters";
import {
  asignaturas,
  asistencia,
  clases,
  evaluaciones,
  matriculas,
  notas,
  notasDocente,
  solicitudesDocumentos,
} from "@/db/schema";

import { requireActionActor } from "./_security";

export type CursoAlumno = {
  matriculaId: string;
  asignaturaId: string;
  nombre: string;
  codigo: string | null;
  estado: string | null;
  docenteNombre: string | null;
  fechaInicio: string;
  estadoPago: string | null;
};

export type ProximaClase = {
  claseId: string;
  titulo: string;
  fecha: string;
  horaInicio: string | null;
  numeroSesion: number;
  asignaturaNombre: string;
  asignaturaId: string;
};

export type EvaluacionPendiente = {
  evaluacionId: string;
  titulo: string;
  tipo: string;
  fechaLimite: Date | null;
  fechaInicio: Date | null;
  asignaturaNombre: string;
  asignaturaId: string;
  tieneNota: boolean;
};

export type NotaReciente = {
  notaId: string;
  nota: string | null;
  evaluacionTitulo: string;
  evaluacionTipo: string;
  asignaturaNombre: string;
  fechaNota: Date | null;
};

export type NotaDocenteReciente = {
  id: string;
  nota: string;
  asignaturaNombre: string;
  fechaRegistro: string;
};

export type ResumenAlumno = {
  totalCursos: number;
  cursosActivos: number;
  asistenciaPromedio: number | null;
  notaPromedio: number | null;
  solicitudesPendientes: number;
};

export type AlumnoDashboardData = {
  resumen: ResumenAlumno;
  cursos: CursoAlumno[];
  proximasClases: ProximaClase[];
  evaluacionesPendientes: EvaluacionPendiente[];
  notasRecientes: NotaReciente[];
  notasDocenteRecientes: NotaDocenteReciente[];
};

export async function obtenerDashboardAlumno(): Promise<AlumnoDashboardData | null> {
  const actorResult = await requireActionActor("alumno_dashboard", ["alumno"]);

  if (!actorResult.ok) {
    return null;
  }

  const db = getDb();
  const alumnoId = actorResult.actor.userId;
  const hoy = new Date().toISOString().split("T")[0];

  // 1. Enrolled courses
  const cursos = await db
    .select({
      matriculaId: matriculas.id,
      asignaturaId: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
      fechaInicio: asignaturas.fechaInicio,
      estadoPago: matriculas.estadoPago,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        isNull(matriculas.eliminadoAt),
        eq(matriculas.activa, true),
      ),
    )
    .orderBy(desc(asignaturas.fechaInicio));

  const matriculaIds = cursos.map((c) => c.matriculaId);
  const asignaturaIds = cursos.map((c) => c.asignaturaId);

  // 2. Upcoming classes (next 10, from today onwards)
  const proximasClases =
    asignaturaIds.length > 0
      ? await db
          .select({
            claseId: clases.id,
            titulo: clases.titulo,
            fecha: clases.fecha,
            horaInicio: clases.horaInicio,
            numeroSesion: clases.numeroSesion,
            asignaturaNombre: asignaturas.nombre,
            asignaturaId: asignaturas.id,
          })
          .from(clases)
          .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
          .where(
            and(
              sql`${clases.asignaturaId} IN (${sql.join(asignaturaIds.map((id) => sql`${id}`), sql`, `)})`,
              gte(clases.fecha, hoy),
              eq(clases.publicada, true),
              activo(clases),
            ),
          )
          .orderBy(asc(clases.fecha), asc(clases.horaInicio))
          .limit(10)
      : [];

  // 3. Pending evaluations (published, with deadline >= today, no grade yet)
  const evaluacionesPendientes =
    asignaturaIds.length > 0
      ? await db
          .select({
            evaluacionId: evaluaciones.id,
            titulo: evaluaciones.titulo,
            tipo: evaluaciones.tipo,
            fechaLimite: evaluaciones.fechaLimite,
            fechaInicio: evaluaciones.fechaInicio,
            asignaturaNombre: asignaturas.nombre,
            asignaturaId: asignaturas.id,
          })
          .from(evaluaciones)
          .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
          .where(
            and(
              sql`${evaluaciones.asignaturaId} IN (${sql.join(asignaturaIds.map((id) => sql`${id}`), sql`, `)})`,
              eq(evaluaciones.publicada, true),
              activo(evaluaciones),
            ),
          )
          .orderBy(asc(evaluaciones.fechaLimite))
          .limit(20)
      : [];

  // Check which evaluations already have a grade
  const notasExistentes =
    matriculaIds.length > 0
      ? await db
          .select({
            evaluacionId: notas.evaluacionId,
          })
          .from(notas)
          .where(
            and(
              sql`${notas.matriculaId} IN (${sql.join(matriculaIds.map((id) => sql`${id}`), sql`, `)})`,
              activo(notas),
            ),
          )
      : [];

  const notasSet = new Set(notasExistentes.map((n) => n.evaluacionId));

  const evalConEstado: EvaluacionPendiente[] = evaluacionesPendientes.map((e) => ({
    ...e,
    tieneNota: notasSet.has(e.evaluacionId),
  }));

  // 4. Recent grades (system evaluaciones)
  const notasRecientes =
    matriculaIds.length > 0
      ? await db
          .select({
            notaId: notas.id,
            nota: notas.nota,
            evaluacionTitulo: evaluaciones.titulo,
            evaluacionTipo: evaluaciones.tipo,
            asignaturaNombre: asignaturas.nombre,
            fechaNota: notas.fechaNota,
          })
          .from(notas)
          .innerJoin(evaluaciones, eq(notas.evaluacionId, evaluaciones.id))
          .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
          .where(
            and(
              sql`${notas.matriculaId} IN (${sql.join(matriculaIds.map((id) => sql`${id}`), sql`, `)})`,
              activo(notas),
            ),
          )
          .orderBy(desc(notas.fechaNota))
          .limit(10)
      : [];

  // 5. Recent teacher-recorded grades
  const notasDocenteRecientes =
    matriculaIds.length > 0
      ? await db
          .select({
            id: notasDocente.id,
            nota: notasDocente.nota,
            asignaturaNombre: asignaturas.nombre,
            fechaRegistro: notasDocente.fechaRegistro,
          })
          .from(notasDocente)
          .innerJoin(asignaturas, eq(notasDocente.asignaturaId, asignaturas.id))
          .where(
            sql`${notasDocente.matriculaId} IN (${sql.join(matriculaIds.map((id) => sql`${id}`), sql`, `)})`,
          )
          .orderBy(desc(notasDocente.fechaRegistro))
          .limit(10)
      : [];

  // 6. Attendance average
  let asistenciaPromedio: number | null = null;

  if (matriculaIds.length > 0) {
    const [asistStats] = await db
      .select({
        total: sql<number>`count(*)`,
        presente: sql<number>`count(*) filter (where ${asistencia.estado} = 'presente')`,
      })
      .from(asistencia)
      .where(
        sql`${asistencia.matriculaId} IN (${sql.join(matriculaIds.map((id) => sql`${id}`), sql`, `)})`,
      );

    if (asistStats && Number(asistStats.total) > 0) {
      asistenciaPromedio = Math.round(
        (Number(asistStats.presente) / Number(asistStats.total)) * 100,
      );
    }
  }

  // 7. Grade average
  let notaPromedio: number | null = null;

  // Combine system grades + docente grades
  const allGrades: number[] = [];

  for (const n of notasRecientes) {
    if (n.nota) allGrades.push(Number(n.nota));
  }
  for (const n of notasDocenteRecientes) {
    if (n.nota) allGrades.push(Number(n.nota));
  }

  if (allGrades.length > 0) {
    notaPromedio =
      Math.round((allGrades.reduce((a, b) => a + b, 0) / allGrades.length) * 10) / 10;
  }

  // 8. Pending document requests
  const [solPendientes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(solicitudesDocumentos)
    .where(
      and(
        eq(solicitudesDocumentos.alumnoId, alumnoId),
        eq(solicitudesDocumentos.estado, "pendiente"),
      ),
    );

  return {
    resumen: {
      totalCursos: cursos.length,
      cursosActivos: cursos.filter((c) => c.estado === "activo").length,
      asistenciaPromedio,
      notaPromedio,
      solicitudesPendientes: Number(solPendientes?.count ?? 0),
    },
    cursos: cursos.map((c) => ({
      ...c,
      docenteNombre: null, // simplified
    })),
    proximasClases,
    evaluacionesPendientes: evalConEstado,
    notasRecientes,
    notasDocenteRecientes,
  };
}
