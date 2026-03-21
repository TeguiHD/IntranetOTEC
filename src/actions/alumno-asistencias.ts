"use server";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, asistencia, clases, matriculas } from "@/db/schema";

import { requireActionActor } from "./_security";

export type AsistenciaAlumnoRow = {
  id: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
  observacion: string | null;
  fechaRegistro: Date | null;
  claseTitulo: string;
  claseFecha: string;
  numeroSesion: number;
  asignaturaNombre: string;
  asignaturaId: string;
};

export async function listarAsistenciasAlumno(): Promise<AsistenciaAlumnoRow[]> {
  const actorResult = await requireActionActor("alumno_asistencias_list", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const alumnoId = actorResult.actor.userId;

  const rows = await db
    .select({
      id: asistencia.id,
      estado: asistencia.estado,
      observacion: asistencia.observacion,
      fechaRegistro: asistencia.fechaRegistro,
      claseTitulo: clases.titulo,
      claseFecha: clases.fecha,
      numeroSesion: clases.numeroSesion,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(asistencia)
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(desc(clases.fecha), asc(clases.numeroSesion));

  return rows;
}
