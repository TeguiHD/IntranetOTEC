"use server";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, matriculas, notasDocente, usuarios } from "@/db/schema";

import { requireActionActor } from "./_security";

export type NotaAdminRow = {
  id: string;
  nota: string;
  fechaRegistro: string;
  anioRegistro: number;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  asignaturaNombre: string;
  asignaturaId: string;
  docenteNombre: string;
  docenteApellido: string;
};

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

export async function listarNotasAdmin(options?: { q?: string; asignaturaId?: string }): Promise<NotaAdminRow[]> {
  const actorResult = await requireActionActor("admin_notas_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const docenteAlias = db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
    })
    .from(usuarios)
    .as("docente");

  const baseQuery = db
    .select({
      id: notasDocente.id,
      nota: notasDocente.nota,
      fechaRegistro: notasDocente.fechaRegistro,
      anioRegistro: notasDocente.anioRegistro,
      asignaturaId: notasDocente.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      docenteNombre: docenteAlias.nombre,
      docenteApellido: docenteAlias.apellido,
    })
    .from(notasDocente)
    .innerJoin(matriculas, eq(notasDocente.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .innerJoin(asignaturas, eq(notasDocente.asignaturaId, asignaturas.id))
    .innerJoin(docenteAlias, eq(notasDocente.docenteId, docenteAlias.id));

  const conditions = [];

  if (options?.asignaturaId) {
    conditions.push(eq(notasDocente.asignaturaId, options.asignaturaId));
  }

  if (options?.q) {
    const term = `%${escapeLike(options.q)}%`;
    conditions.push(
      or(
        ilike(usuarios.nombre, term),
        ilike(usuarios.apellido, term),
        ilike(usuarios.rut, term),
      )!,
    );
  }

  const query = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;

  return query.orderBy(desc(notasDocente.fechaRegistro), asc(usuarios.apellido));
}
