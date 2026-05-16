"use server";

import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, clases, cursos, matriculas, periodosAcademicos, usuarios } from "@/db/schema";

import { requireActionActor } from "./_security";

export type DocenteFicha = {
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
  email: string | null;
  activo: boolean | null;
  eliminadoAt: Date | null;
  createdAt: Date | null;
};

export type AsignaturaHistorialRow = {
  asignaturaId: string;
  asignaturaNombre: string;
  asignaturaCodigo: string | null;
  turno: string | null;
  estado: string | null;
  fechaInicio: string;
  fechaFin: string | null;
  cursoNombre: string;
  cursoCodigo: string | null;
  periodoCodigo: string;
  periodoNombre: string;
  periodoEliminado: boolean;
  asignaturaEliminada: boolean;
  totalMatriculas: number;
  totalClases: number;
};

export type DocenteHistorialPayload = {
  docente: DocenteFicha;
  asignaturas: AsignaturaHistorialRow[];
  totales: {
    secciones: number;
    seccionesActivas: number;
    matriculasHistoricas: number;
    clasesHistoricas: number;
    periodosImpartidos: number;
    cursosImpartidos: number;
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function obtenerHistorialDocenteAdmin(
  docenteId: string,
): Promise<DocenteHistorialPayload | null> {
  const actorResult = await requireActionActor("admin_docente_historial", ["admin"]);
  if (!actorResult.ok || !UUID_REGEX.test(docenteId)) return null;

  const db = getDb();

  const [docente] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
      email: usuarios.email,
      activo: usuarios.activo,
      eliminadoAt: usuarios.eliminadoAt,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(and(eq(usuarios.id, docenteId), eq(usuarios.rol, "docente")))
    .limit(1);

  if (!docente) return null;

  const rows = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      asignaturaCodigo: asignaturas.codigo,
      turno: asignaturas.turno,
      estado: asignaturas.estado,
      fechaInicio: asignaturas.fechaInicio,
      fechaFin: asignaturas.fechaFin,
      asignaturaEliminadoAt: asignaturas.eliminadoAt,
      cursoNombre: cursos.nombre,
      cursoCodigo: cursos.codigo,
      periodoCodigo: periodosAcademicos.codigo,
      periodoNombre: periodosAcademicos.nombre,
      periodoEliminadoAt: periodosAcademicos.eliminadoAt,
      totalMatriculas: sql<number>`(
        SELECT COUNT(*) FROM ${matriculas} m
        WHERE m.asignatura_id = ${asignaturas.id}
        AND m.eliminado_at IS NULL
      )`,
      totalClases: sql<number>`(
        SELECT COUNT(*) FROM ${clases} c
        WHERE c.asignatura_id = ${asignaturas.id}
        AND c.eliminado_at IS NULL
      )`,
    })
    .from(asignaturas)
    .innerJoin(cursos, eq(cursos.id, asignaturas.cursoId))
    .innerJoin(periodosAcademicos, eq(periodosAcademicos.id, asignaturas.periodoId))
    .where(eq(asignaturas.docenteId, docenteId))
    .orderBy(desc(periodosAcademicos.fechaInicio), asignaturas.nombre);

  const lista: AsignaturaHistorialRow[] = rows.map((r) => ({
    asignaturaId: r.asignaturaId,
    asignaturaNombre: r.asignaturaNombre,
    asignaturaCodigo: r.asignaturaCodigo ?? null,
    turno: r.turno,
    estado: r.estado,
    fechaInicio: r.fechaInicio,
    fechaFin: r.fechaFin,
    cursoNombre: r.cursoNombre,
    cursoCodigo: r.cursoCodigo ?? null,
    periodoCodigo: r.periodoCodigo,
    periodoNombre: r.periodoNombre,
    periodoEliminado: r.periodoEliminadoAt !== null,
    asignaturaEliminada: r.asignaturaEliminadoAt !== null,
    totalMatriculas: Number(r.totalMatriculas ?? 0),
    totalClases: Number(r.totalClases ?? 0),
  }));

  const seccionesActivas = lista.filter((a) => !a.asignaturaEliminada && !a.periodoEliminado).length;
  const periodosUnicos = new Set(lista.map((a) => a.periodoCodigo)).size;
  const cursosUnicos = new Set(lista.map((a) => a.cursoNombre)).size;
  const matriculasHistoricas = lista.reduce((acc, a) => acc + a.totalMatriculas, 0);
  const clasesHistoricas = lista.reduce((acc, a) => acc + a.totalClases, 0);

  return {
    docente,
    asignaturas: lista,
    totales: {
      secciones: lista.length,
      seccionesActivas,
      matriculasHistoricas,
      clasesHistoricas,
      periodosImpartidos: periodosUnicos,
      cursosImpartidos: cursosUnicos,
    },
  };
}
