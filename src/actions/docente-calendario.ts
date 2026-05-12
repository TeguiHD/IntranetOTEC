"use server";

import { and, count, eq, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  evaluaciones,
  material,
  matriculas,
  notas,
  usuarios,
} from "@/db/schema";
import { requireActionActor } from "./_security";

export type ClaseDia = {
  id: string;
  titulo: string;
  numeroSesion: number;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
  alumnos: {
    matriculaId: string;
    alumnoNombre: string;
    alumnoApellido: string;
    alumnoRut: string | null;
    estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
  }[];
  materiales: {
    id: string;
    nombre: string;
    tamanioBytes: number | null;
  }[];
};

export async function listarClasePorAsignaturaYFecha(
  asignaturaId: string,
  fecha: string,
): Promise<ClaseDia | null> {
  const actorResult = await requireActionActor("asignaturas.docente", ["docente"]);
  if (!actorResult.ok) return null;

  const db = getDb();

  const [owned] = await db
    .select({ id: asignaturas.id })
    .from(asignaturas)
    .where(and(eq(asignaturas.id, asignaturaId), eq(asignaturas.docenteId, actorResult.actor.userId)))
    .limit(1);

  if (!owned) return null;

  const [clase] = await db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      numeroSesion: clases.numeroSesion,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      sala: clases.sala,
    })
    .from(clases)
    .where(
      and(
        eq(clases.asignaturaId, asignaturaId),
        eq(clases.fecha, fecha),
        isNull(clases.eliminadoAt),
      ),
    )
    .limit(1);

  if (!clase) return null;

  const [alumnosRows, materialesRows] = await Promise.all([
    db
      .select({
        matriculaId: matriculas.id,
        alumnoNombre: usuarios.nombre,
        alumnoApellido: usuarios.apellido,
        alumnoRut: usuarios.rut,
        estado: asistencia.estado,
      })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .leftJoin(
        asistencia,
        and(
          eq(asistencia.matriculaId, matriculas.id),
          eq(asistencia.claseId, clase.id),
        ),
      )
      .where(
        and(eq(matriculas.asignaturaId, asignaturaId), isNull(matriculas.eliminadoAt)),
      )
      .orderBy(usuarios.apellido, usuarios.nombre),
    db
      .select({
        id: material.id,
        nombre: material.nombre,
        tamanioBytes: material.tamanioBytes,
      })
      .from(material)
      .where(
        and(
          eq(material.claseId, clase.id),
          isNull(material.eliminadoAt),
          eq(material.habilitado, true),
        ),
      ),
  ]);

  return {
    ...clase,
    horaInicio: clase.horaInicio ? String(clase.horaInicio).slice(0, 5) : null,
    horaFin: clase.horaFin ? String(clase.horaFin).slice(0, 5) : null,
    alumnos: alumnosRows.map((a) => ({
      ...a,
      estado: (a.estado as ClaseDia["alumnos"][number]["estado"]) ?? null,
    })),
    materiales: materialesRows,
  };
}

// ---- Resumen de alumnos por asignatura (para el panel docente) ----

export type ResumenAsignatura = {
  asignaturaId: string;
  asignaturaNombre: string;
  totalClases: number;
  alumnos: {
    matriculaId: string;
    nombre: string;
    apellido: string;
    rut: string | null;
    presentes: number;
    ausentes: number;
    tardanzas: number;
    pctAsistencia: number | null;
    notaPromedio: number | null;
  }[];
};

export async function listarResumenAsignaturasDocente(): Promise<ResumenAsignatura[]> {
  const actorResult = await requireActionActor("asignaturas.docente", ["docente"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const asigs = await db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre })
    .from(asignaturas)
    .where(
      and(
        eq(asignaturas.docenteId, actorResult.actor.userId),
        isNull(asignaturas.eliminadoAt),
      ),
    )
    .orderBy(asignaturas.nombre);

  if (asigs.length === 0) return [];

  return Promise.all(
    asigs.map(async (asig) => {
      const [{ totalClases }] = await db
        .select({ totalClases: count(clases.id) })
        .from(clases)
        .where(and(eq(clases.asignaturaId, asig.id), isNull(clases.eliminadoAt)));

      const mats = await db
        .select({
          matriculaId: matriculas.id,
          nombre: usuarios.nombre,
          apellido: usuarios.apellido,
          rut: usuarios.rut,
          presentes: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'presente' THEN 1 END)::int`,
          ausentes: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'ausente' THEN 1 END)::int`,
          tardanzas: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'tardanza' THEN 1 END)::int`,
        })
        .from(matriculas)
        .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
        .leftJoin(asistencia, eq(asistencia.matriculaId, matriculas.id))
        .where(and(eq(matriculas.asignaturaId, asig.id), isNull(matriculas.eliminadoAt)))
        .groupBy(matriculas.id, usuarios.nombre, usuarios.apellido, usuarios.rut)
        .orderBy(usuarios.apellido, usuarios.nombre);

      // Notas promedio por matrícula (desde evaluaciones de esta asignatura)
      const notasRows = await db
        .select({
          matriculaId: notas.matriculaId,
          promedio: sql<number>`ROUND(AVG(${notas.nota}), 1)::float`,
        })
        .from(notas)
        .innerJoin(evaluaciones, eq(notas.evaluacionId, evaluaciones.id))
        .where(
          and(
            eq(evaluaciones.asignaturaId, asig.id),
            isNull(notas.eliminadoAt),
          ),
        )
        .groupBy(notas.matriculaId);

      const notasMap = new Map(notasRows.map((n) => [n.matriculaId, n.promedio]));

      return {
        asignaturaId: asig.id,
        asignaturaNombre: asig.nombre,
        totalClases: totalClases ?? 0,
        alumnos: mats.map((m) => {
          const total = m.presentes + m.ausentes + m.tardanzas;
          return {
            matriculaId: m.matriculaId,
            nombre: m.nombre,
            apellido: m.apellido,
            rut: m.rut,
            presentes: m.presentes,
            ausentes: m.ausentes,
            tardanzas: m.tardanzas,
            pctAsistencia: total > 0 ? Math.round(((m.presentes + m.tardanzas) / total) * 100) : null,
            notaPromedio: notasMap.get(m.matriculaId) ?? null,
          };
        }),
      };
    }),
  );
}
