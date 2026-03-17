"use server";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { activo } from "@/db/filters";
import { finanzas } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";

export async function listarFinanzas(
  pagination: PaginationInput = {},
  options?: { tipo?: "ingreso" | "gasto" },
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  if (!options?.tipo) {
    return db
      .select()
      .from(finanzas)
      .where(activo(finanzas))
      .orderBy(desc(finanzas.fecha), desc(finanzas.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(finanzas)
    .where(and(eq(finanzas.tipo, options.tipo), activo(finanzas)))
    .orderBy(desc(finanzas.fecha), desc(finanzas.createdAt))
    .limit(limit)
    .offset(offset);
}
