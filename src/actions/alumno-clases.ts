"use server";

import { and, asc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, clases, matriculas } from "@/db/schema";

import { requireActionActor } from "./_security";

export type ClaseAlumno = {
  claseId: string;
  titulo: string;
  descripcion: string | null;
  numeroSesion: number;
  fecha: string;
  horaInicio: string | null;
  publicada: boolean | null;
};

export type AsignaturaConClases = {
  asignaturaId: string;
  asignaturaNombre: string;
  asignaturaDescripcion: string | null;
  asignaturaCodigo: string | null;
  clases: ClaseAlumno[];
};

export async function listarClasesPorAlumno(): Promise<AsignaturaConClases[]> {
  const actorResult = await requireActionActor("alumno_clases_list", ["alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const alumnoId = actorResult.actor.userId;

  // Get enrolled asignaturas
  const enrolled = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      asignaturaDescripcion: asignaturas.descripcion,
      asignaturaCodigo: asignaturas.codigo,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        isNull(matriculas.eliminadoAt),
        eq(matriculas.activa, true),
      ),
    );

  if (enrolled.length === 0) {
    return [];
  }

  // Get classes for all enrolled asignaturas
  const result: AsignaturaConClases[] = [];

  for (const asig of enrolled) {
    const clasesData = await db
      .select({
        claseId: clases.id,
        titulo: clases.titulo,
        descripcion: clases.descripcion,
        numeroSesion: clases.numeroSesion,
        fecha: clases.fecha,
        horaInicio: clases.horaInicio,
        publicada: clases.publicada,
      })
      .from(clases)
      .where(
        and(
          eq(clases.asignaturaId, asig.asignaturaId),
          eq(clases.publicada, true),
          isNull(clases.eliminadoAt),
        ),
      )
      .orderBy(asc(clases.numeroSesion));

    result.push({
      ...asig,
      clases: clasesData,
    });
  }

  return result;
}
