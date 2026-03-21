"use server";

import { and, asc, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  matriculas,
  notasDocente,
  observacionesDocente,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { finalizarAsignaturasVencidas } from "@/lib/courseLifecycle";
import { sanitizeText } from "@/lib/sanitize";

import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const parseDateInput = (value: string): Date | null => {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const date = new Date(`${trimmed}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const claseDocenteInputSchema = z.object({
  asignaturaId: z.string().uuid(),
  titulo: z.string().trim().min(3).max(140),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z
    .union([z.string(), z.undefined()])
    .transform((v) => (typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined))
    .refine((v) => !v || /^([01]\d|2[0-3]):[0-5]\d$/.test(v), "Hora inválida"),
  numeroSesion: z.coerce.number().int().min(1).max(1000),
});

const editarClaseDocenteInputSchema = claseDocenteInputSchema.extend({
  claseId: z.string().uuid(),
});

const asistenciaDocenteInputSchema = z.object({
  claseId: z.string().uuid(),
  matriculaId: z.string().uuid(),
  estado: z.enum(["presente", "ausente", "tardanza", "justificado"]),
  observacion: z
    .union([z.string(), z.undefined()])
    .transform((v) => (typeof v === "string" ? sanitizeText(v).trim() : undefined))
    .refine((v) => !v || (v.length <= 300 && !/[<>]/.test(v)), "Observación inválida"),
  fechaRegistro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const notaDocenteInputSchema = z.object({
  asignaturaId: z.string().uuid(),
  matriculaId: z.string().uuid(),
  nota: z.coerce.number().min(1).max(7),
  fechaRegistro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const observacionDocenteInputSchema = z.object({
  asignaturaId: z.string().uuid(),
  matriculaId: z.string().uuid(),
  observacion: z
    .string()
    .transform((v) => sanitizeText(v).trim())
    .pipe(z.string().min(3).max(500))
    .refine((v) => !/[<>]/.test(v), "Observación inválida"),
  fechaRegistro: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const assertDocenteOwnsAsignatura = async (docenteId: string, asignaturaId: string) => {
  const db = getDb();
  const [asignatura] = await db
    .select({ id: asignaturas.id, estado: asignaturas.estado, docenteId: asignaturas.docenteId })
    .from(asignaturas)
    .where(eq(asignaturas.id, asignaturaId))
    .limit(1);

  if (!asignatura || asignatura.docenteId !== docenteId) {
    return null;
  }

  return asignatura;
};

export async function listarAsignaturasDocente() {
  const actorResult = await requireActionActor("docente_asignaturas_list", ["docente"]);
  if (!actorResult.ok) {
    return [];
  }

  await finalizarAsignaturasVencidas();

  const db = getDb();

  return db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
      fechaInicio: asignaturas.fechaInicio,
      duracionMeses: asignaturas.duracionMeses,
    })
    .from(asignaturas)
    .where(eq(asignaturas.docenteId, actorResult.actor.userId))
    .orderBy(desc(asignaturas.createdAt));
}

export async function listarMatriculasDocente(asignaturaId: string) {
  const actorResult = await requireActionActor("docente_matriculas_list", ["docente"]);
  if (!actorResult.ok || !asignaturaId) {
    return [];
  }

  const asignatura = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!asignatura) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      matriculaId: matriculas.id,
      alumnoId: usuarios.id,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      activa: matriculas.activa,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(and(eq(matriculas.asignaturaId, asignaturaId), eq(matriculas.activa, true)))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));
}

export async function listarClasesDocente(asignaturaId: string) {
  const actorResult = await requireActionActor("docente_clases_list", ["docente"]);
  if (!actorResult.ok || !asignaturaId) {
    return [];
  }

  const asignatura = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!asignatura) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      numeroSesion: clases.numeroSesion,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
    })
    .from(clases)
    .where(and(eq(clases.asignaturaId, asignaturaId), isNull(clases.eliminadoAt)))
    .orderBy(asc(clases.numeroSesion));
}

export async function listarNotasDocente(asignaturaId: string) {
  const actorResult = await requireActionActor("docente_notas_list", ["docente"]);
  if (!actorResult.ok || !asignaturaId) {
    return [];
  }

  const asignatura = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!asignatura) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: notasDocente.id,
      nota: notasDocente.nota,
      fechaRegistro: notasDocente.fechaRegistro,
      anioRegistro: notasDocente.anioRegistro,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(notasDocente)
    .innerJoin(matriculas, eq(notasDocente.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(eq(notasDocente.asignaturaId, asignaturaId))
    .orderBy(desc(notasDocente.fechaRegistro), desc(notasDocente.createdAt));
}

export async function listarObservacionesDocente(asignaturaId: string) {
  const actorResult = await requireActionActor("docente_observaciones_list", ["docente"]);
  if (!actorResult.ok || !asignaturaId) {
    return [];
  }

  const asignatura = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!asignatura) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: observacionesDocente.id,
      observacion: observacionesDocente.observacion,
      fechaRegistro: observacionesDocente.fechaRegistro,
      anioRegistro: observacionesDocente.anioRegistro,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(observacionesDocente)
    .innerJoin(matriculas, eq(observacionesDocente.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(eq(observacionesDocente.asignaturaId, asignaturaId))
    .orderBy(desc(observacionesDocente.fechaRegistro), desc(observacionesDocente.createdAt));
}

export async function crearClaseDocenteAction(input: {
  asignaturaId: string;
  titulo: string;
  fecha: string;
  horaInicio?: string;
  numeroSesion: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_clase_create", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = claseDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Clase inválida." };
  }

  const asignatura = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!asignatura) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  if (asignatura.estado === "archivado" || asignatura.estado === "finalizado") {
    return { ok: false, code: "asignatura_closed", message: "La asignatura está cerrada." };
  }

  const db = getDb();

  try {
    const [created] = await db
      .insert(clases)
      .values({
        asignaturaId: parsed.data.asignaturaId,
        titulo: sanitizeText(parsed.data.titulo),
        fecha: parsed.data.fecha,
        horaInicio: parsed.data.horaInicio,
        numeroSesion: parsed.data.numeroSesion,
        publicada: true,
        createdAt: new Date(),
      })
      .returning({ id: clases.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "clases",
      entidadId: created.id,
      payload: { origen: "docente" },
      exitoso: true,
    });

    return { ok: true, code: "clase_docente_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    if (message.includes("clases_asignatura_id_numero_sesion") || message.includes("duplicate key")) {
      return {
        ok: false,
        code: "clase_sesion_conflict",
        message: "Ya existe una clase con ese número de sesión.",
      };
    }
    return { ok: false, code: "clase_create_failed", message: "No se pudo crear la clase." };
  }
}

export async function editarClaseDocenteAction(input: {
  claseId: string;
  asignaturaId: string;
  titulo: string;
  fecha: string;
  horaInicio?: string;
  numeroSesion: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_clase_update", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = editarClaseDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Clase inválida." };
  }

  const db = getDb();

  const [ctx] = await db
    .select({
      id: clases.id,
      asignaturaId: clases.asignaturaId,
    })
    .from(clases)
    .where(eq(clases.id, parsed.data.claseId))
    .limit(1);

  if (!ctx || ctx.asignaturaId !== parsed.data.asignaturaId) {
    return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, ctx.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const [subject] = await db
    .select({ estado: asignaturas.estado })
    .from(asignaturas)
    .where(eq(asignaturas.id, ctx.asignaturaId))
    .limit(1);

  if (!subject || subject.estado === "archivado" || subject.estado === "finalizado") {
    return { ok: false, code: "asignatura_closed", message: "La asignatura está cerrada." };
  }

  try {
    await db
      .update(clases)
      .set({
        titulo: sanitizeText(parsed.data.titulo),
        fecha: parsed.data.fecha,
        horaInicio: parsed.data.horaInicio ?? null,
        numeroSesion: parsed.data.numeroSesion,
      })
      .where(eq(clases.id, parsed.data.claseId));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "clases",
      entidadId: parsed.data.claseId,
      payload: { origen: "docente" },
      exitoso: true,
    });

    return { ok: true, code: "clase_docente_updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    if (message.includes("clases_asignatura_id_numero_sesion") || message.includes("duplicate key")) {
      return {
        ok: false,
        code: "clase_sesion_conflict",
        message: "Ya existe una clase con ese número de sesión.",
      };
    }

    return { ok: false, code: "clase_update_failed", message: "No se pudo editar la clase." };
  }
}

export async function registrarAsistenciaDocenteAction(input: {
  claseId: string;
  matriculaId: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado";
  observacion?: string;
  fechaRegistro: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_asistencia_create", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = asistenciaDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Asistencia inválida." };
  }

  const db = getDb();

  const [ctx] = await db
    .select({
      claseId: clases.id,
      asignaturaId: clases.asignaturaId,
    })
    .from(clases)
    .where(eq(clases.id, parsed.data.claseId))
    .limit(1);

  if (!ctx) {
    return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, ctx.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const [subject] = await db
    .select({ estado: asignaturas.estado })
    .from(asignaturas)
    .where(eq(asignaturas.id, ctx.asignaturaId))
    .limit(1);

  if (!subject || subject.estado === "archivado" || subject.estado === "finalizado") {
    return { ok: false, code: "asignatura_closed", message: "La asignatura está cerrada." };
  }

  const [matriculaRow] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(and(eq(matriculas.id, parsed.data.matriculaId), eq(matriculas.asignaturaId, ctx.asignaturaId)))
    .limit(1);

  if (!matriculaRow) {
    return { ok: false, code: "matricula_not_found", message: "Matrícula no encontrada." };
  }

  const fechaRegistro = parseDateInput(parsed.data.fechaRegistro);
  if (!fechaRegistro) {
    return { ok: false, code: "invalid_date", message: "Fecha inválida." };
  }

  const [existing] = await db
    .select({ id: asistencia.id })
    .from(asistencia)
    .where(and(eq(asistencia.claseId, parsed.data.claseId), eq(asistencia.matriculaId, parsed.data.matriculaId)))
    .limit(1);

  if (existing) {
    await db
      .update(asistencia)
      .set({
        estado: parsed.data.estado,
        observacion: parsed.data.observacion ?? null,
        fechaRegistro,
      })
      .where(eq(asistencia.id, existing.id));

    return { ok: true, code: "asistencia_updated" };
  }

  await db.insert(asistencia).values({
    claseId: parsed.data.claseId,
    matriculaId: parsed.data.matriculaId,
    estado: parsed.data.estado,
    observacion: parsed.data.observacion ?? null,
    registradoPor: actorResult.actor.userId,
    fechaRegistro,
  });

  return { ok: true, code: "asistencia_created" };
}

export async function registrarNotaDocenteAction(input: {
  asignaturaId: string;
  matriculaId: string;
  nota: number;
  fechaRegistro: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_nota_create", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = notaDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Nota inválida." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const db = getDb();
  const [subject] = await db
    .select({ estado: asignaturas.estado })
    .from(asignaturas)
    .where(eq(asignaturas.id, parsed.data.asignaturaId))
    .limit(1);

  if (!subject || subject.estado === "archivado" || subject.estado === "finalizado") {
    return { ok: false, code: "asignatura_closed", message: "La asignatura está cerrada." };
  }

  const [matriculaRow] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(and(eq(matriculas.id, parsed.data.matriculaId), eq(matriculas.asignaturaId, parsed.data.asignaturaId)))
    .limit(1);

  if (!matriculaRow) {
    return { ok: false, code: "matricula_not_found", message: "Matrícula no encontrada." };
  }

  const fechaRegistro = parseDateInput(parsed.data.fechaRegistro);
  if (!fechaRegistro) {
    return { ok: false, code: "invalid_date", message: "Fecha inválida." };
  }

  const anioRegistro = fechaRegistro.getUTCFullYear();

  // Bug #33: upsert to prevent duplicate notas for same matrícula+fecha
  const [existing] = await db
    .select({ id: notasDocente.id })
    .from(notasDocente)
    .where(
      and(
        eq(notasDocente.matriculaId, parsed.data.matriculaId),
        eq(notasDocente.asignaturaId, parsed.data.asignaturaId),
        eq(notasDocente.fechaRegistro, parsed.data.fechaRegistro),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(notasDocente)
      .set({
        nota: parsed.data.nota.toFixed(1),
        updatedAt: new Date(),
      })
      .where(eq(notasDocente.id, existing.id));

    return { ok: true, code: "nota_updated" };
  }

  await db.insert(notasDocente).values({
    docenteId: actorResult.actor.userId,
    asignaturaId: parsed.data.asignaturaId,
    matriculaId: parsed.data.matriculaId,
    nota: parsed.data.nota.toFixed(1),
    fechaRegistro: parsed.data.fechaRegistro,
    anioRegistro,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  return { ok: true, code: "nota_created" };
}

export async function registrarObservacionDocenteAction(input: {
  asignaturaId: string;
  matriculaId: string;
  observacion: string;
  fechaRegistro: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_observacion_create", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const parsed = observacionDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Observación inválida." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const db = getDb();
  const [subject] = await db
    .select({ estado: asignaturas.estado })
    .from(asignaturas)
    .where(eq(asignaturas.id, parsed.data.asignaturaId))
    .limit(1);

  if (!subject || subject.estado === "archivado" || subject.estado === "finalizado") {
    return { ok: false, code: "asignatura_closed", message: "La asignatura está cerrada." };
  }

  const [matriculaRow] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(and(eq(matriculas.id, parsed.data.matriculaId), eq(matriculas.asignaturaId, parsed.data.asignaturaId)))
    .limit(1);

  if (!matriculaRow) {
    return { ok: false, code: "matricula_not_found", message: "Matrícula no encontrada." };
  }

  const fechaRegistro = parseDateInput(parsed.data.fechaRegistro);
  if (!fechaRegistro) {
    return { ok: false, code: "invalid_date", message: "Fecha inválida." };
  }

  await db.insert(observacionesDocente).values({
    docenteId: actorResult.actor.userId,
    asignaturaId: parsed.data.asignaturaId,
    matriculaId: parsed.data.matriculaId,
    observacion: parsed.data.observacion,
    fechaRegistro: parsed.data.fechaRegistro,
    anioRegistro: fechaRegistro.getUTCFullYear(),
    createdAt: new Date(),
  });

  return { ok: true, code: "observacion_created" };
}

const editarNotaDocenteInputSchema = z.object({
  notaId: z.string().uuid(),
  nota: z.number().min(1).max(7),
});

// Fix #94: Allow docente to edit a nota
export async function editarNotaDocenteAction(input: {
  notaId: string;
  nota: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_nota_edit", ["docente"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = editarNotaDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Nota inválida." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: notasDocente.id, docenteId: notasDocente.docenteId })
    .from(notasDocente)
    .where(eq(notasDocente.id, parsed.data.notaId))
    .limit(1);

  if (!existing) return { ok: false, code: "nota_not_found", message: "Nota no encontrada." };
  if (existing.docenteId !== actorResult.actor.userId) {
    return { ok: false, code: "forbidden", message: "Solo puedes editar tus propias notas." };
  }

  await db
    .update(notasDocente)
    .set({ nota: parsed.data.nota.toFixed(1), updatedAt: new Date() })
    .where(eq(notasDocente.id, parsed.data.notaId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "cambiar_nota",
    entidad: "notas_docente",
    entidadId: parsed.data.notaId,
    payload: { nota: parsed.data.nota },
    exitoso: true,
  });

  return { ok: true, code: "nota_updated" };
}

const eliminarNotaDocenteInputSchema = z.object({
  notaId: z.string().uuid(),
});

// Fix #94: Allow docente to delete a nota
export async function eliminarNotaDocenteAction(input: {
  notaId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_nota_delete", ["docente"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = eliminarNotaDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Identificador de nota inválido." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: notasDocente.id, docenteId: notasDocente.docenteId })
    .from(notasDocente)
    .where(eq(notasDocente.id, parsed.data.notaId))
    .limit(1);

  if (!existing) return { ok: false, code: "nota_not_found", message: "Nota no encontrada." };
  if (existing.docenteId !== actorResult.actor.userId) {
    return { ok: false, code: "forbidden", message: "Solo puedes eliminar tus propias notas." };
  }

  await db.delete(notasDocente).where(eq(notasDocente.id, parsed.data.notaId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "desactivar",
    entidad: "notas_docente",
    entidadId: parsed.data.notaId,
    payload: {},
    exitoso: true,
  });

  return { ok: true, code: "nota_deleted" };
}

const editarObservacionDocenteInputSchema = z.object({
  observacionId: z.string().uuid(),
  observacion: z
    .string()
    .transform((v) => sanitizeText(v).trim())
    .pipe(z.string().min(3).max(500))
    .refine((v) => !/[<>]/.test(v), "Observación inválida"),
});

// Fix #95: Allow docente to edit an observacion
export async function editarObservacionDocenteAction(input: {
  observacionId: string;
  observacion: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_observacion_edit", ["docente"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = editarObservacionDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Observación inválida." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: observacionesDocente.id, docenteId: observacionesDocente.docenteId })
    .from(observacionesDocente)
    .where(eq(observacionesDocente.id, parsed.data.observacionId))
    .limit(1);

  if (!existing) return { ok: false, code: "observacion_not_found", message: "Observación no encontrada." };
  if (existing.docenteId !== actorResult.actor.userId) {
    return { ok: false, code: "forbidden", message: "Solo puedes editar tus propias observaciones." };
  }

  await db
    .update(observacionesDocente)
    .set({ observacion: parsed.data.observacion })
    .where(eq(observacionesDocente.id, parsed.data.observacionId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "observaciones_docente",
    entidadId: parsed.data.observacionId,
    payload: {},
    exitoso: true,
  });

  return { ok: true, code: "observacion_updated" };
}

const eliminarObservacionDocenteInputSchema = z.object({
  observacionId: z.string().uuid(),
});

// Fix #95: Allow docente to delete an observacion
export async function eliminarObservacionDocenteAction(input: {
  observacionId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_observacion_delete", ["docente"]);
  if (!actorResult.ok) return actorResult.result;

  const parsed = eliminarObservacionDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Identificador de observación inválido." };
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: observacionesDocente.id, docenteId: observacionesDocente.docenteId })
    .from(observacionesDocente)
    .where(eq(observacionesDocente.id, parsed.data.observacionId))
    .limit(1);

  if (!existing) return { ok: false, code: "observacion_not_found", message: "Observación no encontrada." };
  if (existing.docenteId !== actorResult.actor.userId) {
    return { ok: false, code: "forbidden", message: "Solo puedes eliminar tus propias observaciones." };
  }

  await db.delete(observacionesDocente).where(eq(observacionesDocente.id, parsed.data.observacionId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "desactivar",
    entidad: "observaciones_docente",
    entidadId: parsed.data.observacionId,
    payload: {},
    exitoso: true,
  });

  return { ok: true, code: "observacion_deleted" };
}

export async function crearClaseDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await crearClaseDocenteAction({
    asignaturaId,
    titulo: getStringField(formData, "titulo"),
    fecha: getStringField(formData, "fecha"),
    horaInicio: getStringField(formData, "horaInicio") || undefined,
    numeroSesion: Number.parseInt(getStringField(formData, "numeroSesion"), 10),
  });

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

export async function editarClaseDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await editarClaseDocenteAction({
    claseId: getStringField(formData, "claseId"),
    asignaturaId,
    titulo: getStringField(formData, "titulo"),
    fecha: getStringField(formData, "fecha"),
    horaInicio: getStringField(formData, "horaInicio") || undefined,
    numeroSesion: Number.parseInt(getStringField(formData, "numeroSesion"), 10),
  });

  revalidatePath("/docente/asignaturas");
  redirect(
    "/docente/asignaturas?state=" +
      result.code +
      "&asignaturaId=" +
      encodeURIComponent(asignaturaId),
  );
}

export async function registrarAsistenciaDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await registrarAsistenciaDocenteAction({
    claseId: getStringField(formData, "claseId"),
    matriculaId: getStringField(formData, "matriculaId"),
    estado: (getStringField(formData, "estado") || "ausente") as
      | "presente"
      | "ausente"
      | "tardanza"
      | "justificado",
    observacion: getStringField(formData, "observacion") || undefined,
    fechaRegistro: getStringField(formData, "fechaRegistro"),
  });

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

export async function registrarNotaDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await registrarNotaDocenteAction({
    asignaturaId,
    matriculaId: getStringField(formData, "matriculaId"),
    nota: Number.parseFloat(getStringField(formData, "nota")),
    fechaRegistro: getStringField(formData, "fechaRegistro"),
  });

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

export async function registrarObservacionDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await registrarObservacionDocenteAction({
    asignaturaId,
    matriculaId: getStringField(formData, "matriculaId"),
    observacion: getStringField(formData, "observacion"),
    fechaRegistro: getStringField(formData, "fechaRegistro"),
  });

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

export type ResumenDocente = {
  totalAlumnos: number;
  proximasClases: number;
};

/**
 * Returns aggregate counts for the dashboard: total enrolled active alumnos
 * across all the docente's asignaturas, and number of upcoming/today classes.
 */
export async function obtenerResumenDocente(): Promise<ResumenDocente> {
  const actorResult = await requireActionActor("docente_resumen", ["docente"]);
  if (!actorResult.ok) {
    return { totalAlumnos: 0, proximasClases: 0 };
  }

  const db = getDb();
  const docenteId = actorResult.actor.userId;

  // Today's date as YYYY-MM-DD in UTC
  const today = new Date().toISOString().slice(0, 10);

  const [alumnosRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, docenteId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );

  const [clasesRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, docenteId),
        isNull(clases.eliminadoAt),
        gte(clases.fecha, today),
      ),
    );

  return {
    totalAlumnos: Number(alumnosRow?.count ?? 0),
    proximasClases: Number(clasesRow?.count ?? 0),
  };
}
