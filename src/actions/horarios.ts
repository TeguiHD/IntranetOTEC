"use server";

import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { asignaturas, bloquesHorario, clases, matriculas, periodosAcademicos, usuarios } from "@/db/schema";
import { sanitizeText } from "@/lib/sanitize";

import { requireActionActor, type MutationResult } from "./_security";

// ---- Tipos ----

export type BloqueHorario = {
  id: string;
  asignaturaId: string;
  asignaturaNombre: string;
  docenteNombre: string | null;
  docenteApellido: string | null;
  periodoNombre: string | null;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  sala: string | null;
};

const bloqueInputSchema = z.object({
  asignaturaId: z.string().uuid(),
  diaSemana: z.coerce.number().int().min(0).max(5),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  horaFin: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  sala: z.string().trim().max(80).optional(),
});

// ---- Consultas de horario ----

/** Horario semanal de un alumno (todos sus bloques vigentes) */
export async function obtenerHorarioAlumno() {
  const actorResult = await requireActionActor("horario_alumno", ["alumno"]);
  if (!actorResult.ok) return [] as BloqueHorario[];

  const db = getDb();

  return db
    .select({
      id: bloquesHorario.id,
      asignaturaId: bloquesHorario.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      periodoNombre: periodosAcademicos.nombre,
      diaSemana: bloquesHorario.diaSemana,
      horaInicio: bloquesHorario.horaInicio,
      horaFin: bloquesHorario.horaFin,
      sala: bloquesHorario.sala,
    })
    .from(bloquesHorario)
    .innerJoin(asignaturas, eq(bloquesHorario.asignaturaId, asignaturas.id))
    .innerJoin(
      matriculas,
      and(
        eq(matriculas.asignaturaId, asignaturas.id),
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(isNull(bloquesHorario.eliminadoAt))
    .orderBy(asc(bloquesHorario.diaSemana), asc(bloquesHorario.horaInicio));
}

/** Horario semanal de un docente (todas sus secciones activas) */
export async function obtenerHorarioDocente() {
  const actorResult = await requireActionActor("horario_docente", ["docente"]);
  if (!actorResult.ok) return [] as BloqueHorario[];

  const db = getDb();

  return db
    .select({
      id: bloquesHorario.id,
      asignaturaId: bloquesHorario.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
      periodoNombre: periodosAcademicos.nombre,
      diaSemana: bloquesHorario.diaSemana,
      horaInicio: bloquesHorario.horaInicio,
      horaFin: bloquesHorario.horaFin,
      sala: bloquesHorario.sala,
    })
    .from(bloquesHorario)
    .innerJoin(asignaturas, eq(bloquesHorario.asignaturaId, asignaturas.id))
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(
      and(
        eq(asignaturas.docenteId, actorResult.actor.userId),
        isNull(bloquesHorario.eliminadoAt),
        isNull(asignaturas.eliminadoAt),
      ),
    )
    .orderBy(asc(bloquesHorario.diaSemana), asc(bloquesHorario.horaInicio));
}

/** Horario de una sección específica (admin) */
export async function obtenerBloquesDeAsignatura(asignaturaId: string) {
  const actorResult = await requireActionActor("horario_admin_asig", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select()
    .from(bloquesHorario)
    .where(
      and(eq(bloquesHorario.asignaturaId, asignaturaId), isNull(bloquesHorario.eliminadoAt)),
    )
    .orderBy(asc(bloquesHorario.diaSemana), asc(bloquesHorario.horaInicio));
}

// ---- Mutaciones ----

export async function crearBloqueHorario(input: unknown): Promise<MutationResult> {
  const actorResult = await requireActionActor("crear_bloque_horario", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = bloqueInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { asignaturaId, diaSemana, horaInicio, horaFin, sala } = parsed.data;

  if (horaFin <= horaInicio) {
    return { ok: false, code: "hora_invalida", message: "La hora de fin debe ser posterior a la de inicio." };
  }

  const db = getDb();

  await db.insert(bloquesHorario).values({
    asignaturaId,
    diaSemana,
    horaInicio,
    horaFin,
    sala: sala ? sanitizeText(sala) : null,
  });

  revalidatePath("/admin/asignaturas");
  return { ok: true, code: "bloque_creado" };
}

export async function eliminarBloqueHorario(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("eliminar_bloque_horario", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const db = getDb();

  await db
    .update(bloquesHorario)
    .set({ eliminadoAt: new Date() })
    .where(eq(bloquesHorario.id, id));

  revalidatePath("/admin/asignaturas");
  return { ok: true, code: "bloque_eliminado" };
}

// ---- Horario como clases individuales ----

/** Clases de esta semana para el alumno (fuente: tabla clases, con hora inicio/fin) */
export async function obtenerClasesSemanaAlumno(fechaLunes: string) {
  const actorResult = await requireActionActor("clases_semana_alumno", ["alumno"]);
  if (!actorResult.ok) return [];

  // Calcular rango de la semana
  const lunes = new Date(fechaLunes);
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);
  const fechaSabado = sabado.toISOString().split("T")[0];

  const db = getDb();

  return db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      sala: clases.sala,
      asignaturaNombre: asignaturas.nombre,
      docenteNombre: usuarios.nombre,
      docenteApellido: usuarios.apellido,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .innerJoin(
      matriculas,
      and(
        eq(matriculas.asignaturaId, asignaturas.id),
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .where(
      and(
        eq(clases.publicada, true),
        isNull(clases.eliminadoAt),
          gte(clases.fecha, fechaLunes),
          lte(clases.fecha, fechaSabado),
      ),
    )
    .orderBy(asc(clases.fecha), asc(clases.horaInicio));
}

export async function obtenerClasesSemanaDocente(fechaLunes: string) {
  const actorResult = await requireActionActor("clases_semana_docente", ["docente"]);
  if (!actorResult.ok) return [];

  const lunes = new Date(fechaLunes);
  const sabado = new Date(lunes);
  sabado.setDate(lunes.getDate() + 5);
  const fechaSabado = sabado.toISOString().split("T")[0];

  const db = getDb();

  return db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      sala: clases.sala,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, actorResult.actor.userId),
        eq(clases.publicada, true),
        isNull(clases.eliminadoAt),
        isNull(asignaturas.eliminadoAt),
          gte(clases.fecha, fechaLunes),
          lte(clases.fecha, fechaSabado),
      ),
    )
    .orderBy(asc(clases.fecha), asc(clases.horaInicio));
}
