"use server";

import { and, asc, count, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  asignaturas,
  asistencia,
  clases,
  evaluacionIntentos,
  matriculas,
  notas as notasEval,
  notasDocente,
  observacionesDocente,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sendEmail, templateClaseAgendada } from "@/lib/email";
import { enviarPushADestinatarios } from "@/actions/notificaciones";
import { finalizarAsignaturasVencidas } from "@/lib/courseLifecycle";
import { sanitizeText } from "@/lib/sanitize";
import { parseSpreadsheetRowsFromBuffer } from "@/lib/spreadsheet";

import {
  assertPeriodoAbiertoByAsignaturaId,
  assertPeriodoAbiertoByClaseId,
  assertPeriodoAbiertoByMatriculaId,
} from "./_period-lock";
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

const normalizeRutLike = (value: string): string =>
  value.trim().replace(/\./g, "").replace(/\s+/g, "").toUpperCase();

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

/**
 * Nómina de alumnos con resumen operativo: asistencias presentes, total clases y último estado.
 * Para control de distribución y seguimiento por docente (Step 15).
 */
export async function listarResumenAlumnosDocente(asignaturaId: string) {
  const actorResult = await requireActionActor("docente_matriculas_list", ["docente"]);
  if (!actorResult.ok || !asignaturaId) return [];

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) return [];

  const db = getDb();

  // Total clases de la asignatura
  const [totalClasesRow] = await db
    .select({ total: count() })
    .from(clases)
    .where(and(eq(clases.asignaturaId, asignaturaId), isNull(clases.eliminadoAt)));

  const totalClases = Number(totalClasesRow?.total ?? 0);

  // Por alumno: presentes y notas promedio
  const rows = await db
    .select({
      matriculaId: matriculas.id,
      alumnoId: usuarios.id,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      activa: matriculas.activa,
      presentes: sql<number>`cast(count(case when ${asistencia.estado} = 'presente' or ${asistencia.estado} = 'tardanza' then 1 end) as int)`,
      ausentes: sql<number>`cast(count(case when ${asistencia.estado} = 'ausente' then 1 end) as int)`,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .leftJoin(asistencia, eq(asistencia.matriculaId, matriculas.id))
    .where(and(eq(matriculas.asignaturaId, asignaturaId), eq(matriculas.activa, true)))
    .groupBy(matriculas.id, usuarios.id, usuarios.nombre, usuarios.apellido, usuarios.rut, matriculas.activa)
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  return rows.map((r) => ({ ...r, totalClases }));
}

export type AlumnoEnRiesgo = {
  matriculaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  alertas: ("asistencia_baja" | "nota_baja" | "evaluacion_expirada")[];
  asistenciaPct: number | null;
  notaPromedio: number | null;
};

export async function listarAlumnosEnRiesgo(asignaturaId: string): Promise<AlumnoEnRiesgo[]> {
  const actorResult = await requireActionActor("docente_alumnos_riesgo", ["docente", "admin"]);
  if (!actorResult.ok || !asignaturaId) return [];

  if (actorResult.actor.userRol === "docente") {
    const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
    if (!isOwner) return [];
  }

  const db = getDb();

  const [totalClasesRow] = await db
    .select({ total: count() })
    .from(clases)
    .where(and(eq(clases.asignaturaId, asignaturaId), isNull(clases.eliminadoAt)));
  const totalClases = Number(totalClasesRow?.total ?? 0);

  const rows = await db
    .select({
      matriculaId: matriculas.id,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      presentes: sql<number>`cast(count(distinct case when ${asistencia.estado} in ('presente','tardanza') then ${asistencia.id} end) as int)`,
      notaPromedio: sql<number | null>`avg(${notasEval.nota}::numeric) filter (where ${notasEval.eliminadoAt} is null)`,
      intentosExpirados: sql<number>`cast(count(distinct case when ${evaluacionIntentos.expiradoAt} is not null and ${evaluacionIntentos.enviadoAt} is null and ${evaluacionIntentos.anuladoAt} is null then ${evaluacionIntentos.id} end) as int)`,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .leftJoin(asistencia, eq(asistencia.matriculaId, matriculas.id))
    .leftJoin(notasEval, and(eq(notasEval.matriculaId, matriculas.id), isNull(notasEval.eliminadoAt)))
    .leftJoin(evaluacionIntentos, eq(evaluacionIntentos.matriculaId, matriculas.id))
    .where(
      and(
        eq(matriculas.asignaturaId, asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .groupBy(matriculas.id, usuarios.id, usuarios.nombre, usuarios.apellido, usuarios.rut)
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  const resultado: AlumnoEnRiesgo[] = [];
  for (const row of rows) {
    const alertas: AlumnoEnRiesgo["alertas"] = [];
    const asistenciaPct = totalClases > 0 ? Math.round((Number(row.presentes) / totalClases) * 100) : null;
    const notaPromedio = row.notaPromedio !== null ? Math.round(Number(row.notaPromedio) * 10) / 10 : null;

    if (asistenciaPct !== null && asistenciaPct < 75) alertas.push("asistencia_baja");
    if (notaPromedio !== null && notaPromedio < 4.0) alertas.push("nota_baja");
    if (Number(row.intentosExpirados) > 0) alertas.push("evaluacion_expirada");

    if (alertas.length > 0) {
      resultado.push({
        matriculaId: row.matriculaId,
        alumnoNombre: row.alumnoNombre,
        alumnoApellido: row.alumnoApellido,
        alumnoRut: row.alumnoRut,
        alertas,
        asistenciaPct,
        notaPromedio,
      });
    }
  }
  return resultado;
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
    .where(and(eq(clases.asignaturaId, asignaturaId), isNull(clases.eliminadoAt)))
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

export async function listarObservacionesAlumno() {
  const actorResult = await requireActionActor("alumno_observaciones_list", ["alumno"]);
  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  // Get the alumno's active matricula IDs
  const matriculasAlumno = await db
    .select({ id: matriculas.id, asignaturaId: matriculas.asignaturaId })
    .from(matriculas)
    .where(and(eq(matriculas.alumnoId, actorResult.actor.userId), eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)));

  if (matriculasAlumno.length === 0) {
    return [];
  }

  const matriculaIds = matriculasAlumno.map((m) => m.id);

  return db
    .select({
      id: observacionesDocente.id,
      observacion: observacionesDocente.observacion,
      fechaRegistro: observacionesDocente.fechaRegistro,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(observacionesDocente)
    .innerJoin(asignaturas, eq(observacionesDocente.asignaturaId, asignaturas.id))
    .where(inArray(observacionesDocente.matriculaId, matriculaIds))
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

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, parsed.data.asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(parsed.data.asignaturaId);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
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

  // Notificar a alumnos matriculados
  const [asigData] = await db
    .select({ nombre: asignaturas.nombre })
    .from(asignaturas)
    .where(eq(asignaturas.id, parsed.data.asignaturaId))
    .limit(1);

  if (asigData) {
    const alumnos = await db
      .select({ id: usuarios.id, nombre: usuarios.nombre, apellido: usuarios.apellido, email: usuarios.email })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .where(
        and(
          eq(matriculas.asignaturaId, parsed.data.asignaturaId),
          eq(matriculas.activa, true),
          isNull(matriculas.eliminadoAt),
        ),
      );

    const fechaStr = new Date(parsed.data.fecha + "T12:00:00").toLocaleDateString("es-CL", {
      day: "2-digit", month: "long", year: "numeric",
    });

    for (const alumno of alumnos) {
      if (!alumno.email) continue;
      const { subject, html } = templateClaseAgendada({
        alumnoNombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
        claseTitulo: sanitizeText(parsed.data.titulo),
        asignaturaNombre: asigData.nombre,
        fecha: fechaStr,
        hora: parsed.data.horaInicio ?? null,
      });
      sendEmail(alumno.email, subject, html).catch(() => {});
    }

    const alumnoIds = alumnos.map((a) => a.id);
    if (alumnoIds.length > 0) {
      enviarPushADestinatarios(
        alumnoIds,
        `Nueva clase: ${sanitizeText(parsed.data.titulo)}`,
        `Nueva clase en ${asigData.nombre} el ${fechaStr}${parsed.data.horaInicio ? ` a las ${parsed.data.horaInicio}` : ""}.`,
      ).catch(() => {});
    }
  }

  return { ok: true, code: "clase_docente_created" };
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

  const periodoCheck = await assertPeriodoAbiertoByClaseId(parsed.data.claseId);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
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

  const periodoCheck = await assertPeriodoAbiertoByClaseId(ctx.claseId);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
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

  const matriculaPeriodoCheck = await assertPeriodoAbiertoByMatriculaId(matriculaRow.id);
  if (!matriculaPeriodoCheck.ok) {
    return matriculaPeriodoCheck.result;
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
    .select({ id: matriculas.id, alumnoId: matriculas.alumnoId })
    .from(matriculas)
    .where(and(eq(matriculas.id, parsed.data.matriculaId), eq(matriculas.asignaturaId, parsed.data.asignaturaId)))
    .limit(1);

  if (!matriculaRow) {
    return { ok: false, code: "matricula_not_found", message: "Matrícula no encontrada." };
  }

  const periodoCheck = await assertPeriodoAbiertoByMatriculaId(matriculaRow.id);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
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

  // Push al alumno notificando la nueva nota
  enviarPushADestinatarios(
    [matriculaRow.alumnoId],
    "Nueva nota registrada",
    `Se registró una nota de ${parsed.data.nota.toFixed(1)} en tu curso.`,
  ).catch(() => {});

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

export async function eliminarClaseDocenteAction(input: {
  claseId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_clase_delete", ["docente"]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.claseId) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  const [clase] = await db
    .select({ id: clases.id, asignaturaId: clases.asignaturaId, eliminadoAt: clases.eliminadoAt })
    .from(clases)
    .where(eq(clases.id, input.claseId))
    .limit(1);

  if (!clase) return { ok: false, code: "clase_not_found", message: "Clase no encontrada." };
  if (clase.eliminadoAt) return { ok: true, code: "already_deleted" };

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, clase.asignaturaId);
  if (!isOwner) return { ok: false, code: "forbidden", message: "No tienes permiso para eliminar esta clase." };

  const periodoCheck = await assertPeriodoAbiertoByClaseId(clase.id);
  if (!periodoCheck.ok) return periodoCheck.result;

  await db.update(clases).set({ eliminadoAt: new Date(), eliminadoPor: actorResult.actor.userId }).where(eq(clases.id, input.claseId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "archivar",
    entidad: "clases",
    entidadId: input.claseId,
    exitoso: true,
  });

  return { ok: true, code: "clase_deleted" };
}

export async function eliminarClaseDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await eliminarClaseDocenteAction({ claseId: getStringField(formData, "claseId") });
  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

const eliminarNotaDocenteInputSchema = z.object({
  notaId: z.string().uuid(),
});

export async function eliminarNotaDocenteAction(input: {
  notaId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_nota_delete", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = eliminarNotaDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "invalid_input", message: "Identificador de nota invalido." };
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: notasDocente.id,
      docenteId: notasDocente.docenteId,
      matriculaId: notasDocente.matriculaId,
    })
    .from(notasDocente)
    .where(eq(notasDocente.id, parsed.data.notaId))
    .limit(1);

  if (!existing) {
    return { ok: false, code: "nota_not_found", message: "Nota no encontrada." };
  }

  if (existing.docenteId !== actorResult.actor.userId) {
    return { ok: false, code: "forbidden", message: "Solo puedes eliminar tus propias notas." };
  }

  const periodoCheck = await assertPeriodoAbiertoByMatriculaId(existing.matriculaId);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
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

const eliminarObservacionDocenteInputSchema = z.object({
  observacionId: z.string().uuid(),
});

export async function eliminarObservacionDocenteAction(input: {
  observacionId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_observacion_delete", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = eliminarObservacionDocenteInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Identificador de observacion invalido.",
    };
  }

  const db = getDb();
  const [existing] = await db
    .select({
      id: observacionesDocente.id,
      docenteId: observacionesDocente.docenteId,
      matriculaId: observacionesDocente.matriculaId,
    })
    .from(observacionesDocente)
    .where(eq(observacionesDocente.id, parsed.data.observacionId))
    .limit(1);

  if (!existing) {
    return { ok: false, code: "observacion_not_found", message: "Observacion no encontrada." };
  }

  if (existing.docenteId !== actorResult.actor.userId) {
    return {
      ok: false,
      code: "forbidden",
      message: "Solo puedes eliminar tus propias observaciones.",
    };
  }

  const periodoCheck = await assertPeriodoAbiertoByMatriculaId(existing.matriculaId);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
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

export async function importarNotasDocenteAction(formData: FormData): Promise<MutationResult> {
  const actorResult = await requireActionActor("docente_notas_import", ["docente"]);
  if (!actorResult.ok) {
    return actorResult.result;
  }

  await finalizarAsignaturasVencidas();

  const asignaturaId = getStringField(formData, "asignaturaId");
  const fechaRegistro = getStringField(formData, "fechaRegistro");
  const archivo = formData.get("archivo");

  if (!asignaturaId || !(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, code: "invalid_input", message: "Debes indicar asignatura, fecha y archivo." };
  }

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) {
    return { ok: false, code: "forbidden", message: "No autorizado para esta asignatura." };
  }

  const fecha = parseDateInput(fechaRegistro);
  if (!fecha) {
    return { ok: false, code: "invalid_date", message: "Fecha inválida." };
  }

  const lowerName = archivo.name.toLowerCase();
  if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) {
    return { ok: false, code: "invalid_type", message: "Solo se permiten archivos .csv o .xlsx." };
  }

  const db = getDb();
  const [subject] = await db
    .select({ estado: asignaturas.estado })
    .from(asignaturas)
    .where(eq(asignaturas.id, asignaturaId))
    .limit(1);

  if (!subject || subject.estado === "archivado" || subject.estado === "finalizado") {
    return { ok: false, code: "asignatura_closed", message: "La asignatura está cerrada." };
  }

  const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(asignaturaId);
  if (!periodoCheck.ok) {
    return periodoCheck.result;
  }

  try {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    const rawRows = await parseSpreadsheetRowsFromBuffer(buffer, archivo.name);

    if (rawRows.length === 0) {
      return { ok: false, code: "import_empty", message: "El archivo no contiene filas." };
    }

    const matriculasRows = await db
      .select({
        matriculaId: matriculas.id,
        alumnoRut: usuarios.rut,
      })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .where(and(eq(matriculas.asignaturaId, asignaturaId), eq(matriculas.activa, true)));

    const matriculaByRut = new Map(
      matriculasRows
        .filter((row) => row.alumnoRut)
        .flatMap((row) => {
          const rut = row.alumnoRut as string;
          const clean = normalizeRutLike(rut);
          const plainForeign = clean.startsWith("EXT-") ? clean.replace(/^EXT-/, "") : null;
          return [
            [clean, row.matriculaId] as const,
            ...(plainForeign ? ([[plainForeign, row.matriculaId]] as const) : []),
          ];
        }),
    );

    let inserted = 0;
    const anioRegistro = fecha.getUTCFullYear();

    for (const row of rawRows) {
      const mapped = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), String(value).trim()]),
      );

      const rut = mapped.rut || mapped.identificador || mapped.credencial || "";
      const notaRaw = mapped.nota || mapped.calificacion || mapped.score || "";
      const rowFecha = mapped.fecharegistro || mapped.fecha || fechaRegistro;
      const nota = Number.parseFloat(notaRaw.replace(",", "."));
      const matriculaId = matriculaByRut.get(normalizeRutLike(rut));

      if (!matriculaId || !Number.isFinite(nota) || nota < 1 || nota > 7) {
        continue;
      }

      await db.insert(notasDocente).values({
        docenteId: actorResult.actor.userId,
        asignaturaId,
        matriculaId,
        nota: nota.toFixed(1),
        fechaRegistro: rowFecha,
        anioRegistro,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      inserted += 1;
    }

    if (inserted === 0) {
      return {
        ok: false,
        code: "import_no_valid_rows",
        message: "No se encontraron filas válidas. Usa columnas rut y nota.",
      };
    }

    return { ok: true, code: "notas_imported" };
  } catch {
    return { ok: false, code: "import_failed", message: "No fue posible importar las notas." };
  }
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

export async function importarNotasDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await importarNotasDocenteAction(formData);

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

export async function eliminarNotaDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await eliminarNotaDocenteAction({
    notaId: getStringField(formData, "notaId"),
  });

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

export async function eliminarObservacionDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const result = await eliminarObservacionDocenteAction({
    observacionId: getStringField(formData, "observacionId"),
  });

  revalidatePath("/docente/asignaturas");
  redirect(`/docente/asignaturas?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

// ─── Asistencia calendar & fidelidad ────────────────────────────────────────

export type AlumnoAsistenciaItem = {
  matriculaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
};

export type ClaseMes = {
  id: string;
  titulo: string;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  sala: string | null;
  numeroSesion: number;
  asignaturaId: string;
  asignaturaNombre: string;
  alumnos: AlumnoAsistenciaItem[];
};

export async function listarClasesMesDocente(anio: number, mes: number): Promise<ClaseMes[]> {
  const actorResult = await requireActionActor("docente_clases_mes", ["docente"]);
  if (!actorResult.ok) return [];

  const mm = String(mes).padStart(2, "0");
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const fechaInicio = `${anio}-${mm}-01`;
  const fechaFin = `${anio}-${mm}-${String(ultimoDia).padStart(2, "0")}`;

  const db = getDb();

  const clasesRows = await db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      fecha: clases.fecha,
      horaInicio: clases.horaInicio,
      horaFin: clases.horaFin,
      sala: clases.sala,
      numeroSesion: clases.numeroSesion,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(asignaturas.docenteId, actorResult.actor.userId),
        isNull(clases.eliminadoAt),
        gte(clases.fecha, fechaInicio),
        lte(clases.fecha, fechaFin),
      ),
    )
    .orderBy(asc(clases.fecha), asc(clases.horaInicio));

  if (clasesRows.length === 0) return [];

  const claseIds = clasesRows.map((c) => c.id);
  const asignaturaIds = [...new Set(clasesRows.map((c) => c.asignaturaId))];

  const matriculasRows = await db
    .select({
      matriculaId: matriculas.id,
      asignaturaId: matriculas.asignaturaId,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(
      and(
        inArray(matriculas.asignaturaId, asignaturaIds),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  const asistenciaRows = await db
    .select({
      claseId: asistencia.claseId,
      matriculaId: asistencia.matriculaId,
      estado: asistencia.estado,
    })
    .from(asistencia)
    .where(inArray(asistencia.claseId, claseIds));

  const asistenciaMap = new Map<string, "presente" | "ausente" | "tardanza" | "justificado" | null>();
  for (const a of asistenciaRows) {
    asistenciaMap.set(`${a.claseId}::${a.matriculaId}`, a.estado);
  }

  return clasesRows.map((clase) => ({
    ...clase,
    alumnos: matriculasRows
      .filter((m) => m.asignaturaId === clase.asignaturaId)
      .map((m) => ({
        matriculaId: m.matriculaId,
        alumnoNombre: m.alumnoNombre,
        alumnoApellido: m.alumnoApellido,
        alumnoRut: m.alumnoRut,
        estado: asistenciaMap.get(`${clase.id}::${m.matriculaId}`) ?? null,
      })),
  }));
}

export type SesionFidelidad = {
  claseId: string;
  numeroSesion: number;
  fecha: string;
  titulo: string;
  estado: "presente" | "ausente" | "tardanza" | "justificado" | null;
};

export type AlumnoFidelidad = {
  matriculaId: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  sesiones: SesionFidelidad[];
  presente: number;
  totalClases: number;
};

export async function listarFidelidadDocente(asignaturaId: string): Promise<AlumnoFidelidad[]> {
  const actorResult = await requireActionActor("docente_fidelidad", ["docente"]);
  if (!actorResult.ok || !asignaturaId) return [];

  const isOwner = await assertDocenteOwnsAsignatura(actorResult.actor.userId, asignaturaId);
  if (!isOwner) return [];

  const db = getDb();

  const clasesRows = await db
    .select({
      id: clases.id,
      titulo: clases.titulo,
      fecha: clases.fecha,
      numeroSesion: clases.numeroSesion,
    })
    .from(clases)
    .where(and(eq(clases.asignaturaId, asignaturaId), isNull(clases.eliminadoAt)))
    .orderBy(asc(clases.numeroSesion));

  const matriculasRows = await db
    .select({
      matriculaId: matriculas.id,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(matriculas)
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(
      and(
        eq(matriculas.asignaturaId, asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  if (matriculasRows.length === 0 || clasesRows.length === 0) return [];

  const claseIds = clasesRows.map((c) => c.id);

  const asistenciaRows = await db
    .select({
      claseId: asistencia.claseId,
      matriculaId: asistencia.matriculaId,
      estado: asistencia.estado,
    })
    .from(asistencia)
    .where(inArray(asistencia.claseId, claseIds));

  const asistenciaMap = new Map<string, "presente" | "ausente" | "tardanza" | "justificado" | null>();
  for (const a of asistenciaRows) {
    asistenciaMap.set(`${a.claseId}::${a.matriculaId}`, a.estado);
  }

  return matriculasRows.map((m) => {
    const sesiones: SesionFidelidad[] = clasesRows.map((c) => ({
      claseId: c.id,
      numeroSesion: c.numeroSesion,
      fecha: c.fecha,
      titulo: c.titulo,
      estado: asistenciaMap.get(`${c.id}::${m.matriculaId}`) ?? null,
    }));
    const presente = sesiones.filter(
      (s) => s.estado === "presente" || s.estado === "tardanza",
    ).length;
    return {
      matriculaId: m.matriculaId,
      alumnoNombre: m.alumnoNombre,
      alumnoApellido: m.alumnoApellido,
      alumnoRut: m.alumnoRut,
      sesiones,
      presente,
      totalClases: clasesRows.length,
    };
  });
}
