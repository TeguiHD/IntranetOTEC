"use server";

import { existsSync } from "node:fs";
import { join } from "node:path";

import { and, asc, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  asignaturas,
  auditLogs,
  evaluacionDestinatarios,
  evaluacionIntentos,
  evaluaciones,
  eventosSupervision,
  matriculas,
  notas,
  preguntas,
  respuestasFormulario,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sendEmail, templateEvaluacionPublicada } from "@/lib/email";
import { enviarPushADestinatarios } from "@/actions/notificaciones";
import { stripCorrectAnswer } from "@/lib/evaluation-options";
import { getEvaluationWindowStatus, type EvaluationWindowStatus } from "@/lib/evaluation-status";
import { logEvent } from "@/lib/observability/logger";
import {
  listLocalPruebaFiles,
  readLocalPrueba,
  type LocalPruebaParsed,
} from "@/lib/local-pruebas";
import { sanitizeText } from "@/lib/sanitize";
import {
  SURVEY_TEMPLATE_DEFINITIONS,
  SURVEY_TEMPLATE_KEYS,
  coerceScaleQuestionOptions,
  getTemplateScaleOptions,
  isMandatorySurveyTitle,
  parseScaleAnswer,
  type SurveyTemplateKey,
} from "@/lib/surveyTemplates";

import {
  assertPeriodoAbiertoByAsignaturaId,
  assertPeriodoAbiertoByEvaluacionId,
} from "./_period-lock";
import {
  requireActionCapability,
  type ActionActorContext,
  type MutationResult,
} from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const clean = sanitizeText(value).replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : undefined;
};

const sanitizeRespuesta = (value: string): string =>
  sanitizeText(value).replace(/\s+/g, " ").trim().slice(0, 2000);

const plantillaEncuestaInputSchema = z.object({
  asignaturaId: z.string().uuid(),
  plantilla: z.enum(SURVEY_TEMPLATE_KEYS),
});

const localPruebasRoot = join(process.cwd(), "PRUEBAS");
const _localPruebasCache: { result: PruebaLocalItem[]; cachedAt: number } = { result: [], cachedAt: 0 };
const LOCAL_PRUEBAS_CACHE_TTL_MS = 60_000;

const _supervisionEventLog = new Map<string, number[]>();
const SUPERVISION_RATE_LIMIT = 60;
const SUPERVISION_RATE_WINDOW_MS = 60_000;

function checkSupervisionRateLimit(userId: string, evaluacionId: string): boolean {
  const key = `${userId}:${evaluacionId}`;
  const now = Date.now();
  const windowStart = now - SUPERVISION_RATE_WINDOW_MS;
  const existing = (_supervisionEventLog.get(key) ?? []).filter((t) => t > windowStart);
  if (existing.length >= SUPERVISION_RATE_LIMIT) return false;
  existing.push(now);
  _supervisionEventLog.set(key, existing);
  // Prune map if it grows too large
  if (_supervisionEventLog.size > 10_000) {
    for (const [k, timestamps] of _supervisionEventLog) {
      if (timestamps.every((t) => t <= windowStart)) _supervisionEventLog.delete(k);
    }
  }
  return true;
}

function buildLocalPruebasCached(): PruebaLocalItem[] {
  const now = Date.now();
  if (now - _localPruebasCache.cachedAt < LOCAL_PRUEBAS_CACHE_TTL_MS) {
    return _localPruebasCache.result;
  }
  if (!existsSync(localPruebasRoot)) {
    _localPruebasCache.result = [];
    _localPruebasCache.cachedAt = now;
    return [];
  }
  const files = listLocalPruebaFiles(localPruebasRoot);
  const result: PruebaLocalItem[] = [];
  for (const archivo of files) {
    try {
      const parsed = readLocalPrueba(localPruebasRoot, archivo);
      result.push({
        id: parsed.id,
        titulo: parsed.titulo,
        archivo: parsed.archivo,
        puntajeTotal: parsed.puntajeTotal,
        resumen: parsed.resumen,
        totalPreguntas: parsed.preguntas.length,
      });
    } catch {
      // Skip unparseable files — don't crash the whole list
    }
  }
  _localPruebasCache.result = result;
  _localPruebasCache.cachedAt = now;
  return result;
}

const DEFAULT_EVALUACIONES_REDIRECT = "/admin/evaluaciones";

const sanitizeEvaluacionesRedirect = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return DEFAULT_EVALUACIONES_REDIRECT;
  if (trimmed.startsWith("/admin/evaluaciones") || trimmed.startsWith("/docente/asignaturas/")) {
    return trimmed;
  }

  return DEFAULT_EVALUACIONES_REDIRECT;
};

const redirectEvaluacionesForm = (input: {
  redirectTo?: string;
  state: string;
  periodoId?: string;
  asignaturaId?: string;
  evaluacionId?: string;
}): never => {
  const base = sanitizeEvaluacionesRedirect(input.redirectTo ?? DEFAULT_EVALUACIONES_REDIRECT);
  const [pathname, search = ""] = base.split("?");
  const query = new URLSearchParams(search);

  query.set("state", input.state);
  if (input.periodoId) query.set("periodoId", input.periodoId);
  if (input.asignaturaId) query.set("asignaturaId", input.asignaturaId);
  if (input.evaluacionId) query.set("evaluacionId", input.evaluacionId);

  redirect(`${pathname}?${query.toString()}`);
};

export type EvaluacionItem = {
  id: string;
  asignaturaId: string;
  titulo: string;
  tipo: "formulario" | "tarea" | "examen" | "proyecto";
  ponderacion: string | null;
  instrucciones: string | null;
  intentosMax: number | null;
  duracionMinutos: number | null;
  fechaInicio: Date | null;
  fechaLimite: Date | null;
  publicada: boolean | null;
  modoSupervision: boolean | null;
  mostrarResultados: boolean | null;
  asignaturaNombre: string;
  totalPreguntas: number;
  estadoVentana: EvaluationWindowStatus;
  totalRespondidas: number;
  totalCalificadas: number;
  totalDestinatarios: number;
  destinatariosPersonalizados: boolean;
  notaAlumno: string | null;
  respondidaPorAlumno: boolean;
};

export type IntentoEvaluacionActivo = {
  intentoId: string;
  intento: number;
  iniciadoAt: Date;
  prorrogadaAt: Date | null;
  expiracionAt: Date | null;
};

export type PreguntaItem = {
  id: string;
  evaluacionId: string;
  enunciado: string;
  tipo: "opcion_multiple" | "verdadero_falso" | "respuesta_corta" | "desarrollo" | "likert" | "si_no" | "texto_libre";
  opciones: unknown;
  puntaje: string | null;
  orden: number | null;
};

export type EventoSupervisionItem = {
  id: string;
  tipo: string;
  payload: unknown;
  createdAt: Date | null;
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
};

export type RespuestaPendienteItem = {
  respuestaId: string;
  matriculaId: string;
  preguntaId: string;
  enunciado: string;
  tipo: string;
  respuesta: string | null;
  intento: number | null;
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
  notaActual: string | null;
  esCorrecta: boolean | null;
};

export type IntentoRecuperableItem = {
  intentoId: string;
  matriculaId: string;
  intento: number;
  iniciadoAt: Date;
  prorrogadaAt: Date | null;
  expiradoAt: Date | null;
  enviadoAt: Date | null;
  anuladoAt: Date | null;
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
  estado: "activo" | "expirado" | "enviado" | "anulado";
};

export type EvaluacionParticipacionItem = {
  matriculaId: string;
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
  estado: "no_iniciado" | "en_curso" | "expirado" | "enviado" | "anulado";
  ultimoIntento: number | null;
  respuestasCount: number;
  nota: string | null;
  ultimaActividadAt: Date | null;
  destinatarioAsignado: boolean;
};

export type RespuestaArchivoPregunta = {
  respuestaId: string;
  preguntaId: string;
  enunciado: string;
  tipo: string;
  respuesta: string | null;
  opciones: unknown;
  esCorrecta: boolean | null;
  intento: number | null;
  createdAt: Date | null;
};

export type RespuestasArchivoAlumno = {
  matriculaId: string;
  alumnoNombre: string | null;
  alumnoApellido: string | null;
  alumnoRut: string | null;
  nota: string | null;
  observacion: string | null;
  ultimaRespuestaAt: Date | null;
  respuestas: RespuestaArchivoPregunta[];
};

export type PruebaLocalItem = Pick<
  LocalPruebaParsed,
  "id" | "titulo" | "archivo" | "puntajeTotal" | "resumen"
> & {
  totalPreguntas: number;
};

type AsignaturaAccessRow = {
  id: string;
  docenteId: string | null;
  estado: typeof asignaturas.$inferSelect.estado;
};

type EvaluacionAccessRow = {
  id: string;
  asignaturaId: string;
  docenteId: string | null;
};

const actorCanManageAsignatura = (
  actor: ActionActorContext,
  asignatura: Pick<AsignaturaAccessRow, "docenteId">,
): boolean =>
  actor.userRol === "admin" ||
  (actor.userRol === "docente" &&
    asignatura.docenteId !== null &&
    asignatura.docenteId === actor.userId);

const actorCanManageEvaluacion = (
  actor: ActionActorContext,
  evaluacion: Pick<EvaluacionAccessRow, "docenteId">,
): boolean =>
  actor.userRol === "admin" ||
  (actor.userRol === "docente" &&
    evaluacion.docenteId !== null &&
    evaluacion.docenteId === actor.userId);

const getAsignaturaAccessRow = async (
  asignaturaId: string,
): Promise<AsignaturaAccessRow | null> => {
  const db = getDb();
  const [row] = await db
    .select({
      id: asignaturas.id,
      docenteId: asignaturas.docenteId,
      estado: asignaturas.estado,
    })
    .from(asignaturas)
    .where(eq(asignaturas.id, asignaturaId))
    .limit(1);

  return row ?? null;
};

const getEvaluacionAccessRow = async (
  evaluacionId: string,
): Promise<EvaluacionAccessRow | null> => {
  const db = getDb();
  const [row] = await db
    .select({
      id: evaluaciones.id,
      asignaturaId: evaluaciones.asignaturaId,
      docenteId: asignaturas.docenteId,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(and(eq(evaluaciones.id, evaluacionId), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  return row ?? null;
};

const listarDestinatariosByEvaluacionIds = async (
  evaluacionIds: string[],
): Promise<Map<string, Set<string>>> => {
  if (evaluacionIds.length === 0) return new Map();
  const db = getDb();
  const rows = await db
    .select({
      evaluacionId: evaluacionDestinatarios.evaluacionId,
      matriculaId: evaluacionDestinatarios.matriculaId,
    })
    .from(evaluacionDestinatarios)
    .where(inArray(evaluacionDestinatarios.evaluacionId, evaluacionIds));

  const byEvaluacion = new Map<string, Set<string>>();
  for (const row of rows) {
    const current = byEvaluacion.get(row.evaluacionId) ?? new Set<string>();
    current.add(row.matriculaId);
    byEvaluacion.set(row.evaluacionId, current);
  }
  return byEvaluacion;
};

const matriculaHabilitadaParaEvaluacion = async (
  evaluacionId: string,
  matriculaId: string,
): Promise<boolean> => {
  const db = getDb();
  const [firstRecipient] = await db
    .select({ id: evaluacionDestinatarios.id })
    .from(evaluacionDestinatarios)
    .where(eq(evaluacionDestinatarios.evaluacionId, evaluacionId))
    .limit(1);

  if (!firstRecipient) return true;

  const [recipient] = await db
    .select({ id: evaluacionDestinatarios.id })
    .from(evaluacionDestinatarios)
    .where(
      and(
        eq(evaluacionDestinatarios.evaluacionId, evaluacionId),
        eq(evaluacionDestinatarios.matriculaId, matriculaId),
      ),
    )
    .limit(1);

  return Boolean(recipient);
};

const forbiddenMutationResult = (message = "No autorizado para esta acción."): MutationResult => ({
  ok: false,
  code: "forbidden",
  message,
});

const fetchPreguntasByEvaluacion = async (
  evaluacionId: string,
): Promise<PreguntaItem[]> => {
  const db = getDb();

  return db
    .select({
      id: preguntas.id,
      evaluacionId: preguntas.evaluacionId,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      opciones: preguntas.opciones,
      puntaje: preguntas.puntaje,
      orden: preguntas.orden,
    })
    .from(preguntas)
    .where(and(eq(preguntas.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)))
    .orderBy(asc(preguntas.orden), asc(preguntas.id));
};

export async function listarEvaluacionesByAsignatura(
  asignaturaId: string,
): Promise<EvaluacionItem[]> {
  const actorResult = await requireActionCapability("evaluacion_list", [
    "evaluaciones.read_admin",
    "evaluaciones.read_assigned",
  ]);
  if (!actorResult.ok) return [];

  const asignatura = await getAsignaturaAccessRow(asignaturaId);
  if (!asignatura || !actorCanManageAsignatura(actorResult.actor, asignatura)) {
    return [];
  }

  const db = getDb();

  const rows = await db
    .select({
      id: evaluaciones.id,
      asignaturaId: evaluaciones.asignaturaId,
      titulo: evaluaciones.titulo,
      tipo: evaluaciones.tipo,
      ponderacion: evaluaciones.ponderacion,
      instrucciones: evaluaciones.instrucciones,
      intentosMax: evaluaciones.intentosMax,
      duracionMinutos: evaluaciones.duracionMinutos,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      publicada: evaluaciones.publicada,
      modoSupervision: evaluaciones.modoSupervision,
      mostrarResultados: evaluaciones.mostrarResultados,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(eq(evaluaciones.asignaturaId, asignaturaId), isNull(evaluaciones.eliminadoAt)),
    )
    .orderBy(asc(evaluaciones.fechaLimite), asc(evaluaciones.createdAt));

  if (rows.length === 0) return [];

  const counts = await db
    .select({
      evaluacionId: preguntas.evaluacionId,
      total: count(),
    })
    .from(preguntas)
    .where(isNull(preguntas.eliminadoAt))
    .groupBy(preguntas.evaluacionId);

  const respuestasCounts = await db
    .select({
      evaluacionId: respuestasFormulario.evaluacionId,
      total: sql<number>`count(distinct ${respuestasFormulario.matriculaId})`,
    })
    .from(respuestasFormulario)
    .groupBy(respuestasFormulario.evaluacionId);

  const notasCounts = await db
    .select({
      evaluacionId: notas.evaluacionId,
      total: sql<number>`count(distinct ${notas.matriculaId})`,
    })
    .from(notas)
    .where(isNull(notas.eliminadoAt))
    .groupBy(notas.evaluacionId);

  const countMap = new Map(counts.map((c) => [c.evaluacionId, Number(c.total)]));
  const respuestaMap = new Map(
    respuestasCounts.map((item) => [item.evaluacionId, Number(item.total)]),
  );
  const notaMap = new Map(notasCounts.map((item) => [item.evaluacionId, Number(item.total)]));
  const destinatariosMap = await listarDestinatariosByEvaluacionIds(rows.map((r) => r.id));

  return rows.map((r) => ({
    ...r,
    totalPreguntas: countMap.get(r.id) ?? 0,
    estadoVentana: getEvaluationWindowStatus({
      publicada: r.publicada,
      fechaInicio: r.fechaInicio,
      fechaLimite: r.fechaLimite,
    }),
    totalRespondidas: respuestaMap.get(r.id) ?? 0,
    totalCalificadas: notaMap.get(r.id) ?? 0,
    totalDestinatarios: destinatariosMap.get(r.id)?.size ?? 0,
    destinatariosPersonalizados: destinatariosMap.has(r.id),
    notaAlumno: null,
    respondidaPorAlumno: false,
  }));
}

export async function listarEvaluacionesAlumno(): Promise<EvaluacionItem[]> {
  const actorResult = await requireActionCapability(
    "alumno_evaluacion_list",
    "evaluaciones.read_own",
  );
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: evaluaciones.id,
      asignaturaId: evaluaciones.asignaturaId,
      titulo: evaluaciones.titulo,
      tipo: evaluaciones.tipo,
      ponderacion: evaluaciones.ponderacion,
      instrucciones: evaluaciones.instrucciones,
      intentosMax: evaluaciones.intentosMax,
      duracionMinutos: evaluaciones.duracionMinutos,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      publicada: evaluaciones.publicada,
      modoSupervision: evaluaciones.modoSupervision,
      mostrarResultados: evaluaciones.mostrarResultados,
      asignaturaNombre: asignaturas.nombre,
      matriculaId: matriculas.id,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .innerJoin(matriculas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(
      and(
        eq(usuarios.id, actorResult.actor.userId),
        eq(evaluaciones.publicada, true),
        isNull(evaluaciones.eliminadoAt),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(asc(evaluaciones.fechaLimite), asc(evaluaciones.createdAt));

  if (rows.length === 0) return [];

  const counts = await db
    .select({
      evaluacionId: preguntas.evaluacionId,
      total: count(),
    })
    .from(preguntas)
    .where(isNull(preguntas.eliminadoAt))
    .groupBy(preguntas.evaluacionId);

  const respuestasAlumno = await db
    .select({
      evaluacionId: respuestasFormulario.evaluacionId,
      total: sql<number>`count(distinct ${respuestasFormulario.matriculaId})`,
    })
    .from(respuestasFormulario)
    .innerJoin(matriculas, eq(respuestasFormulario.matriculaId, matriculas.id))
    .where(eq(matriculas.alumnoId, actorResult.actor.userId))
    .groupBy(respuestasFormulario.evaluacionId);

  const notasAlumno = await db
    .select({
      evaluacionId: notas.evaluacionId,
      nota: notas.nota,
    })
    .from(notas)
    .innerJoin(matriculas, eq(notas.matriculaId, matriculas.id))
    .where(
      and(eq(matriculas.alumnoId, actorResult.actor.userId), isNull(notas.eliminadoAt)),
    );

  const destinatariosMap = await listarDestinatariosByEvaluacionIds(rows.map((r) => r.id));
  const visibleRows = rows.filter((r) => {
    const destinatarios = destinatariosMap.get(r.id);
    return !destinatarios || destinatarios.has(r.matriculaId);
  });
  if (visibleRows.length === 0) return [];

  const countMap = new Map(counts.map((c) => [c.evaluacionId, Number(c.total)]));
  const respuestaMap = new Map(
    respuestasAlumno.map((item) => [item.evaluacionId, Number(item.total)]),
  );
  const notaMap = new Map(notasAlumno.map((item) => [item.evaluacionId, item.nota ?? null]));

  return visibleRows.map((row) => ({
    id: row.id,
    asignaturaId: row.asignaturaId,
    titulo: row.titulo,
    tipo: row.tipo,
    ponderacion: row.ponderacion,
    instrucciones: row.instrucciones,
    intentosMax: row.intentosMax,
    duracionMinutos: row.duracionMinutos,
    fechaInicio: row.fechaInicio,
    fechaLimite: row.fechaLimite,
    publicada: row.publicada,
    modoSupervision: row.modoSupervision,
    mostrarResultados: row.mostrarResultados,
    asignaturaNombre: row.asignaturaNombre,
    totalPreguntas: countMap.get(row.id) ?? 0,
    estadoVentana: getEvaluationWindowStatus({
      publicada: row.publicada,
      fechaInicio: row.fechaInicio,
      fechaLimite: row.fechaLimite,
    }),
    totalRespondidas: 0,
    totalCalificadas: notaMap.get(row.id) ? 1 : 0,
    totalDestinatarios: destinatariosMap.get(row.id)?.size ?? 0,
    destinatariosPersonalizados: destinatariosMap.has(row.id),
    notaAlumno: notaMap.get(row.id) ?? null,
    respondidaPorAlumno: (respuestaMap.get(row.id) ?? 0) > 0,
  }));
}

export async function listarPreguntasByEvaluacion(
  evaluacionId: string,
): Promise<PreguntaItem[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_preguntas_list",
    "evaluaciones.read_answer_key",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return [];
  }

  return fetchPreguntasByEvaluacion(evaluacionId);
}

export async function listarPreguntasAlumnoByEvaluacion(
  evaluacionId: string,
): Promise<PreguntaItem[]> {
  const actorResult = await requireActionCapability(
    "alumno_evaluacion_preguntas_list",
    "evaluaciones.respond",
  );
  if (!actorResult.ok) return [];

  const db = getDb();

  const [ev] = await db
    .select({ id: evaluaciones.id, matriculaId: matriculas.id })
    .from(evaluaciones)
    .innerJoin(matriculas, eq(matriculas.asignaturaId, evaluaciones.asignaturaId))
    .where(
      and(
        eq(evaluaciones.id, evaluacionId),
        eq(evaluaciones.publicada, true),
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(evaluaciones.eliminadoAt),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!ev) return [];
  if (!(await matriculaHabilitadaParaEvaluacion(evaluacionId, ev.matriculaId))) return [];

  const rows = await fetchPreguntasByEvaluacion(evaluacionId);
  return rows.map((pregunta) => ({
    ...pregunta,
    opciones: stripCorrectAnswer(pregunta.opciones),
  }));
}

export async function asegurarIntentoEvaluacionActivo(
  evaluacionId: string,
): Promise<IntentoEvaluacionActivo | null> {
  const actorResult = await requireActionCapability(
    "alumno_evaluacion_intento_start",
    "evaluaciones.respond",
  );
  if (!actorResult.ok || !evaluacionId) return null;

  const db = getDb();
  const now = new Date();

  const [ev] = await db
    .select({
      id: evaluaciones.id,
      asignaturaId: evaluaciones.asignaturaId,
      publicada: evaluaciones.publicada,
      intentosMax: evaluaciones.intentosMax,
      duracionMinutos: evaluaciones.duracionMinutos,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
    })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.id, evaluacionId), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  if (!ev || !ev.publicada || !ev.duracionMinutos) return null;
  if (ev.fechaInicio && ev.fechaInicio > now) return null;
  if (ev.fechaLimite && ev.fechaLimite < now) return null;

  const [matricula] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.asignaturaId, ev.asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matricula) return null;
  if (!(await matriculaHabilitadaParaEvaluacion(evaluacionId, matricula.id))) return null;

  const [activeAttempt] = await db
    .select({
      id: evaluacionIntentos.id,
      intento: evaluacionIntentos.intento,
      iniciadoAt: evaluacionIntentos.iniciadoAt,
      prorrogadaAt: evaluacionIntentos.prorrogadaAt,
    })
    .from(evaluacionIntentos)
    .where(
      and(
        eq(evaluacionIntentos.evaluacionId, evaluacionId),
        eq(evaluacionIntentos.matriculaId, matricula.id),
        isNull(evaluacionIntentos.enviadoAt),
        isNull(evaluacionIntentos.expiradoAt),
        isNull(evaluacionIntentos.anuladoAt),
      ),
    )
    .orderBy(desc(evaluacionIntentos.intento))
    .limit(1);

  if (activeAttempt) {
    const baseTime = activeAttempt.prorrogadaAt ?? activeAttempt.iniciadoAt;
    const expiracionAt = new Date(baseTime.getTime() + ev.duracionMinutos * 60_000);
    if (expiracionAt > now) {
      return {
        intentoId: activeAttempt.id,
        intento: activeAttempt.intento,
        iniciadoAt: activeAttempt.iniciadoAt,
        prorrogadaAt: activeAttempt.prorrogadaAt,
        expiracionAt,
      };
    }

    await db
      .update(evaluacionIntentos)
      .set({ expiradoAt: now })
      .where(eq(evaluacionIntentos.id, activeAttempt.id));
  }

  const [maxIntentosRow] = await db
    .select({
      intentosUsados: sql<number>`greatest(
        coalesce((select max(i.intento) from evaluacion_intentos i where i.evaluacion_id = ${evaluacionId} and i.matricula_id = ${matricula.id} and i.anulado_at is null), 0),
        coalesce((select max(r.intento) from respuestas_formulario r where r.evaluacion_id = ${evaluacionId} and r.matricula_id = ${matricula.id}), 0)
      )`.mapWith(Number),
      nextIntento: sql<number>`greatest(
        coalesce((select max(i.intento) from evaluacion_intentos i where i.evaluacion_id = ${evaluacionId} and i.matricula_id = ${matricula.id}), 0),
        coalesce((select max(r.intento) from respuestas_formulario r where r.evaluacion_id = ${evaluacionId} and r.matricula_id = ${matricula.id}), 0)
      ) + 1`.mapWith(Number),
    })
    .from(matriculas)
    .where(eq(matriculas.id, matricula.id))
    .limit(1);

  const intentosUsados = Number(maxIntentosRow?.intentosUsados ?? 0);
  const intentosMax = ev.intentosMax ?? 1;
  if (intentosUsados >= intentosMax) return null;

  const nextIntento = Number(maxIntentosRow?.nextIntento ?? intentosUsados + 1);
  const [created] = await db
    .insert(evaluacionIntentos)
    .values({
      evaluacionId,
      matriculaId: matricula.id,
      intento: nextIntento,
      iniciadoAt: now,
    })
    .returning({
      id: evaluacionIntentos.id,
      intento: evaluacionIntentos.intento,
      iniciadoAt: evaluacionIntentos.iniciadoAt,
      prorrogadaAt: evaluacionIntentos.prorrogadaAt,
    });

  return created
    ? {
        intentoId: created.id,
        intento: created.intento,
        iniciadoAt: created.iniciadoAt,
        prorrogadaAt: created.prorrogadaAt,
        expiracionAt: new Date(created.iniciadoAt.getTime() + ev.duracionMinutos * 60_000),
      }
    : null;
}

export async function listarEventosSupervisionByEvaluacion(
  evaluacionId: string,
): Promise<EventoSupervisionItem[]> {
  const actorResult = await requireActionCapability(
    "supervision_eventos_list",
    "evaluaciones.read_supervision",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: eventosSupervision.id,
      tipo: eventosSupervision.tipo,
      payload: eventosSupervision.payload,
      createdAt: eventosSupervision.createdAt,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(eventosSupervision)
    .leftJoin(matriculas, eq(eventosSupervision.matriculaId, matriculas.id))
    .leftJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(eq(eventosSupervision.evaluacionId, evaluacionId))
    .orderBy(asc(eventosSupervision.createdAt));
}

export async function listarPruebasLocalesAction(): Promise<PruebaLocalItem[]> {
  const actorResult = await requireActionCapability(
    "pruebas_locales_list",
    "evaluaciones.import_local",
  );
  if (!actorResult.ok) return [];
  return buildLocalPruebasCached();
}

export async function obtenerResultadosEvaluacion(evaluacionId: string) {
  const actorResult = await requireActionCapability(
    "evaluacion_resultados",
    "evaluaciones.read_results",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return [];
  }

  const db = getDb();

  const notasRows = await db
    .select({
      matriculaId: notas.matriculaId,
      nota: notas.nota,
      observacion: notas.observacion,
      fechaNota: notas.fechaNota,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(notas)
    .innerJoin(matriculas, eq(notas.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(and(eq(notas.evaluacionId, evaluacionId), isNull(notas.eliminadoAt)))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  const respuestasRows = await db
    .select({
      matriculaId: respuestasFormulario.matriculaId,
      fechaRespuesta: sql<Date>`max(${respuestasFormulario.createdAt})`,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(respuestasFormulario)
    .innerJoin(matriculas, eq(respuestasFormulario.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(eq(respuestasFormulario.evaluacionId, evaluacionId))
    .groupBy(
      respuestasFormulario.matriculaId,
      usuarios.nombre,
      usuarios.apellido,
      usuarios.rut,
    );

  const resultMap = new Map(notasRows.map((row) => [row.matriculaId, row]));
  for (const row of respuestasRows) {
    if (resultMap.has(row.matriculaId)) continue;
    resultMap.set(row.matriculaId, {
      matriculaId: row.matriculaId,
      nota: null,
      observacion: null,
      fechaNota: row.fechaRespuesta,
      alumnoNombre: row.alumnoNombre,
      alumnoApellido: row.alumnoApellido,
      alumnoRut: row.alumnoRut,
    });
  }

  return Array.from(resultMap.values()).sort((a, b) =>
    `${a.alumnoApellido} ${a.alumnoNombre}`.localeCompare(
      `${b.alumnoApellido} ${b.alumnoNombre}`,
      "es",
    ),
  );
}

export async function listarRespuestasArchivoEvaluacion(
  evaluacionId: string,
): Promise<RespuestasArchivoAlumno[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_respuestas_archivo",
    "evaluaciones.read_results",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) return [];

  const db = getDb();
  const rows = await db
    .select({
      respuestaId: respuestasFormulario.id,
      matriculaId: respuestasFormulario.matriculaId,
      preguntaId: respuestasFormulario.preguntaId,
      respuesta: respuestasFormulario.respuesta,
      esCorrecta: respuestasFormulario.esCorrecta,
      intento: respuestasFormulario.intento,
      createdAt: respuestasFormulario.createdAt,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      opciones: preguntas.opciones,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      nota: notas.nota,
      observacion: notas.observacion,
    })
    .from(respuestasFormulario)
    .innerJoin(preguntas, eq(respuestasFormulario.preguntaId, preguntas.id))
    .innerJoin(matriculas, eq(respuestasFormulario.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .leftJoin(
      notas,
      and(
        eq(notas.evaluacionId, respuestasFormulario.evaluacionId),
        eq(notas.matriculaId, respuestasFormulario.matriculaId),
        isNull(notas.eliminadoAt),
      ),
    )
    .where(and(eq(respuestasFormulario.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre), asc(respuestasFormulario.intento), asc(preguntas.orden));

  const byAlumno = new Map<string, RespuestasArchivoAlumno>();
  for (const row of rows) {
    const entry = byAlumno.get(row.matriculaId) ?? {
      matriculaId: row.matriculaId,
      alumnoNombre: row.alumnoNombre,
      alumnoApellido: row.alumnoApellido,
      alumnoRut: row.alumnoRut,
      nota: row.nota,
      observacion: row.observacion,
      ultimaRespuestaAt: null,
      respuestas: [],
    };

    const createdAt = row.createdAt ?? null;
    if (
      createdAt &&
      (!entry.ultimaRespuestaAt || createdAt.getTime() > entry.ultimaRespuestaAt.getTime())
    ) {
      entry.ultimaRespuestaAt = createdAt;
    }

    entry.respuestas.push({
      respuestaId: row.respuestaId,
      preguntaId: row.preguntaId,
      enunciado: row.enunciado,
      tipo: row.tipo,
      respuesta: row.respuesta,
      opciones: row.opciones,
      esCorrecta: row.esCorrecta,
      intento: row.intento,
      createdAt,
    });
    byAlumno.set(row.matriculaId, entry);
  }

  return Array.from(byAlumno.values());
}

export async function listarParticipacionEvaluacion(
  evaluacionId: string,
): Promise<EvaluacionParticipacionItem[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_participacion_list",
    "evaluaciones.read_results",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) return [];

  const db = getDb();
  const latestAttemptId = sql`(
    select i.id
    from evaluacion_intentos i
    where i.evaluacion_id = ${evaluacionId}
      and i.matricula_id = ${matriculas.id}
    order by i.intento desc
    limit 1
  )`;

  const rows = await db
    .select({
      matriculaId: matriculas.id,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      estado: sql<EvaluacionParticipacionItem["estado"]>`case
        when exists (
          select 1 from respuestas_formulario r
          where r.evaluacion_id = ${evaluacionId}
            and r.matricula_id = ${matriculas.id}
        ) then 'enviado'
        when exists (
          select 1 from evaluacion_intentos i
          where i.id = ${latestAttemptId}
            and i.anulado_at is not null
        ) then 'anulado'
        when exists (
          select 1 from evaluacion_intentos i
          where i.id = ${latestAttemptId}
            and i.enviado_at is not null
        ) then 'enviado'
        when exists (
          select 1 from evaluacion_intentos i
          where i.id = ${latestAttemptId}
            and i.expirado_at is not null
        ) then 'expirado'
        when exists (
          select 1 from evaluacion_intentos i
          where i.id = ${latestAttemptId}
        ) then 'en_curso'
        else 'no_iniciado'
      end`,
      ultimoIntento: sql<number | null>`(
        select i.intento
        from evaluacion_intentos i
        where i.evaluacion_id = ${evaluacionId}
          and i.matricula_id = ${matriculas.id}
        order by i.intento desc
        limit 1
      )`,
      respuestasCount: sql<number>`(
        select count(*)
        from respuestas_formulario r
        where r.evaluacion_id = ${evaluacionId}
          and r.matricula_id = ${matriculas.id}
      )`.mapWith(Number),
      nota: sql<string | null>`(
        select n.nota
        from notas n
        where n.evaluacion_id = ${evaluacionId}
          and n.matricula_id = ${matriculas.id}
          and n.eliminado_at is null
        order by n.fecha_nota desc nulls last
        limit 1
      )`,
      ultimaActividadAt: sql<Date | null>`greatest(
        coalesce((
          select max(r.created_at)
          from respuestas_formulario r
          where r.evaluacion_id = ${evaluacionId}
            and r.matricula_id = ${matriculas.id}
        ), '-infinity'::timestamptz),
        coalesce((
          select max(coalesce(i.enviado_at, i.expirado_at, i.anulado_at, i.prorrogada_at, i.iniciado_at))
          from evaluacion_intentos i
          where i.evaluacion_id = ${evaluacionId}
            and i.matricula_id = ${matriculas.id}
        ), '-infinity'::timestamptz)
      )`,
      destinatarioAsignado: sql<boolean>`exists (
        select 1 from evaluacion_destinatarios d
        where d.evaluacion_id = ${evaluacionId}
          and d.matricula_id = ${matriculas.id}
      )`,
    })
    .from(evaluaciones)
    .innerJoin(matriculas, eq(matriculas.asignaturaId, evaluaciones.asignaturaId))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(
      and(
        eq(evaluaciones.id, evaluacionId),
        eq(matriculas.activa, true),
        isNull(evaluaciones.eliminadoAt),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  return rows.map((row) => ({
    ...row,
    ultimoIntento: row.ultimoIntento ? Number(row.ultimoIntento) : null,
    respuestasCount: Number(row.respuestasCount ?? 0),
    destinatarioAsignado: Boolean(row.destinatarioAsignado),
    ultimaActividadAt:
      row.ultimaActividadAt && Number.isFinite(new Date(row.ultimaActividadAt).getTime())
        ? row.ultimaActividadAt
        : null,
  }));
}

export async function listarRespuestasParaCalificar(
  evaluacionId: string,
): Promise<RespuestaPendienteItem[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_respuestas_corregir_list",
    "evaluaciones.read_results",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) return [];

  const db = getDb();

  const notaSubq = db
    .select({ matriculaId: notas.matriculaId, nota: notas.nota })
    .from(notas)
    .where(and(eq(notas.evaluacionId, evaluacionId), isNull(notas.eliminadoAt)))
    .as("nota_subq");

  return db
    .select({
      respuestaId: respuestasFormulario.id,
      matriculaId: respuestasFormulario.matriculaId,
      preguntaId: respuestasFormulario.preguntaId,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      respuesta: respuestasFormulario.respuesta,
      intento: respuestasFormulario.intento,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      notaActual: notaSubq.nota,
      esCorrecta: respuestasFormulario.esCorrecta,
    })
    .from(respuestasFormulario)
    .innerJoin(preguntas, eq(respuestasFormulario.preguntaId, preguntas.id))
    .innerJoin(matriculas, eq(respuestasFormulario.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .leftJoin(notaSubq, eq(notaSubq.matriculaId, respuestasFormulario.matriculaId))
    .where(
      and(
        eq(respuestasFormulario.evaluacionId, evaluacionId),
        sql`${preguntas.tipo} in ('respuesta_corta', 'desarrollo')`,
        isNull(preguntas.eliminadoAt),
      ),
    )
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre), asc(preguntas.orden));
}

export async function listarIntentosRecuperablesEvaluacion(
  evaluacionId: string,
): Promise<IntentoRecuperableItem[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_intentos_list",
    "evaluaciones.read_results",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) return [];

  const db = getDb();
  const rows = await db
    .select({
      intentoId: evaluacionIntentos.id,
      matriculaId: evaluacionIntentos.matriculaId,
      intento: evaluacionIntentos.intento,
      iniciadoAt: evaluacionIntentos.iniciadoAt,
      prorrogadaAt: evaluacionIntentos.prorrogadaAt,
      expiradoAt: evaluacionIntentos.expiradoAt,
      enviadoAt: evaluacionIntentos.enviadoAt,
      anuladoAt: evaluacionIntentos.anuladoAt,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(evaluacionIntentos)
    .innerJoin(matriculas, eq(evaluacionIntentos.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(eq(evaluacionIntentos.evaluacionId, evaluacionId))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre), desc(evaluacionIntentos.intento));

  return rows.map((row) => ({
    ...row,
    estado: row.anuladoAt
      ? "anulado"
      : row.enviadoAt
        ? "enviado"
        : row.expiradoAt
          ? "expirado"
          : "activo",
  }));
}

export async function rehabilitarIntentoAlumnoAction(input: {
  evaluacionId: string;
  matriculaId: string;
  intentoId: string;
  modo: "reanudar" | "nuevo";
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_rehabilitar_intento",
    "evaluaciones.supervision",
  );
  if (!actorResult.ok) return actorResult.result;

  if (!input.evaluacionId || !input.matriculaId || !input.intentoId) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }
  if (input.modo !== "reanudar" && input.modo !== "nuevo") {
    return { ok: false, code: "invalid_input", message: "Modo inválido." };
  }

  const evaluacion = await getEvaluacionAccessRow(input.evaluacionId);
  if (!evaluacion) {
    return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
  }
  if (!actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return forbiddenMutationResult("No tienes permiso para rehabilitar intentos en esta evaluación.");
  }

  const db = getDb();
  const [intento] = await db
    .select({
      id: evaluacionIntentos.id,
      intento: evaluacionIntentos.intento,
      enviadoAt: evaluacionIntentos.enviadoAt,
    })
    .from(evaluacionIntentos)
    .where(
      and(
        eq(evaluacionIntentos.id, input.intentoId),
        eq(evaluacionIntentos.evaluacionId, input.evaluacionId),
        eq(evaluacionIntentos.matriculaId, input.matriculaId),
      ),
    )
    .limit(1);

  if (!intento) {
    return { ok: false, code: "intento_not_found", message: "Intento no encontrado." };
  }
  if (intento.enviadoAt) {
    return {
      ok: false,
      code: "intento_already_submitted",
      message: "Este intento ya fue enviado. No se puede rehabilitar.",
    };
  }

  const now = new Date();

  try {
    if (input.modo === "reanudar") {
      await db
        .update(evaluacionIntentos)
        .set({ expiradoAt: null, prorrogadaAt: now, anuladoAt: null, anuladoPor: null })
        .where(eq(evaluacionIntentos.id, intento.id));

      await registrarAudit({
        correlationId: actorResult.actor.correlationId,
        userId: actorResult.actor.userId,
        userRol: actorResult.actor.userRol,
        accion: "editar",
        entidad: "evaluacion_intentos",
        entidadId: intento.id,
        payload: { modo: input.modo, evaluacionId: input.evaluacionId, matriculaId: input.matriculaId },
        exitoso: true,
      });

      return { ok: true, code: "intento_reanudado" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(evaluacionIntentos)
        .set({ anuladoAt: now, anuladoPor: actorResult.actor.userId, expiradoAt: now })
        .where(eq(evaluacionIntentos.id, intento.id));

      await tx
        .delete(respuestasFormulario)
        .where(
          and(
            eq(respuestasFormulario.evaluacionId, input.evaluacionId),
            eq(respuestasFormulario.matriculaId, input.matriculaId),
            eq(respuestasFormulario.intento, intento.intento),
          ),
        );
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "desactivar",
      entidad: "evaluacion_intentos",
      entidadId: intento.id,
      payload: { modo: input.modo, evaluacionId: input.evaluacionId, matriculaId: input.matriculaId },
      exitoso: true,
    });

    return { ok: true, code: "intento_anulado_nuevo" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "rehabilitar_intento_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message, modo: input.modo },
    });
    return { ok: false, code: "rehabilitar_failed", message: "No fue posible rehabilitar el intento." };
  }
}

export async function rehabilitarIntentoFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const matriculaId = getStringField(formData, "matriculaId");
  const intentoId = getStringField(formData, "intentoId");
  const modo = getStringField(formData, "modo") as "reanudar" | "nuevo";
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");

  const result = await rehabilitarIntentoAlumnoAction({
    evaluacionId,
    matriculaId,
    intentoId,
    modo,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function calificarRespuestaEvaluacionAction(input: {
  evaluacionId: string;
  matriculaId: string;
  nota: number;
  observacion?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_calificar_manual",
    "evaluaciones.write_questions",
  );
  if (!actorResult.ok) return actorResult.result;

  const nota = Number(input.nota);
  if (!Number.isFinite(nota) || nota < 1 || nota > 7) {
    return { ok: false, code: "invalid_input", message: "Nota debe estar entre 1.0 y 7.0." };
  }

  const evaluacion = await getEvaluacionAccessRow(input.evaluacionId);
  if (!evaluacion) {
    return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
  }
  if (!actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return forbiddenMutationResult("No tienes permiso para calificar esta evaluación.");
  }

  const db = getDb();
  const notaRedondeada = String(Math.round(nota * 10) / 10);

  try {
    const [existing] = await db
      .select({ id: notas.id })
      .from(notas)
      .where(
        and(
          eq(notas.evaluacionId, input.evaluacionId),
          eq(notas.matriculaId, input.matriculaId),
          isNull(notas.eliminadoAt),
        ),
      )
      .limit(1);

    const now = new Date();
    const observacion = input.observacion
      ? sanitizeText(input.observacion).trim().slice(0, 500) || null
      : null;

    if (existing) {
      await db
        .update(notas)
        .set({
          nota: notaRedondeada,
          calificadoPor: actorResult.actor.userId,
          fechaNota: now,
          observacion,
          eliminadoAt: null,
        })
        .where(eq(notas.id, existing.id));
    } else {
      await db.insert(notas).values({
        evaluacionId: input.evaluacionId,
        matriculaId: input.matriculaId,
        nota: notaRedondeada,
        calificadoPor: actorResult.actor.userId,
        fechaNota: now,
        observacion,
      });
    }

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "notas",
      entidadId: input.evaluacionId,
      payload: { matriculaId: input.matriculaId, nota: notaRedondeada },
      exitoso: true,
    });

    return { ok: true, code: "nota_manual_registrada" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "calificar_manual_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "calificar_failed", message: "No fue posible registrar la nota." };
  }
}

export async function calificarRespuestaEvaluacionFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const matriculaId = getStringField(formData, "matriculaId");
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const notaRaw = Number.parseFloat(
    getStringField(formData, "nota").replace(",", "."),
  );
  const observacion = getStringField(formData, "observacion") || undefined;

  const result = await calificarRespuestaEvaluacionAction({
    evaluacionId,
    matriculaId,
    nota: notaRaw,
    observacion,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function crearEvaluacionAction(input: {
  asignaturaId: string;
  titulo: string;
  tipo: "formulario" | "tarea" | "examen" | "proyecto";
  ponderacion?: string;
  instrucciones?: string;
  fechaInicio?: string;
  fechaLimite?: string;
  intentosMax?: number;
  tiempoMinutos?: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability("evaluacion_create", "evaluaciones.create");
  if (!actorResult.ok) return actorResult.result;

  const titulo = sanitizeText(input.titulo).trim();
  if (!titulo || !input.asignaturaId) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const tiposValidos = ["formulario", "tarea", "examen", "proyecto"] as const;
  if (!tiposValidos.includes(input.tipo)) {
    return { ok: false, code: "invalid_input", message: "Tipo inválido." };
  }

  const db = getDb();

  try {
    const asignatura = await getAsignaturaAccessRow(input.asignaturaId);

    if (!asignatura) {
      return { ok: false, code: "asignatura_not_found", message: "Asignatura no encontrada." };
    }

    if (!actorCanManageAsignatura(actorResult.actor, asignatura)) {
      return forbiddenMutationResult(
        "Solo puedes crear evaluaciones en secciones que administras directamente.",
      );
    }

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(input.asignaturaId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    const intentosMax = Number.isFinite(input.intentosMax)
      ? Math.max(1, Math.min(Math.trunc(input.intentosMax ?? 1), 5))
      : 1;
    const tiempoMinutos = Number.isFinite(input.tiempoMinutos)
      ? Math.max(1, Math.min(Math.trunc(input.tiempoMinutos ?? 0), 600))
      : null;
    const instrucciones = [
      tiempoMinutos ? `Tiempo disponible: ${tiempoMinutos} minutos.` : null,
      sanitizeOptionalText(input.instrucciones),
    ].filter(Boolean).join(" ");

    const [created] = await db
      .insert(evaluaciones)
      .values({
        asignaturaId: input.asignaturaId,
        titulo,
        tipo: input.tipo,
        ponderacion: input.ponderacion || null,
        instrucciones: instrucciones || null,
        fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : null,
        fechaLimite: input.fechaLimite ? new Date(input.fechaLimite) : null,
        duracionMinutos: tiempoMinutos,
        intentosMax,
        publicada: false,
        createdAt: new Date(),
      })
      .returning({ id: evaluaciones.id });

    if (!created) return { ok: false, code: "creation_failed", message: "No se pudo crear la evaluación" };

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "evaluaciones",
      entidadId: created.id,
      payload: { titulo, tipo: input.tipo, asignaturaId: input.asignaturaId },
      exitoso: true,
    });

    return { ok: true, code: "evaluacion_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "evaluacion_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "evaluacion_create_failed", message: "No fue posible crear la evaluación." };
  }
}

export async function crearEvaluacionFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const result = await crearEvaluacionAction({
    asignaturaId,
    titulo: getStringField(formData, "titulo"),
    tipo: getStringField(formData, "tipo") as
      | "formulario"
      | "tarea"
      | "examen"
      | "proyecto",
    ponderacion: getStringField(formData, "ponderacion") || undefined,
    instrucciones: getStringField(formData, "instrucciones") || undefined,
    fechaInicio: getStringField(formData, "fechaInicio") || undefined,
    fechaLimite: getStringField(formData, "fechaLimite") || undefined,
    intentosMax: Number.parseInt(getStringField(formData, "intentosMax"), 10) || undefined,
    tiempoMinutos: Number.parseInt(getStringField(formData, "tiempoMinutos"), 10) || undefined,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
  });
}

export async function importarPruebaLocalAction(input: {
  asignaturaId: string;
  archivo: string;
  fechaInicio?: string;
  fechaLimite?: string;
  intentosMax?: number;
  ponderacion?: string;
  tiempoMinutos?: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "prueba_local_import",
    "evaluaciones.import_local",
  );
  if (!actorResult.ok) return actorResult.result;

  if (!input.asignaturaId || !input.archivo || !existsSync(localPruebasRoot)) {
    return { ok: false, code: "invalid_input", message: "Datos invalidos." };
  }

  let parsed: LocalPruebaParsed;
  try {
    parsed = readLocalPrueba(localPruebasRoot, input.archivo);
  } catch {
    return { ok: false, code: "invalid_file", message: "No se pudo leer el archivo de prueba." };
  }

  if (parsed.preguntas.length === 0) {
    return { ok: false, code: "empty_test", message: "La prueba no contiene preguntas reconocibles." };
  }

  const db = getDb();

  try {
    const asignatura = await getAsignaturaAccessRow(input.asignaturaId);

    if (!asignatura) {
      return { ok: false, code: "asignatura_not_found", message: "Asignatura no encontrada." };
    }

    if (asignatura.estado === "finalizado" || asignatura.estado === "archivado") {
      return {
        ok: false,
        code: "asignatura_closed",
        message: "No puedes importar pruebas en asignaturas finalizadas o archivadas.",
      };
    }

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(input.asignaturaId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    const [existing] = await db
      .select({ id: evaluaciones.id })
      .from(evaluaciones)
      .where(
        and(
          eq(evaluaciones.asignaturaId, input.asignaturaId),
          eq(evaluaciones.titulo, parsed.titulo),
          isNull(evaluaciones.eliminadoAt),
        ),
      )
      .limit(1);

    if (existing) {
      return { ok: false, code: "test_exists", message: "Ya existe una evaluacion con ese titulo en la asignatura." };
    }

    const intentosMax = Number.isFinite(input.intentosMax)
      ? Math.max(1, Math.min(Math.trunc(input.intentosMax ?? 1), 5))
      : 1;
    const tiempoMinutos = Number.isFinite(input.tiempoMinutos)
      ? Math.max(1, Math.min(Math.trunc(input.tiempoMinutos ?? 0), 600))
      : null;

    const [created] = await db.transaction(async (tx) => {
      const [evaluacion] = await tx
        .insert(evaluaciones)
        .values({
          asignaturaId: input.asignaturaId,
          titulo: parsed.titulo,
          tipo: "examen",
          ponderacion: input.ponderacion || null,
          fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : null,
          fechaLimite: input.fechaLimite ? new Date(input.fechaLimite) : null,
          duracionMinutos: tiempoMinutos,
          intentosMax,
          instrucciones: [
            tiempoMinutos ? `Tiempo disponible: ${tiempoMinutos} minutos.` : null,
            "Prueba importada desde banco local. Las preguntas sin pauta quedan disponibles para revision docente; publica solo cuando fechas, tiempo e instrucciones esten revisadas.",
          ].filter(Boolean).join(" "),
          publicada: false,
          creadoPor: actorResult.actor.userId,
          createdAt: new Date(),
        })
        .returning({ id: evaluaciones.id });

      if (!evaluacion) {
        throw new Error("creation_failed");
      }

      await tx.insert(preguntas).values(
        parsed.preguntas.map((pregunta) => ({
          evaluacionId: evaluacion.id,
          enunciado: pregunta.enunciado,
          tipo: pregunta.tipo,
          opciones:
            pregunta.tipo === "opcion_multiple" && pregunta.opciones
              ? { opciones: pregunta.opciones }
              : null,
          puntaje: pregunta.puntaje,
          orden: pregunta.orden,
        })),
      );

      return [evaluacion];
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "evaluaciones",
      entidadId: created.id,
      payload: {
        asignaturaId: input.asignaturaId,
        archivo: parsed.archivo,
        totalPreguntas: parsed.preguntas.length,
        publicada: false,
      },
      exitoso: true,
    });

    return { ok: true, code: "local_test_imported" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "prueba_local_import_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message, archivo: input.archivo },
    });
    return { ok: false, code: "local_test_import_failed", message: "No fue posible importar la prueba." };
  }
}

export async function importarPruebaLocalFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const result = await importarPruebaLocalAction({
    asignaturaId,
    archivo: getStringField(formData, "archivo"),
    fechaInicio: getStringField(formData, "fechaInicio") || undefined,
    fechaLimite: getStringField(formData, "fechaLimite") || undefined,
    intentosMax: Number.parseInt(getStringField(formData, "intentosMax"), 10) || undefined,
    ponderacion: getStringField(formData, "ponderacion") || undefined,
    tiempoMinutos: Number.parseInt(getStringField(formData, "tiempoMinutos"), 10) || undefined,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.code,
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
  });
}

export async function toggleModoSupervisionAction(
  id: string,
  enabled: boolean,
): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_supervision_toggle",
    "evaluaciones.supervision",
  );
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
    const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(id);
    if (!periodoCheck.ok) return periodoCheck.result;

    const existing = await getEvaluacionAccessRow(id);

    if (!existing) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }

    await db
      .update(evaluaciones)
      .set({ modoSupervision: enabled })
      .where(eq(evaluaciones.id, id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "evaluaciones",
      entidadId: id,
      payload: { modoSupervision: enabled },
      exitoso: true,
    });

    return { ok: true, code: enabled ? "supervision_enabled" : "supervision_disabled" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "evaluacion_supervision_toggle_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "supervision_toggle_failed", message: "No fue posible actualizar la supervision." };
  }
}

export async function toggleModoSupervisionFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const enabled = getStringField(formData, "enabled") === "true";
  const result = await toggleModoSupervisionAction(evaluacionId, enabled);

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.code,
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export type ResultadoPreguntaAlumno = {
  preguntaId: string;
  enunciado: string;
  tipo: string;
  orden: number | null;
  respuesta: string | null;
  esCorrecta: boolean | null;
  puntaje: string | null;
};

export async function listarResultadosEvaluacionAlumno(
  evaluacionId: string,
): Promise<ResultadoPreguntaAlumno[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_resultados_alumno",
    "evaluaciones.read_assigned",
  );
  if (!actorResult.ok) return [];

  const db = getDb();

  // Find this alumno's matricula for this evaluacion
  const matriculaRows = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(evaluaciones, eq(asignaturas.id, evaluaciones.asignaturaId))
    .where(
      and(
        eq(evaluaciones.id, evaluacionId),
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  const matriculaId = matriculaRows[0]?.id ?? null;
  if (!matriculaId) return [];
  if (!(await matriculaHabilitadaParaEvaluacion(evaluacionId, matriculaId))) return [];

  // Only if mostrar_resultados = true
  const evRows = await db
    .select({ mostrarResultados: evaluaciones.mostrarResultados })
    .from(evaluaciones)
    .where(eq(evaluaciones.id, evaluacionId))
    .limit(1);

  if (!evRows[0]?.mostrarResultados) return [];

  const rows = await db
    .select({
      preguntaId: preguntas.id,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      orden: preguntas.orden,
      puntaje: preguntas.puntaje,
      respuesta: respuestasFormulario.respuesta,
      esCorrecta: respuestasFormulario.esCorrecta,
    })
    .from(preguntas)
    .leftJoin(
      respuestasFormulario,
      and(
        eq(respuestasFormulario.preguntaId, preguntas.id),
        eq(respuestasFormulario.matriculaId, matriculaId),
        eq(respuestasFormulario.evaluacionId, evaluacionId),
      ),
    )
    .where(and(eq(preguntas.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)))
    .orderBy(asc(preguntas.orden));

  return rows.map((r) => ({
    preguntaId: r.preguntaId,
    enunciado: r.enunciado,
    tipo: r.tipo,
    orden: r.orden,
    puntaje: r.puntaje,
    respuesta: r.respuesta ?? null,
    esCorrecta: r.esCorrecta ?? null,
  }));
}

export async function toggleMostrarResultadosAction(
  evaluacionId: string,
  valor: boolean,
): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_toggle_resultados",
    "evaluaciones.publish",
  );
  if (!actorResult.ok) return actorResult.result;

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion) {
    return { ok: false, code: "not_found", message: "Evaluación no encontrada." };
  }
  if (!actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return forbiddenMutationResult("Sin permiso para modificar esta evaluación.");
  }

  const db = getDb();
  await db
    .update(evaluaciones)
    .set({ mostrarResultados: valor })
    .where(eq(evaluaciones.id, evaluacionId));

  revalidatePath("/admin/evaluaciones");
  return { ok: true, code: "mostrar_resultados_updated" };
}

export async function toggleMostrarResultadosFormAction(formData: FormData): Promise<void> {
  const evId = formData.get("evaluacionId") as string;
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const currentValue = formData.get("currentValue") === "true";
  const redirectTo = getStringField(formData, "redirectTo");
  await toggleMostrarResultadosAction(evId, !currentValue);
  revalidatePath("/admin/evaluaciones");
  redirectEvaluacionesForm({
    redirectTo,
    state: "mostrar_resultados_updated",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evId || undefined,
  });
}

export async function crearPlantillaEncuestaAction(input: {
  asignaturaId: string;
  plantilla: SurveyTemplateKey;
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_template_create",
    "encuestas.admin",
  );
  if (!actorResult.ok) return actorResult.result;

  const parsed = plantillaEncuestaInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Plantilla o asignatura invalida.",
    };
  }

  const definition = SURVEY_TEMPLATE_DEFINITIONS[parsed.data.plantilla];
  const db = getDb();

  try {
    const subject = await getAsignaturaAccessRow(parsed.data.asignaturaId);

    if (!subject) {
      return { ok: false, code: "asignatura_not_found", message: "Asignatura no encontrada." };
    }

    if (subject.estado === "archivado") {
      return {
        ok: false,
        code: "asignatura_closed",
        message: "No puedes crear encuestas en asignaturas archivadas.",
      };
    }

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(parsed.data.asignaturaId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    const [existingTemplate] = await db
      .select({ id: evaluaciones.id })
      .from(evaluaciones)
      .where(
        and(
          eq(evaluaciones.asignaturaId, parsed.data.asignaturaId),
          eq(evaluaciones.titulo, definition.title),
          isNull(evaluaciones.eliminadoAt),
        ),
      )
      .limit(1);

    if (existingTemplate) {
      return {
        ok: false,
        code: "template_exists",
        message: "La plantilla ya existe para esta asignatura.",
      };
    }

    const scaleOptions = getTemplateScaleOptions(parsed.data.plantilla);

    const [created] = await db
      .insert(evaluaciones)
      .values({
        asignaturaId: parsed.data.asignaturaId,
        titulo: definition.title,
        tipo: "formulario",
        instrucciones: definition.intro,
        intentosMax: definition.attemptsMax,
        publicada: false,
        createdAt: new Date(),
      })
      .returning({ id: evaluaciones.id });

    if (!created) return { ok: false, code: "creation_failed", message: "No se pudo crear la encuesta" };

    await db.insert(preguntas).values(
      definition.questions.map((enunciado, index) => ({
        evaluacionId: created.id,
        enunciado,
        tipo: "opcion_multiple" as const,
        opciones: { ...scaleOptions },
        puntaje: "1",
        orden: index + 1,
      })),
    );

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "evaluaciones",
      entidadId: created.id,
      payload: {
        plantilla: parsed.data.plantilla,
        asignaturaId: parsed.data.asignaturaId,
        totalPreguntas: definition.questions.length,
      },
      exitoso: true,
    });

    return {
      ok: true,
      code:
        parsed.data.plantilla === "docente_otec"
          ? "template_docente_otec_created"
          : "template_estilos_created",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "evaluacion_template_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message, plantilla: parsed.data.plantilla },
    });

    return {
      ok: false,
      code: "template_create_failed",
      message: "No fue posible crear la plantilla de encuesta.",
    };
  }
}

export async function crearPlantillaEncuestaFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const plantillaRaw = getStringField(formData, "plantilla");

  const result = await crearPlantillaEncuestaAction({
    asignaturaId,
    plantilla: plantillaRaw as SurveyTemplateKey,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.code,
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
  });
}

export async function actualizarDestinatariosEvaluacionAction(input: {
  evaluacionId: string;
  matriculaIds: string[];
  modo: "seccion" | "personalizado";
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_destinatarios_update",
    "evaluaciones.publish",
  );
  if (!actorResult.ok) return actorResult.result;

  const evaluacion = await getEvaluacionAccessRow(input.evaluacionId);
  if (!evaluacion) {
    return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
  }
  if (!actorCanManageEvaluacion(actorResult.actor, evaluacion)) {
    return forbiddenMutationResult("No tienes permiso para asignar destinatarios.");
  }

  const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(input.evaluacionId);
  if (!periodoCheck.ok) return periodoCheck.result;

  const db = getDb();
  const uniqueMatriculaIds = Array.from(new Set(input.matriculaIds.filter(Boolean)));
  if (input.modo === "personalizado" && uniqueMatriculaIds.length === 0) {
    return { ok: false, code: "invalid_input", message: "Selecciona al menos una matrícula." };
  }

  const validRows = uniqueMatriculaIds.length
    ? await db
        .select({ id: matriculas.id })
        .from(matriculas)
        .where(
          and(
            inArray(matriculas.id, uniqueMatriculaIds),
            eq(matriculas.asignaturaId, evaluacion.asignaturaId),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
          ),
        )
    : [];
  const validIds = validRows.map((row) => row.id);

  if (input.modo === "personalizado" && validIds.length === 0) {
    return { ok: false, code: "invalid_input", message: "No hay matrículas válidas para esta evaluación." };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(evaluacionDestinatarios)
      .where(eq(evaluacionDestinatarios.evaluacionId, input.evaluacionId));

    if (input.modo === "personalizado") {
      await tx.insert(evaluacionDestinatarios).values(
        validIds.map((matriculaId) => ({
          evaluacionId: input.evaluacionId,
          matriculaId,
          asignadoPor: actorResult.actor.userId,
        })),
      );
    }
  });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "evaluacion_destinatarios",
    entidadId: input.evaluacionId,
    payload: { modo: input.modo, totalDestinatarios: validIds.length },
    exitoso: true,
  });

  return { ok: true, code: "destinatarios_updated" };
}

export async function actualizarDestinatariosEvaluacionFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const modo = getStringField(formData, "modo") === "personalizado" ? "personalizado" : "seccion";
  const matriculaIds = formData
    .getAll("matriculaId")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  const result = await actualizarDestinatariosEvaluacionAction({
    evaluacionId,
    matriculaIds,
    modo,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function publicarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_publicar",
    "evaluaciones.publish",
  );
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
    const evalAccess = await getEvaluacionAccessRow(id);
    if (!evalAccess) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }
    if (!actorCanManageEvaluacion(actorResult.actor, evalAccess)) {
      return forbiddenMutationResult("No tienes permiso para publicar esta evaluación.");
    }

    const [evalState] = await db
      .select({ publicada: evaluaciones.publicada })
      .from(evaluaciones)
      .where(and(eq(evaluaciones.id, id), isNull(evaluaciones.eliminadoAt)))
      .limit(1);
    if (!evalState) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }
    if (evalState.publicada) {
      return { ok: true, code: "already_published" };
    }

    await db
      .update(evaluaciones)
      .set({ publicada: true, updatedAt: new Date() })
      .where(eq(evaluaciones.id, id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "evaluaciones",
      entidadId: id,
      payload: { publicada: true },
      exitoso: true,
    });

    // Notificar a alumnos matriculados
    const [evalData] = await db
      .select({
        titulo: evaluaciones.titulo,
        asignaturaId: evaluaciones.asignaturaId,
        asignaturaNombre: asignaturas.nombre,
        fechaLimite: evaluaciones.fechaLimite,
      })
      .from(evaluaciones)
      .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
      .where(eq(evaluaciones.id, id))
      .limit(1);

    if (evalData) {
      const destinatarios = await db
        .select({ matriculaId: evaluacionDestinatarios.matriculaId })
        .from(evaluacionDestinatarios)
        .where(eq(evaluacionDestinatarios.evaluacionId, id));
      const destinatarioIds = destinatarios.map((item) => item.matriculaId);
      const alumnos = await db
        .select({
          id: usuarios.id,
          nombre: usuarios.nombre,
          apellido: usuarios.apellido,
          email: usuarios.email,
          matriculaId: matriculas.id,
        })
        .from(matriculas)
        .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
        .where(
          and(
            eq(matriculas.asignaturaId, evalData.asignaturaId),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
            ...(destinatarioIds.length > 0
              ? [inArray(matriculas.id, destinatarioIds)]
              : []),
          ),
        );

      const fechaLimiteStr = evalData.fechaLimite
        ? evalData.fechaLimite.toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })
        : null;

      for (const alumno of alumnos) {
        if (!alumno.email) continue;
        const { subject, html } = templateEvaluacionPublicada({
          alumnoNombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
          evaluacionTitulo: evalData.titulo,
          asignaturaNombre: evalData.asignaturaNombre,
          fechaLimite: fechaLimiteStr,
        });
        sendEmail(alumno.email, subject, html).catch(() => {});
      }

      const alumnoIds = alumnos.map((a) => a.id);
      if (alumnoIds.length > 0) {
        enviarPushADestinatarios(
          alumnoIds,
          `Nueva evaluación: ${evalData.titulo}`,
          `Tienes una nueva evaluación en ${evalData.asignaturaNombre}${fechaLimiteStr ? ` — límite: ${fechaLimiteStr}` : ""}.`,
        ).catch(() => {});
      }
    }

    return { ok: true, code: "evaluacion_published" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "evaluacion_publicar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "publicar_failed", message: "No fue posible publicar la evaluación." };
  }
}

export async function publicarEvaluacionFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const evaluacionId = getStringField(formData, "evaluacionId");
  const redirectTo = getStringField(formData, "redirectTo");
  const result = await publicarEvaluacionAction(evaluacionId);

  revalidatePath("/admin/evaluaciones");
  revalidatePath("/alumno/evaluaciones");
  revalidatePath("/alumno/asignaturas");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function despublicarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_despublicar",
    "evaluaciones.publish",
  );
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
    const evalAccess = await getEvaluacionAccessRow(id);
    if (!evalAccess) {
      return { ok: false, code: "evaluacion_not_found", message: "EvaluaciÃ³n no encontrada." };
    }
    if (!actorCanManageEvaluacion(actorResult.actor, evalAccess)) {
      return forbiddenMutationResult("No tienes permiso para deshabilitar esta evaluaciÃ³n.");
    }

    const [existing] = await db
      .select({ id: evaluaciones.id, publicada: evaluaciones.publicada })
      .from(evaluaciones)
      .where(and(eq(evaluaciones.id, id), isNull(evaluaciones.eliminadoAt)))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }

    if (!existing.publicada) {
      return { ok: true, code: "already_unpublished" };
    }

    await db
      .update(evaluaciones)
      .set({ publicada: false, updatedAt: new Date() })
      .where(eq(evaluaciones.id, id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "evaluaciones",
      entidadId: id,
      payload: { publicada: false },
      exitoso: true,
    });

    return { ok: true, code: "evaluacion_unpublished" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "evaluacion_despublicar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return {
      ok: false,
      code: "despublicar_failed",
      message: "No fue posible deshabilitar la evaluación.",
    };
  }
}

export async function despublicarEvaluacionFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const evaluacionId = getStringField(formData, "evaluacionId");
  const redirectTo = getStringField(formData, "redirectTo");
  const result = await despublicarEvaluacionAction(evaluacionId);

  revalidatePath("/admin/evaluaciones");
  revalidatePath("/alumno/evaluaciones");
  revalidatePath("/alumno/asignaturas");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function eliminarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "evaluacion_delete",
    "evaluaciones.delete",
  );
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
    const evalAccess = await getEvaluacionAccessRow(id);
    if (!evalAccess) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }
    if (!actorCanManageEvaluacion(actorResult.actor, evalAccess)) {
      return forbiddenMutationResult("No tienes permiso para eliminar esta evaluación.");
    }

    const [evalState] = await db
      .select({ eliminadoAt: evaluaciones.eliminadoAt })
      .from(evaluaciones)
      .where(eq(evaluaciones.id, id))
      .limit(1);
    if (!evalState) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }
    if (evalState.eliminadoAt) {
      return { ok: true, code: "already_deleted" };
    }

    const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    await db
      .update(evaluaciones)
      .set({ eliminadoAt: new Date(), eliminadoPor: actorResult.actor.userId })
      .where(eq(evaluaciones.id, id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "desactivar",
      entidad: "evaluaciones",
      entidadId: id,
      exitoso: true,
    });

    return { ok: true, code: "evaluacion_deleted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "evaluacion_delete_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "delete_failed", message: "No fue posible eliminar la evaluación." };
  }
}

export async function eliminarEvaluacionFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const evaluacionId = getStringField(formData, "evaluacionId");
  const redirectTo = getStringField(formData, "redirectTo");
  const result = await eliminarEvaluacionAction(evaluacionId);

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function agregarPreguntaAction(input: {
  evaluacionId: string;
  enunciado: string;
  tipo: "opcion_multiple" | "verdadero_falso" | "respuesta_corta" | "desarrollo";
  opciones?: string[];
  correcta?: number;
  puntaje?: string;
  orden?: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "pregunta_create",
    "evaluaciones.write_questions",
  );
  if (!actorResult.ok) return actorResult.result;

  const enunciado = sanitizeText(input.enunciado).trim();
  if (!enunciado || !input.evaluacionId) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const db = getDb();

  try {
    const ev = await getEvaluacionAccessRow(input.evaluacionId);

    if (!ev) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }

    if (!actorCanManageEvaluacion(actorResult.actor, ev)) {
      return forbiddenMutationResult(
        "Solo puedes editar preguntas de evaluaciones asociadas a tus secciones.",
      );
    }

    const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(input.evaluacionId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    let opcionesJson: unknown = null;
    if (input.tipo === "opcion_multiple" && input.opciones && input.opciones.length > 0) {
      const cleanOptions = input.opciones
        .map((option) => sanitizeText(option).trim())
        .filter(Boolean);

      if (cleanOptions.length > 0) {
        const optionPayload: {
          opciones: string[];
          correcta?: number;
        } = {
          opciones: cleanOptions,
        };

        if (
          Number.isInteger(input.correcta) &&
          Number(input.correcta) >= 0 &&
          Number(input.correcta) < cleanOptions.length
        ) {
          optionPayload.correcta = Number(input.correcta);
        }

        opcionesJson = optionPayload;
      }
    } else if (input.tipo === "verdadero_falso" && Number.isInteger(input.correcta)) {
      opcionesJson = { correcta: String(Boolean(input.correcta)) };
    }

    const [created] = await db
      .insert(preguntas)
      .values({
        evaluacionId: input.evaluacionId,
        enunciado,
        tipo: input.tipo,
        opciones: opcionesJson,
        puntaje: input.puntaje ?? "1",
        orden: input.orden ?? null,
      })
      .returning({ id: preguntas.id });

    if (!created) return { ok: false, code: "creation_failed", message: "No se pudo crear la pregunta" };

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "preguntas",
      entidadId: created.id,
      payload: { evaluacionId: input.evaluacionId, tipo: input.tipo },
      exitoso: true,
    });

    return { ok: true, code: "pregunta_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "pregunta_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "pregunta_create_failed", message: "No fue posible agregar la pregunta." };
  }
}

export async function agregarPreguntaFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const asignaturaId = getStringField(formData, "asignaturaId");
  const periodoId = getStringField(formData, "periodoId").trim();
  const redirectTo = getStringField(formData, "redirectTo");
  const tipo = getStringField(formData, "tipo") as
    | "opcion_multiple"
    | "verdadero_falso"
    | "respuesta_corta"
    | "desarrollo";

  const opciones = formData
    .getAll("opcion")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const correctaValue = getStringField(formData, "correcta");
  const correcta =
    !correctaValue
      ? undefined
      : tipo === "verdadero_falso"
        ? correctaValue === "true" || correctaValue === "0"
          ? 1
          : 0
        : Number.parseInt(correctaValue, 10);

  const result = await agregarPreguntaAction({
    evaluacionId,
    enunciado: getStringField(formData, "enunciado"),
    tipo,
    opciones: opciones.length > 0 ? opciones : undefined,
    correcta: typeof correcta === "number" && Number.isFinite(correcta) ? correcta : undefined,
    puntaje: getStringField(formData, "puntaje") || undefined,
    orden: Number.parseInt(getStringField(formData, "orden"), 10) || undefined,
  });

  revalidatePath("/admin/evaluaciones");
  revalidatePath(sanitizeEvaluacionesRedirect(redirectTo).split("?")[0]);
  redirectEvaluacionesForm({
    redirectTo,
    state: result.ok ? result.code : "error",
    periodoId: periodoId || undefined,
    asignaturaId: asignaturaId || undefined,
    evaluacionId: evaluacionId || undefined,
  });
}

export async function enviarRespuestasAction(input: {
  evaluacionId: string;
  intentoId?: string;
  respuestas: { preguntaId: string; respuesta: string }[];
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "alumno_enviar_respuestas",
    "evaluaciones.respond",
  );
  if (!actorResult.ok) return actorResult.result;

  if (!input.evaluacionId || input.respuestas.length === 0) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const db = getDb();

  try {
    const [ev] = await db
      .select({
        id: evaluaciones.id,
        titulo: evaluaciones.titulo,
        publicada: evaluaciones.publicada,
        asignaturaId: evaluaciones.asignaturaId,
        intentosMax: evaluaciones.intentosMax,
        duracionMinutos: evaluaciones.duracionMinutos,
        fechaInicio: evaluaciones.fechaInicio,
        fechaLimite: evaluaciones.fechaLimite,
      })
      .from(evaluaciones)
      .where(
        and(
          eq(evaluaciones.id, input.evaluacionId),
          eq(evaluaciones.publicada, true),
          isNull(evaluaciones.eliminadoAt),
        ),
      )
      .limit(1);

    if (!ev) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }

    const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(input.evaluacionId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    const now = new Date();
    if (ev.fechaInicio && ev.fechaInicio > now) {
      return { ok: false, code: "not_open_yet", message: "La evaluación aún no está disponible." };
    }
    if (ev.fechaLimite && ev.fechaLimite < now) {
      return { ok: false, code: "deadline_passed", message: "La evaluación ya venció." };
    }

    const [matricula] = await db
      .select({ id: matriculas.id, alumnoRut: usuarios.rut })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .where(
        and(
          eq(matriculas.alumnoId, actorResult.actor.userId),
          eq(matriculas.asignaturaId, ev.asignaturaId),
          eq(matriculas.activa, true),
          isNull(matriculas.eliminadoAt),
        ),
      )
      .limit(1);

    if (!matricula) {
      return { ok: false, code: "not_enrolled", message: "No tienes matrícula en esta asignatura." };
    }
    if (!(await matriculaHabilitadaParaEvaluacion(input.evaluacionId, matricula.id))) {
      return { ok: false, code: "not_assigned", message: "Esta evaluación no está habilitada para tu matrícula." };
    }

    const trackByRut = isMandatorySurveyTitle(ev.titulo) && Boolean(matricula.alumnoRut);
    const [intentoRow] = trackByRut
      ? await db
          .select({ maxIntento: sql<number>`coalesce(max(${respuestasFormulario.intento}), 0)` })
          .from(respuestasFormulario)
          .innerJoin(matriculas, eq(respuestasFormulario.matriculaId, matriculas.id))
          .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
          .where(
            and(
              eq(respuestasFormulario.evaluacionId, input.evaluacionId),
              eq(usuarios.rut, matricula.alumnoRut as string),
              isNull(matriculas.eliminadoAt),
            ),
          )
      : await db
          .select({ maxIntento: sql<number>`coalesce(max(${respuestasFormulario.intento}), 0)` })
          .from(respuestasFormulario)
          .where(
            and(
              eq(respuestasFormulario.evaluacionId, input.evaluacionId),
              eq(respuestasFormulario.matriculaId, matricula.id),
            ),
          );

    const intentosUsados = Number(intentoRow?.maxIntento ?? 0);
    const intentosMax = ev.intentosMax ?? 1;
    if (intentosUsados >= intentosMax) {
      return { ok: false, code: "max_intentos_reached", message: "Límite de intentos alcanzado." };
    }
    let currentIntento = intentosUsados + 1;

    if (ev.duracionMinutos) {
      if (!input.intentoId) {
        return {
          ok: false,
          code: "attempt_required",
          message: "Debes iniciar un intento temporizado antes de responder.",
        };
      }

      const [attempt] = await db
        .select({
          id: evaluacionIntentos.id,
          intento: evaluacionIntentos.intento,
          iniciadoAt: evaluacionIntentos.iniciadoAt,
          prorrogadaAt: evaluacionIntentos.prorrogadaAt,
          enviadoAt: evaluacionIntentos.enviadoAt,
          expiradoAt: evaluacionIntentos.expiradoAt,
          anuladoAt: evaluacionIntentos.anuladoAt,
        })
        .from(evaluacionIntentos)
        .where(
          and(
            eq(evaluacionIntentos.id, input.intentoId),
            eq(evaluacionIntentos.evaluacionId, input.evaluacionId),
            eq(evaluacionIntentos.matriculaId, matricula.id),
            isNull(evaluacionIntentos.anuladoAt),
          ),
        )
        .limit(1);

      if (!attempt || attempt.enviadoAt || attempt.expiradoAt || attempt.anuladoAt) {
        return {
          ok: false,
          code: "attempt_invalid",
          message: "Tu intento activo ya no está disponible.",
        };
      }

      const baseTime = attempt.prorrogadaAt ?? attempt.iniciadoAt;
      const expiracionAt = new Date(baseTime.getTime() + ev.duracionMinutos * 60_000);
      if (expiracionAt <= now) {
        await db
          .update(evaluacionIntentos)
          .set({ expiradoAt: now })
          .where(eq(evaluacionIntentos.id, attempt.id));

        return {
          ok: false,
          code: "attempt_expired",
          message: "El tiempo disponible para este intento ya expiró.",
        };
      }

      currentIntento = attempt.intento;
    }

    const preguntaRows = await db
      .select({
        id: preguntas.id,
        tipo: preguntas.tipo,
        opciones: preguntas.opciones,
        puntaje: preguntas.puntaje,
      })
      .from(preguntas)
      .where(and(eq(preguntas.evaluacionId, input.evaluacionId), isNull(preguntas.eliminadoAt)));

    const preguntaMap = new Map(preguntaRows.map((p) => [p.id, p]));
    let puntosObtenidos = 0;
    let puntosAutocalificables = 0;
    const scaleAnswers: number[] = [];
    let notaCalculada: number | null = null;

    await db.transaction(async (tx) => {
      for (const resp of input.respuestas) {
        const pregunta = preguntaMap.get(resp.preguntaId);
        if (!pregunta) continue;

        const respuesta = sanitizeRespuesta(resp.respuesta);
        if (!respuesta) {
          throw new Error("invalid_input:empty_respuesta");
        }

        const puntaje = Number(pregunta.puntaje ?? "1");

        let esCorrecta: boolean | null = null;
        if (pregunta.tipo === "opcion_multiple") {
          const scaleOptions = coerceScaleQuestionOptions(pregunta.opciones);
          if (scaleOptions) {
            const parsedValue = parseScaleAnswer(respuesta, scaleOptions);
            if (parsedValue === null) throw new Error("invalid_input:invalid_scale_answer");
            scaleAnswers.push(parsedValue);
            if (typeof scaleOptions.correcta === "number") {
              esCorrecta = parsedValue === scaleOptions.correcta;
            }
          } else {
            const opts = pregunta.opciones as { opciones: string[]; correcta?: number } | null;
            if (opts && typeof opts.correcta === "number") {
              esCorrecta = respuesta === String(opts.correcta);
            }
          }
        } else if (pregunta.tipo === "verdadero_falso") {
          const opts = pregunta.opciones as { correcta?: string } | null;
          if (typeof opts?.correcta === "string") esCorrecta = respuesta === opts.correcta;
        }

        if (esCorrecta !== null) puntosAutocalificables += puntaje;
        if (esCorrecta === true) puntosObtenidos += puntaje;

        await tx.insert(respuestasFormulario).values({
          evaluacionId: input.evaluacionId,
          matriculaId: matricula.id,
          preguntaId: resp.preguntaId,
          respuesta,
          esCorrecta,
          intento: currentIntento,
          createdAt: now,
        });
      }

      // Calculate nota
      const scaleAverage =
        scaleAnswers.length > 0
          ? scaleAnswers.reduce((a, v) => a + v, 0) / scaleAnswers.length
          : null;
      const rawNota =
        puntosAutocalificables > 0
          ? 1 + 6 * (puntosObtenidos / puntosAutocalificables)
          : scaleAverage !== null
            ? scaleAverage
            : null;
      notaCalculada =
        rawNota === null ? null : Math.round(Math.max(1, Math.min(7, rawNota)) * 10) / 10;

      if (notaCalculada !== null) {
        const [existingNota] = await tx
          .select({ id: notas.id })
          .from(notas)
          .where(and(eq(notas.evaluacionId, input.evaluacionId), eq(notas.matriculaId, matricula.id)))
          .limit(1);

        if (existingNota) {
          await tx
            .update(notas)
            .set({ nota: String(notaCalculada), calificadoPor: null, fechaNota: now, eliminadoAt: null, eliminadoPor: null })
            .where(eq(notas.id, existingNota.id));
        } else {
          await tx.insert(notas).values({
            evaluacionId: input.evaluacionId,
            matriculaId: matricula.id,
            nota: String(notaCalculada),
            calificadoPor: null,
            fechaNota: now,
          });
        }
      }

      if (ev.duracionMinutos && input.intentoId) {
        await tx
          .update(evaluacionIntentos)
          .set({ enviadoAt: now })
          .where(eq(evaluacionIntentos.id, input.intentoId));
      }
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "respuestas_formulario",
      entidadId: input.evaluacionId,
      payload: {
        intento: currentIntento,
        nota: notaCalculada,
        puntosAutocalificables,
      },
      exitoso: true,
    });

    return { ok: true, code: "respuestas_enviadas" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "enviar_respuestas_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "enviar_failed", message: "No fue posible enviar las respuestas." };
  }
}

export async function enviarRespuestasFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const intentoId = getStringField(formData, "intentoId") || undefined;
  const respuestas: { preguntaId: string; respuesta: string }[] = [];

  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith("respuesta_") && typeof value === "string") {
      respuestas.push({
        preguntaId: key.replace("respuesta_", ""),
        respuesta: value,
      });
    }
  }

  const result = await enviarRespuestasAction({ evaluacionId, intentoId, respuestas });
  revalidatePath(`/alumno/evaluaciones/${evaluacionId}`);
  redirect(`/alumno/evaluaciones/${evaluacionId}?state=${result.code}`);
}

const SUPERVISION_EVENT_TYPES = new Set([
  "supervision_start",
  "page_hidden",
  "window_blur",
  "copy",
  "cut",
  "paste",
  "context_menu",
  "printscreen_key",
  "question_time",
  "submit_flush",
]);

export async function registrarEventoSupervisionAction(input: {
  evaluacionId: string;
  tipo: string;
  payload?: Record<string, unknown>;
}): Promise<MutationResult> {
  const actorResult = await requireActionCapability(
    "supervision_event_create",
    "evaluaciones.respond",
  );
  if (!actorResult.ok) return actorResult.result;

  if (!input.evaluacionId || !SUPERVISION_EVENT_TYPES.has(input.tipo)) {
    return { ok: false, code: "invalid_input", message: "Evento invalido." };
  }

  if (!checkSupervisionRateLimit(actorResult.actor.userId, input.evaluacionId)) {
    return { ok: true, code: "supervision_rate_limited" };
  }

  const db = getDb();

  try {
    const [row] = await db
      .select({
        evaluacionId: evaluaciones.id,
        matriculaId: matriculas.id,
        modoSupervision: evaluaciones.modoSupervision,
      })
      .from(evaluaciones)
      .innerJoin(matriculas, eq(matriculas.asignaturaId, evaluaciones.asignaturaId))
      .where(
        and(
          eq(evaluaciones.id, input.evaluacionId),
          eq(evaluaciones.publicada, true),
          eq(matriculas.alumnoId, actorResult.actor.userId),
          eq(matriculas.activa, true),
          isNull(evaluaciones.eliminadoAt),
          isNull(matriculas.eliminadoAt),
        ),
      )
      .limit(1);

    if (!row || !row.modoSupervision) {
      return { ok: true, code: "supervision_ignored" };
    }

    const safePayload = input.payload
      ? { data: JSON.stringify(input.payload).slice(0, 4000) }
      : null;

    await db.insert(eventosSupervision).values({
      evaluacionId: input.evaluacionId,
      matriculaId: row.matriculaId,
      tipo: input.tipo,
      payload: safePayload,
      createdAt: new Date(),
    });

    return { ok: true, code: "supervision_event_registered" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "supervision_event_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message, tipo: input.tipo },
    });
    return { ok: false, code: "supervision_event_failed", message: "No fue posible registrar el evento." };
  }
}

// --- Auditoría legible por evaluación ---

export type AuditoriaEventoLegible = {
  id: string;
  fecha: Date | null;
  descripcion: string;
  tipo: "info" | "warning" | "success" | "error";
};

export async function listarAuditoriaEvaluacion(
  evaluacionId: string,
): Promise<AuditoriaEventoLegible[]> {
  const actorResult = await requireActionCapability(
    "evaluacion_auditoria_read",
    "evaluaciones.read_results",
  );
  if (!actorResult.ok) return [];

  const evaluacion = await getEvaluacionAccessRow(evaluacionId);
  if (!evaluacion || !actorCanManageEvaluacion(actorResult.actor, evaluacion)) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: auditLogs.id,
      accion: auditLogs.accion,
      entidad: auditLogs.entidad,
      payload: auditLogs.payload,
      userRol: auditLogs.userRol,
      exitoso: auditLogs.exitoso,
      createdAt: auditLogs.createdAt,
      userName: sql<string | null>`(
        select u.nombre || ' ' || u.apellido
        from usuarios u
        where u.id = ${auditLogs.userId}
      )`,
    })
    .from(auditLogs)
    .where(
      and(
        sql`${auditLogs.entidadId} = ${evaluacionId}::uuid`,
        sql`${auditLogs.entidad} IN ('evaluaciones', 'evaluacion_intentos')`,
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(30);

  return rows.map((row) => {
    const quien =
      row.userName ??
      (row.userRol === "admin"
        ? "Administrador"
        : row.userRol === "docente"
          ? "Docente"
          : "Sistema");
    const payload = row.payload as Record<string, unknown> | null;
    let descripcion = "";
    let tipo: AuditoriaEventoLegible["tipo"] = "info";

    if (row.entidad === "evaluacion_intentos") {
      const modo = payload?.modo as string | undefined;
      if (modo === "reanudar") {
        descripcion = `${quien} reanudó el intento de un alumno.`;
        tipo = "success";
      } else if (modo === "nuevo") {
        descripcion = `${quien} anuló el intento y habilitó comenzar desde cero.`;
        tipo = "warning";
      } else if (row.accion === "crear") {
        descripcion = "Alumno inició un nuevo intento de evaluación.";
        tipo = "info";
      } else {
        descripcion = `${quien} modificó un intento (${row.accion}).`;
        tipo = "info";
      }
    } else if (row.entidad === "evaluaciones") {
      if (row.accion === "crear") {
        descripcion = `${quien} creó la evaluación.`;
        tipo = "success";
      } else if (row.accion === "editar") {
        descripcion = `${quien} editó la evaluación.`;
        tipo = "info";
      } else if (row.accion === "desactivar") {
        descripcion = `${quien} eliminó la evaluación.`;
        tipo = "error";
      } else {
        descripcion = `${quien}: ${row.accion} en evaluación.`;
        tipo = "info";
      }
    } else {
      descripcion = `${quien}: ${row.accion ?? "acción"} en ${row.entidad ?? "entidad"}.`;
    }

    if (row.exitoso === false) {
      descripcion += " (falló)";
      tipo = "error";
    }

    return { id: row.id, fecha: row.createdAt, descripcion, tipo };
  });
}
