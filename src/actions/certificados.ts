"use server";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { certificados } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";

export async function listarCertificadosPorMatricula(
  matriculaId: string,
  pagination: PaginationInput = {},
  options?: { soloValidos?: boolean },
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  if (options?.soloValidos) {
    return db
      .select()
      .from(certificados)
      .where(and(eq(certificados.matriculaId, matriculaId), eq(certificados.valido, true)))
      .orderBy(desc(certificados.fechaEmision))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(certificados)
    .where(eq(certificados.matriculaId, matriculaId))
    .orderBy(desc(certificados.fechaEmision))
    .limit(limit)
    .offset(offset);
}
