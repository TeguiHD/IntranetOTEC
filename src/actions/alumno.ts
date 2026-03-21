"use server";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  matriculas,
  observacionesDocente,
  usuarios,
} from "@/db/schema";

import { requireActionActor } from "./_security";

export async function obtenerPerfilAlumno() {
  const actorResult = await requireActionActor("alumno_perfil_read", ["alumno"]);
  if (!actorResult.ok) {
    return null;
  }

  const db = getDb();

  const [user] = await db
    .select({
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      rut: usuarios.rut,
      email: usuarios.email,
      createdAt: usuarios.createdAt,
      avatarUrl: usuarios.avatarUrl,
    })
    .from(usuarios)
    .where(eq(usuarios.id, actorResult.actor.userId))
    .limit(1);

  return user ?? null;
}

export async function listarObservacionesAlumno() {
  const actorResult = await requireActionActor("alumno_observaciones_list", ["alumno"]);
  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: observacionesDocente.id,
      observacion: observacionesDocente.observacion,
      fechaRegistro: observacionesDocente.fechaRegistro,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(observacionesDocente)
    .innerJoin(matriculas, eq(observacionesDocente.matriculaId, matriculas.id))
    .innerJoin(asignaturas, eq(observacionesDocente.asignaturaId, asignaturas.id))
    .where(eq(matriculas.alumnoId, actorResult.actor.userId))
    .orderBy(desc(observacionesDocente.fechaRegistro), desc(observacionesDocente.createdAt));
}
