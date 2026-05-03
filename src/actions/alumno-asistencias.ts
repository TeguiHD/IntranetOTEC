"use server";

import { and, asc, desc, eq, isNull, inArray } from "drizzle-orm";

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

export type TarjetaAsistenciaAlumno = {
  asignaturaId: string;
  asignaturaNombre: string;
  matriculaId: string;
  sesiones: {
    claseId: string;
    numeroSesion: number;
    titulo: string;
    fecha: string;
    estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
  }[];
};

export async function listarTarjetasAsistenciaAlumno(): Promise<TarjetaAsistenciaAlumno[]> {
  const actorResult = await requireActionActor("alumno_asistencia_tarjetas", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const alumnoId = actorResult.actor.userId;

  const matriculasRows = await db
    .select({
      matriculaId: matriculas.id,
      asignaturaId: matriculas.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(asc(asignaturas.nombre));

  if (matriculasRows.length === 0) return [];

  const asignaturaIds = matriculasRows.map((row) => row.asignaturaId);
  const clasesRows = await db
    .select({
      claseId: clases.id,
      asignaturaId: clases.asignaturaId,
      numeroSesion: clases.numeroSesion,
      titulo: clases.titulo,
      fecha: clases.fecha,
    })
    .from(clases)
    .where(and(inArray(clases.asignaturaId, asignaturaIds), isNull(clases.eliminadoAt)))
    .orderBy(asc(clases.numeroSesion), asc(clases.fecha));

  const claseIds = clasesRows.map((row) => row.claseId);
  const asistenciaRows = claseIds.length > 0
    ? await db
        .select({
          claseId: asistencia.claseId,
          matriculaId: asistencia.matriculaId,
          estado: asistencia.estado,
        })
        .from(asistencia)
        .where(inArray(asistencia.claseId, claseIds))
    : [];

  const asistenciaMap = new Map<string, "presente" | "ausente" | "tardanza" | "justificado" | null>();
  for (const row of asistenciaRows) {
    asistenciaMap.set(`${row.claseId}::${row.matriculaId}`, row.estado);
  }

  return matriculasRows.map((matricula) => ({
    ...matricula,
    sesiones: clasesRows
      .filter((clase) => clase.asignaturaId === matricula.asignaturaId)
      .slice(0, 8)
      .map((clase) => ({
        claseId: clase.claseId,
        numeroSesion: clase.numeroSesion,
        titulo: clase.titulo,
        fecha: clase.fecha,
        estado: asistenciaMap.get(`${clase.claseId}::${matricula.matriculaId}`) ?? null,
      })),
  }));
}
