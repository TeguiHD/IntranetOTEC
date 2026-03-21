"use server";

import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, matriculas, notasDocente } from "@/db/schema";

import { requireActionActor } from "./_security";

export type NotaAlumnoRow = {
  id: string;
  nota: string;
  fechaRegistro: string;
  anioRegistro: number;
  asignaturaNombre: string;
  asignaturaId: string;
};

export async function listarNotasAlumno(): Promise<NotaAlumnoRow[]> {
  const actorResult = await requireActionActor("alumno_notas_list", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const alumnoId = actorResult.actor.userId;

  // Get notas through matriculas belonging to this student only
  const rows = await db
    .select({
      id: notasDocente.id,
      nota: notasDocente.nota,
      fechaRegistro: notasDocente.fechaRegistro,
      anioRegistro: notasDocente.anioRegistro,
      asignaturaId: notasDocente.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(notasDocente)
    .innerJoin(matriculas, eq(notasDocente.matriculaId, matriculas.id))
    .innerJoin(asignaturas, eq(notasDocente.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(desc(notasDocente.fechaRegistro));

  return rows;
}
