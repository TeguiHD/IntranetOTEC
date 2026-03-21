"use server";

import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, asistencia, clases, matriculas, usuarios } from "@/db/schema";

import { requireActionActor } from "./_security";

export type AsistenciaAdminRow = {
  id: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
  observacion: string | null;
  fechaRegistro: Date | null;
  claseId: string;
  claseTitulo: string;
  claseFecha: string;
  numeroSesion: number;
  asignaturaNombre: string;
  asignaturaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
};

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

export async function listarAsistenciasAdmin(options?: { q?: string; asignaturaId?: string }): Promise<AsistenciaAdminRow[]> {
  const actorResult = await requireActionActor("admin_asistencias_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const baseQuery = db
    .select({
      id: asistencia.id,
      estado: asistencia.estado,
      observacion: asistencia.observacion,
      fechaRegistro: asistencia.fechaRegistro,
      claseId: clases.id,
      claseTitulo: clases.titulo,
      claseFecha: clases.fecha,
      numeroSesion: clases.numeroSesion,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(asistencia)
    .innerJoin(clases, eq(asistencia.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .innerJoin(matriculas, eq(asistencia.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id));

  const conditions = [];

  if (options?.asignaturaId) {
    conditions.push(eq(asignaturas.id, options.asignaturaId));
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

  return query.orderBy(desc(clases.fecha), asc(clases.numeroSesion), asc(usuarios.apellido));
}
