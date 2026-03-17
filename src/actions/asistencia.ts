"use server";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { asistencia } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";

export async function listarAsistenciaPorClase(
  claseId: string,
  pagination: PaginationInput = {},
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  return db
    .select()
    .from(asistencia)
    .where(eq(asistencia.claseId, claseId))
    .orderBy(asc(asistencia.fechaRegistro), asc(asistencia.id))
    .limit(limit)
    .offset(offset);
}

export async function obtenerAsistenciaMatriculaEnClase(
  claseId: string,
  matriculaId: string,
) {
  const db = getDb();

  const [row] = await db
    .select()
    .from(asistencia)
    .where(and(eq(asistencia.claseId, claseId), eq(asistencia.matriculaId, matriculaId)))
    .limit(1);

  return row ?? null;
}
