"use server";

import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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
import { normalizarTextoVisible } from "@/lib/displayText";
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

// ---- Crear clase desde el panel docente ----

export type CrearClaseResult =
  | { ok: true; claseId: string }
  | { ok: false; code: string; message: string };

export async function crearClaseDocente(input: {
  asignaturaId: string;
  fecha: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  sala?: string | null;
}): Promise<CrearClaseResult> {
  const actorResult = await requireActionActor("asignaturas.docente", ["docente"]);
  if (!actorResult.ok) return { ok: false, code: "unauthorized", message: "No autorizado." };

  const db = getDb();

  const [owned] = await db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre })
    .from(asignaturas)
    .where(
      and(
        eq(asignaturas.id, input.asignaturaId),
        eq(asignaturas.docenteId, actorResult.actor.userId),
        isNull(asignaturas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!owned) return { ok: false, code: "not_found", message: "Asignatura no encontrada." };

  // Verificar que no existe clase para esa fecha
  const [existing] = await db
    .select({ id: clases.id })
    .from(clases)
    .where(
      and(
        eq(clases.asignaturaId, input.asignaturaId),
        eq(clases.fecha, input.fecha),
        isNull(clases.eliminadoAt),
      ),
    )
    .limit(1);

  if (existing) return { ok: false, code: "already_exists", message: "Ya existe una clase para esta fecha." };

  // Calcular número de sesión
  const [{ total }] = await db
    .select({ total: count(clases.id) })
    .from(clases)
    .where(and(eq(clases.asignaturaId, input.asignaturaId), isNull(clases.eliminadoAt)));

  const numeroSesion = (total ?? 0) + 1;
  const titulo = `Sesión ${numeroSesion} — ${normalizarTextoVisible(owned.nombre)}`;

  const [inserted] = await db
    .insert(clases)
    .values({
      asignaturaId: input.asignaturaId,
      titulo,
      numeroSesion,
      fecha: input.fecha,
      horaInicio: input.horaInicio ?? null,
      horaFin: input.horaFin ?? null,
      sala: input.sala ?? null,
      publicada: true,
    })
    .returning({ id: clases.id });

  revalidatePath("/docente/asignaturas");
  revalidatePath("/docente/horario");

  return { ok: true, claseId: inserted!.id };
}

// ---- Historial de clases por asignatura (para /docente/horario) ----

export type ClaseHistorial = {
  id: string;
  titulo: string;
  fecha: string;
  numeroSesion: number;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
  totalAlumnos: number;
  presentes: number;
  ausentes: number;
  tardanzas: number;
  pctAsistencia: number | null;
};

export type AsignaturaHistorial = {
  asignaturaId: string;
  asignaturaNombre: string;
  totalClases: number;
  clases: ClaseHistorial[];
};

export async function listarHistorialClasesDocente(): Promise<AsignaturaHistorial[]> {
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

  const asigIds = asigs.map((a) => a.id);

  const clasesRows = await db
    .select({
      id: clases.id,
      asignaturaId: clases.asignaturaId,
      titulo: clases.titulo,
      fecha: clases.fecha,
      numeroSesion: clases.numeroSesion,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      sala: clases.sala,
    })
    .from(clases)
    .where(
      and(
        inArray(clases.asignaturaId, asigIds),
        isNull(clases.eliminadoAt),
        eq(clases.publicada, true),
      ),
    )
    .orderBy(desc(clases.fecha), desc(clases.numeroSesion));

  if (clasesRows.length === 0) {
    return asigs.map((a) => ({
      asignaturaId: a.id,
      asignaturaNombre: a.nombre,
      totalClases: 0,
      clases: [],
    }));
  }

  const claseIds = clasesRows.map((c) => c.id);

  // Contar alumnos matriculados por asignatura
  const matriculasCounts = await db
    .select({
      asignaturaId: matriculas.asignaturaId,
      total: count(matriculas.id),
    })
    .from(matriculas)
    .where(
      and(
        inArray(matriculas.asignaturaId, asigIds),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .groupBy(matriculas.asignaturaId);

  const alumnosPorAsig = new Map(matriculasCounts.map((m) => [m.asignaturaId, m.total ?? 0]));

  // Estadísticas de asistencia por clase
  const asistStats = await db
    .select({
      claseId: asistencia.claseId,
      presentes: sql<number>`COUNT(CASE WHEN ${asistencia.estado} IN ('presente','tardanza') THEN 1 END)::int`,
      ausentes: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'ausente' THEN 1 END)::int`,
      tardanzas: sql<number>`COUNT(CASE WHEN ${asistencia.estado} = 'tardanza' THEN 1 END)::int`,
      registrados: sql<number>`COUNT(*)::int`,
    })
    .from(asistencia)
    .where(inArray(asistencia.claseId, claseIds))
    .groupBy(asistencia.claseId);

  const statsPorClase = new Map(asistStats.map((s) => [s.claseId, s]));

  const clasesMap = new Map<string, ClaseHistorial[]>();
  for (const c of clasesRows) {
    const stats = statsPorClase.get(c.id);
    const totalAlumnos = alumnosPorAsig.get(c.asignaturaId) ?? 0;
    const presentes = stats?.presentes ?? 0;
    const ausentes = stats?.ausentes ?? 0;
    const tardanzas = stats?.tardanzas ?? 0;
    const registrados = stats?.registrados ?? 0;
    const item: ClaseHistorial = {
      id: c.id,
      titulo: c.titulo,
      fecha: c.fecha,
      numeroSesion: c.numeroSesion,
      horaInicio: c.horaInicio ? String(c.horaInicio).slice(0, 5) : null,
      horaFin: c.horaFin ? String(c.horaFin).slice(0, 5) : null,
      sala: c.sala,
      totalAlumnos,
      presentes,
      ausentes,
      tardanzas,
      pctAsistencia: registrados > 0 ? Math.round((presentes / registrados) * 100) : null,
    };
    const arr = clasesMap.get(c.asignaturaId) ?? [];
    arr.push(item);
    clasesMap.set(c.asignaturaId, arr);
  }

  return asigs
    .map((a) => {
      const lista = clasesMap.get(a.id) ?? [];
      return {
        asignaturaId: a.id,
        asignaturaNombre: a.nombre,
        totalClases: lista.length,
        clases: lista,
      };
    })
    .filter((a) => a.totalClases > 0);
}
