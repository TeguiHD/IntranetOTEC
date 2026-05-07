"use server";

import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  cursos,
  evaluaciones,
  eventosSupervision,
  matriculas,
  notas,
  periodosAcademicos,
  preguntas,
  respuestasFormulario,
  usuarios,
} from "@/db/schema";
import { getEvaluationWindowStatus, type EvaluationWindowStatus } from "@/lib/evaluation-status";
import { logEvent } from "@/lib/observability/logger";

import { requireActionCapability } from "./_security";
import { listarNotasAlumno } from "./alumno-notas";

export type HistorialEvaluacionRow = {
  evaluacionId: string;
  asignaturaId: string;
  asignaturaNombre: string;
  cursoNombre: string | null;
  periodoNombre: string | null;
  docenteNombre: string | null;
  titulo: string;
  tipo: string;
  publicada: boolean;
  modoSupervision: boolean;
  fechaInicio: Date | null;
  fechaLimite: Date | null;
  createdAt: Date | null;
  estadoVentana: EvaluationWindowStatus;
  totalPreguntas: number;
  totalRespondidas: number;
  totalCalificadas: number;
  supervisionEventos: number;
  respondidaPorActor: boolean;
  notaActor: string | null;
};

export type HistorialResumen = {
  totalEvaluaciones: number;
  publicadas: number;
  pendientes: number;
  vencidas: number;
  respondidas: number;
  promedioNotas: number | null;
  supervisionActiva: number;
};

export type HistorialAlumnoData = {
  resumen: HistorialResumen;
  evaluaciones: HistorialEvaluacionRow[];
  notasDocente: Awaited<ReturnType<typeof listarNotasAlumno>>;
};

export type HistorialDocenteData = {
  resumen: HistorialResumen & {
    secciones: number;
    pendientesCorreccion: number;
  };
  evaluaciones: HistorialEvaluacionRow[];
};

export type HistorialAdminData = {
  resumen: HistorialResumen & {
    secciones: number;
    docentes: number;
  };
  evaluaciones: HistorialEvaluacionRow[];
};

type BaseHistoryRow = Omit<
  HistorialEvaluacionRow,
  "estadoVentana" | "respondidaPorActor" | "notaActor"
> & {
  fechaInicio: Date | null;
  fechaLimite: Date | null;
};

const toNumber = (value: unknown): number => Number(value ?? 0);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMPTY_ADMIN_HISTORY: HistorialAdminData = {
  resumen: {
    totalEvaluaciones: 0,
    publicadas: 0,
    pendientes: 0,
    vencidas: 0,
    respondidas: 0,
    promedioNotas: null,
    supervisionActiva: 0,
    secciones: 0,
    docentes: 0,
  },
  evaluaciones: [],
};

const toDateOrNull = (value: Date | string | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildStatusRow = (
  row: BaseHistoryRow,
  extras?: { respondidaPorActor?: boolean; notaActor?: string | null },
): HistorialEvaluacionRow => ({
  ...row,
  estadoVentana: getEvaluationWindowStatus({
    publicada: row.publicada,
    fechaInicio: row.fechaInicio,
    fechaLimite: row.fechaLimite,
  }),
  respondidaPorActor: extras?.respondidaPorActor ?? false,
  notaActor: extras?.notaActor ?? null,
});

async function buildHistoryRows(
  whereClause: ReturnType<typeof and> | undefined,
): Promise<BaseHistoryRow[]> {
  const db = getDb();

  const responseAgg = db
    .select({
      evaluacionId: respuestasFormulario.evaluacionId,
      totalRespondidas: sql<number>`count(distinct ${respuestasFormulario.matriculaId})`.mapWith(Number),
    })
    .from(respuestasFormulario)
    .groupBy(respuestasFormulario.evaluacionId)
    .as("response_agg");

  const notaAgg = db
    .select({
      evaluacionId: notas.evaluacionId,
      totalCalificadas: sql<number>`count(distinct ${notas.matriculaId})`.mapWith(Number),
    })
    .from(notas)
    .where(isNull(notas.eliminadoAt))
    .groupBy(notas.evaluacionId)
    .as("nota_agg");

  const supervisionAgg = db
    .select({
      evaluacionId: eventosSupervision.evaluacionId,
      supervisionEventos: sql<number>`count(*)`.mapWith(Number),
    })
    .from(eventosSupervision)
    .groupBy(eventosSupervision.evaluacionId)
    .as("supervision_agg");

  const preguntaAgg = db
    .select({
      evaluacionId: preguntas.evaluacionId,
      totalPreguntas: sql<number>`count(*)`.mapWith(Number),
    })
    .from(preguntas)
    .where(isNull(preguntas.eliminadoAt))
    .groupBy(preguntas.evaluacionId)
    .as("pregunta_agg");

  const rows = await db
    .select({
      evaluacionId: evaluaciones.id,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      cursoNombre: cursos.nombre,
      periodoNombre: periodosAcademicos.nombre,
      docenteNombre: sql<string | null>`${usuarios.nombre} || ' ' || ${usuarios.apellido}`,
      titulo: evaluaciones.titulo,
      tipo: evaluaciones.tipo,
      publicada: evaluaciones.publicada,
      modoSupervision: evaluaciones.modoSupervision,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      createdAt: evaluaciones.createdAt,
      totalPreguntas: sql<number>`coalesce(${preguntaAgg.totalPreguntas}, 0)`.mapWith(Number),
      totalRespondidas: sql<number>`coalesce(${responseAgg.totalRespondidas}, 0)`.mapWith(Number),
      totalCalificadas: sql<number>`coalesce(${notaAgg.totalCalificadas}, 0)`.mapWith(Number),
      supervisionEventos: sql<number>`coalesce(${supervisionAgg.supervisionEventos}, 0)`.mapWith(Number),
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .leftJoin(usuarios, eq(asignaturas.docenteId, usuarios.id))
    .leftJoin(responseAgg, eq(responseAgg.evaluacionId, evaluaciones.id))
    .leftJoin(notaAgg, eq(notaAgg.evaluacionId, evaluaciones.id))
    .leftJoin(supervisionAgg, eq(supervisionAgg.evaluacionId, evaluaciones.id))
    .leftJoin(preguntaAgg, eq(preguntaAgg.evaluacionId, evaluaciones.id))
    .where(whereClause)
    .orderBy(desc(evaluaciones.createdAt), asc(asignaturas.nombre));

  return rows.map((row) => ({
    ...row,
    publicada: Boolean(row.publicada),
    modoSupervision: Boolean(row.modoSupervision),
    fechaInicio: toDateOrNull(row.fechaInicio),
    fechaLimite: toDateOrNull(row.fechaLimite),
    createdAt: toDateOrNull(row.createdAt),
    totalPreguntas: toNumber(row.totalPreguntas),
    totalRespondidas: toNumber(row.totalRespondidas),
    totalCalificadas: toNumber(row.totalCalificadas),
    supervisionEventos: toNumber(row.supervisionEventos),
  }));
}

async function buildAlumnoHistoryRows(alumnoId: string): Promise<BaseHistoryRow[]> {
  const db = getDb();

  const alumnoMatriculas = await db
    .select({ asignaturaId: matriculas.asignaturaId })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    );

  const asignaturaIds = alumnoMatriculas.map((row) => row.asignaturaId);
  if (asignaturaIds.length === 0) return [];

  const whereClause = and(
    isNull(evaluaciones.eliminadoAt),
    isNull(asignaturas.eliminadoAt),
    eq(evaluaciones.publicada, true),
    inArray(evaluaciones.asignaturaId, asignaturaIds),
  );

  return buildHistoryRows(whereClause);
}

function buildResumen(rows: HistorialEvaluacionRow[]): HistorialResumen {
  const notasValidas = rows
    .map((row) => (row.notaActor ? Number.parseFloat(row.notaActor) : Number.NaN))
    .filter(Number.isFinite);

  return {
    totalEvaluaciones: rows.length,
    publicadas: rows.filter((row) => row.publicada).length,
    pendientes: rows.filter(
      (row) =>
        row.estadoVentana === "programada" ||
        (row.estadoVentana === "disponible" && !row.respondidaPorActor),
    ).length,
    vencidas: rows.filter((row) => row.estadoVentana === "vencida").length,
    respondidas: rows.filter((row) => row.respondidaPorActor).length,
    promedioNotas:
      notasValidas.length > 0
        ? Math.round(
            (notasValidas.reduce((total, nota) => total + nota, 0) / notasValidas.length) * 10,
          ) / 10
        : null,
    supervisionActiva: rows.filter((row) => row.modoSupervision).length,
  };
}

export async function obtenerHistorialAcademicoAlumno(): Promise<HistorialAlumnoData | null> {
  const actorResult = await requireActionCapability(
    "historial_alumno_read",
    "historial.alumno",
  );
  if (!actorResult.ok) return null;

  const alumnoId = actorResult.actor.userId;
  const db = getDb();

  // Get per-evaluacion responded/nota flags for this alumno
  const alumnoRespuestasRows = await db
    .select({
      evaluacionId: respuestasFormulario.evaluacionId,
      total: sql<number>`count(distinct ${respuestasFormulario.matriculaId})`.mapWith(Number),
    })
    .from(respuestasFormulario)
    .innerJoin(matriculas, eq(respuestasFormulario.matriculaId, matriculas.id))
    .where(eq(matriculas.alumnoId, alumnoId))
    .groupBy(respuestasFormulario.evaluacionId);

  const alumnoNotasRows = await db
    .select({ evaluacionId: notas.evaluacionId, nota: notas.nota })
    .from(notas)
    .innerJoin(matriculas, eq(notas.matriculaId, matriculas.id))
    .where(and(eq(matriculas.alumnoId, alumnoId), isNull(notas.eliminadoAt)));

  const respondidaMap = new Map(alumnoRespuestasRows.map((r) => [r.evaluacionId, r.total > 0]));
  const notaMap = new Map(alumnoNotasRows.map((n) => [n.evaluacionId, n.nota ?? null]));

  const baseRows = await buildAlumnoHistoryRows(alumnoId);
  const rows = baseRows.map((row) =>
    buildStatusRow(row, {
      respondidaPorActor: respondidaMap.get(row.evaluacionId) ?? false,
      notaActor: notaMap.get(row.evaluacionId) ?? null,
    }),
  );

  const notasDocente = await listarNotasAlumno();

  return {
    resumen: buildResumen(rows),
    evaluaciones: rows,
    notasDocente,
  };
}

export async function obtenerHistorialAcademicoDocente(): Promise<HistorialDocenteData | null> {
  const actorResult = await requireActionCapability(
    "historial_docente_read",
    "historial.docente",
  );
  if (!actorResult.ok) return null;

  const whereClause = and(
    eq(asignaturas.docenteId, actorResult.actor.userId),
    isNull(asignaturas.eliminadoAt),
    isNull(evaluaciones.eliminadoAt),
  );

  const rows = (await buildHistoryRows(whereClause)).map((row) =>
    buildStatusRow(row, {
      respondidaPorActor: row.totalRespondidas > 0,
    }),
  );

  const uniqueAsignaturas = new Set(rows.map((row) => row.asignaturaId)).size;
  const pendientesCorreccion = rows.reduce(
    (total, row) => total + Math.max(0, row.totalRespondidas - row.totalCalificadas),
    0,
  );

  return {
    resumen: {
      ...buildResumen(rows),
      secciones: uniqueAsignaturas,
      pendientesCorreccion,
    },
    evaluaciones: rows,
  };
}

export async function obtenerHistorialAcademicoAdmin(
  periodoId?: string,
): Promise<HistorialAdminData | null> {
  const actorResult = await requireActionCapability(
    "historial_admin_read",
    "historial.admin",
  );
  if (!actorResult.ok) return null;

  const safePeriodoId =
    typeof periodoId === "string" && UUID_REGEX.test(periodoId)
      ? periodoId
      : undefined;

  const whereConditions = [isNull(asignaturas.eliminadoAt), isNull(evaluaciones.eliminadoAt)];
  if (safePeriodoId) {
    whereConditions.push(eq(asignaturas.periodoId, safePeriodoId));
  }

  try {
    const rows = (await buildHistoryRows(and(...whereConditions))).map((row) =>
      buildStatusRow(row, {
        respondidaPorActor: row.totalRespondidas > 0,
      }),
    );

    const uniqueAsignaturas = new Set(rows.map((row) => row.asignaturaId)).size;
    const uniqueDocentes = new Set(rows.map((row) => row.docenteNombre).filter(Boolean)).size;

    return {
      resumen: {
        ...buildResumen(rows),
        secciones: uniqueAsignaturas,
        docentes: uniqueDocentes,
      },
      evaluaciones: rows,
    };
  } catch (error) {
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "historial_admin_read_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: {
        reason: error instanceof Error ? error.message : "unknown_error",
        hasPeriodoId: Boolean(periodoId),
      },
    });

    return EMPTY_ADMIN_HISTORY;
  }
}
