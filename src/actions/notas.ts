"use server";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activo } from "@/db/filters";
import { notas } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";

export async function listarNotasPorMatricula(
  matriculaId: string,
  pagination: PaginationInput = {},
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  return db
    .select()
    .from(notas)
    .where(and(eq(notas.matriculaId, matriculaId), activo(notas)))
    .orderBy(asc(notas.fechaNota), asc(notas.id))
    .limit(limit)
    .offset(offset);
}
