"use server";

import { and, asc, desc, eq } from "drizzle-orm";
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
  const [owned] = await db
    .select({ id: asignaturas.id })
    .from(asignaturas)
    .where(and(eq(asignaturas.id, asignaturaId), eq(asignaturas.docenteId, docenteId)))
    .limit(1);

  return Boolean(owned);
};

export async function listarAsignaturasDocente() {
  const actorResult = await requireActionActor("docente_asignaturas_list", ["docente"]);
  if (!actorResult.ok) {
    return [];
  }

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

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) {
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

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) {
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
    .where(eq(clases.asignaturaId, asignaturaId))
    .orderBy(asc(clases.numeroSesion));
}

export async function listarNotasDocente(asignaturaId: string) {
  const actorResult = await requireActionActor("docente_notas_list", ["docente"]);
  if (!actorResult.ok || !asignaturaId) {
    return [];
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) {
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

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) {
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

  const parsed = claseDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Clase inválida." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const db = getDb();
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

  const parsed = notaDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Nota inválida." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const db = getDb();
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

  const parsed = observacionDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Observación inválida." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const db = getDb();
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
