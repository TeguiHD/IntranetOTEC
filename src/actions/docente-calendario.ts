"use server";

import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  material,
  matriculas,
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
  const actorResult = await requireActionActor("docente_clase_detalle", ["docente"]);
  if (!actorResult.ok) return null;

  const db = getDb();

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
