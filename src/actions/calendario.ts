"use server";

import { and, eq, gte, isNull, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas, clases, cursos, evaluaciones, matriculas } from "@/db/schema";
import { requireActionActor } from "@/actions/_security";

export type EventoCalendario = {
  id: string;
  tipo: "clase" | "evaluacion";
  titulo: string;
  asignaturaNombre: string;
  fecha: string; // YYYY-MM-DD
  hora?: string | null;
  color: string;
};

const COLORS = [
  "#8B3A9E", "#3B82F6", "#10B981", "#F59E0B", "#EC4899",
  "#6366F1", "#06B6D4", "#EF4444", "#14B8A6", "#F97316",
];

// ── Alumno: clases y evaluaciones de sus cursos matriculados ──────────
export async function obtenerEventosCalendarioAlumno(
  mes: number,
  anio: number,
): Promise<EventoCalendario[]> {
  const actorResult = await requireActionActor("calendario_alumno", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  // Last day of month
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${ultimoDia}`;

  // Get enrolled asignaturas
  const mats = await db
    .select({ asignaturaId: matriculas.asignaturaId })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );

  if (mats.length === 0) return [];
  const asigIds = mats.map((m) => m.asignaturaId);

  const eventos: EventoCalendario[] = [];

  // Nombre de asignaturas para colores
  const asigs = await db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre, cursoNombre: cursos.nombre })
    .from(asignaturas)
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .where(eq(asignaturas.estado, "activo"));

  const colorMap: Record<string, string> = {};
  asigs.forEach((a, i) => {
    colorMap[a.id] = COLORS[i % COLORS.length];
  });
  const nombreMap: Record<string, string> = Object.fromEntries(
    asigs.map((a) => [a.id, a.cursoNombre ?? a.nombre]),
  );

  // Clases del mes
  for (const asigId of asigIds) {
    const clasesRows = await db
      .select({
        id: clases.id,
        titulo: clases.titulo,
        fecha: clases.fecha,
        horaInicio: clases.horaInicio,
        asignaturaId: clases.asignaturaId,
      })
      .from(clases)
      .where(
        and(
          eq(clases.asignaturaId, asigId),
          eq(clases.publicada, true),
          isNull(clases.eliminadoAt),
          gte(clases.fecha, inicio),
          lte(clases.fecha, fin),
        ),
      );

    for (const c of clasesRows) {
      eventos.push({
        id: c.id,
        tipo: "clase",
        titulo: c.titulo,
        asignaturaNombre: nombreMap[c.asignaturaId] ?? "",
        fecha: c.fecha,
        hora: c.horaInicio,
        color: colorMap[c.asignaturaId] ?? "#8B3A9E",
      });
    }

    // Evaluaciones del mes
    const evalRows = await db
      .select({
        id: evaluaciones.id,
        titulo: evaluaciones.titulo,
        fechaLimite: evaluaciones.fechaLimite,
        asignaturaId: evaluaciones.asignaturaId,
      })
      .from(evaluaciones)
      .where(
        and(
          eq(evaluaciones.asignaturaId, asigId),
          eq(evaluaciones.publicada, true),
        ),
      );

    for (const e of evalRows) {
      if (!e.fechaLimite) continue;
      const fechaStr = e.fechaLimite.toISOString().slice(0, 10);
      if (fechaStr < inicio || fechaStr > fin) continue;
      eventos.push({
        id: e.id,
        tipo: "evaluacion",
        titulo: e.titulo,
        asignaturaNombre: nombreMap[e.asignaturaId] ?? "",
        fecha: fechaStr,
        hora: e.fechaLimite.toTimeString().slice(0, 5),
        color: colorMap[e.asignaturaId] ?? "#EF4444",
      });
    }
  }

  return eventos;
}

// ── Docente: clases y evaluaciones de sus asignaturas ─────────────────
export async function obtenerEventosCalendarioDocente(
  mes: number,
  anio: number,
): Promise<EventoCalendario[]> {
  const actorResult = await requireActionActor("calendario_docente", ["docente", "admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fin = `${anio}-${String(mes).padStart(2, "0")}-${ultimoDia}`;

  const asigs = await db
    .select({ id: asignaturas.id, nombre: asignaturas.nombre, cursoNombre: cursos.nombre })
    .from(asignaturas)
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .where(eq(asignaturas.docenteId, actorResult.actor.userId));

  if (asigs.length === 0) return [];

  const colorMap: Record<string, string> = {};
  asigs.forEach((a, i) => { colorMap[a.id] = COLORS[i % COLORS.length]; });
  const nombreMap: Record<string, string> = Object.fromEntries(
    asigs.map((a) => [a.id, a.cursoNombre ?? a.nombre]),
  );

  const eventos: EventoCalendario[] = [];

  for (const asig of asigs) {
    const clasesRows = await db
      .select({ id: clases.id, titulo: clases.titulo, fecha: clases.fecha, horaInicio: clases.horaInicio })
      .from(clases)
      .where(
        and(
          eq(clases.asignaturaId, asig.id),
          isNull(clases.eliminadoAt),
          gte(clases.fecha, inicio),
          lte(clases.fecha, fin),
        ),
      );

    for (const c of clasesRows) {
      eventos.push({
        id: c.id,
        tipo: "clase",
        titulo: c.titulo,
        asignaturaNombre: nombreMap[asig.id] ?? "",
        fecha: c.fecha,
        hora: c.horaInicio,
        color: colorMap[asig.id] ?? "#8B3A9E",
      });
    }

    const evalRows = await db
      .select({ id: evaluaciones.id, titulo: evaluaciones.titulo, fechaLimite: evaluaciones.fechaLimite })
      .from(evaluaciones)
      .where(eq(evaluaciones.asignaturaId, asig.id));

    for (const e of evalRows) {
      if (!e.fechaLimite) continue;
      const fechaStr = e.fechaLimite.toISOString().slice(0, 10);
      if (fechaStr < inicio || fechaStr > fin) continue;
      eventos.push({
        id: e.id,
        tipo: "evaluacion",
        titulo: e.titulo,
        asignaturaNombre: nombreMap[asig.id] ?? "",
        fecha: fechaStr,
        hora: e.fechaLimite.toTimeString().slice(0, 5),
        color: colorMap[asig.id] ?? "#EF4444",
      });
    }
  }

  return eventos;
}
