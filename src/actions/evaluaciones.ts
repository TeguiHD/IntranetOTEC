"use server";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activo } from "@/db/filters";
import { evaluaciones } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";

export async function listarEvaluacionesPorAsignatura(
  asignaturaId: string,
  pagination: PaginationInput = {},
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  return db
    .select()
    .from(evaluaciones)
    .where(and(eq(evaluaciones.asignaturaId, asignaturaId), activo(evaluaciones)))
    .orderBy(asc(evaluaciones.fechaLimite), asc(evaluaciones.createdAt))
    .limit(limit)
    .offset(offset);
}
