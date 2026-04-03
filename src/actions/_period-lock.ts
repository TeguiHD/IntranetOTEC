import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  asignaturas,
  certificados,
  clases,
  evaluaciones,
  matriculas,
  periodosAcademicos,
  preguntas,
} from "@/db/schema";

import type { MutationResult } from "./_security";

type PeriodoGuardResult =
  | { ok: true }
  | {
      ok: false;
      result: MutationResult;
    };

const PERIODO_CERRADO_RESULT: MutationResult = {
  ok: false,
  code: "periodo_closed",
  message: "No se permiten modificaciones porque el periodo academico esta cerrado.",
};

const toGuardResult = (periodoEstado: string | null | undefined): PeriodoGuardResult => {
  if (periodoEstado === "cerrado") {
    return { ok: false, result: PERIODO_CERRADO_RESULT };
  }

  return { ok: true };
};

export async function assertPeriodoAbiertoByAsignaturaId(
  asignaturaId: string,
): Promise<PeriodoGuardResult> {
  if (!asignaturaId) {
    return { ok: true };
  }

  const db = getDb();
  const [row] = await db
    .select({ periodoEstado: periodosAcademicos.estado })
    .from(asignaturas)
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(asignaturas.id, asignaturaId))
    .limit(1);

  return toGuardResult(row?.periodoEstado);
}

export async function assertPeriodoAbiertoByClaseId(claseId: string): Promise<PeriodoGuardResult> {
  if (!claseId) {
    return { ok: true };
  }

  const db = getDb();
  const [row] = await db
    .select({ periodoEstado: periodosAcademicos.estado })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(clases.id, claseId))
    .limit(1);

  return toGuardResult(row?.periodoEstado);
}

export async function assertPeriodoAbiertoByMatriculaId(
  matriculaId: string,
): Promise<PeriodoGuardResult> {
  if (!matriculaId) {
    return { ok: true };
  }

  const db = getDb();
  const [row] = await db
    .select({ periodoEstado: periodosAcademicos.estado })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(matriculas.id, matriculaId))
    .limit(1);

  return toGuardResult(row?.periodoEstado);
}

export async function assertPeriodoAbiertoByEvaluacionId(
  evaluacionId: string,
): Promise<PeriodoGuardResult> {
  if (!evaluacionId) {
    return { ok: true };
  }

  const db = getDb();
  const [row] = await db
    .select({ periodoEstado: periodosAcademicos.estado })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(evaluaciones.id, evaluacionId))
    .limit(1);

  return toGuardResult(row?.periodoEstado);
}

export async function assertPeriodoAbiertoByPreguntaId(
  preguntaId: string,
): Promise<PeriodoGuardResult> {
  if (!preguntaId) {
    return { ok: true };
  }

  const db = getDb();
  const [row] = await db
    .select({ periodoEstado: periodosAcademicos.estado })
    .from(preguntas)
    .innerJoin(evaluaciones, eq(preguntas.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(preguntas.id, preguntaId))
    .limit(1);

  return toGuardResult(row?.periodoEstado);
}

export async function assertPeriodoAbiertoByCertificadoId(
  certificadoId: string,
): Promise<PeriodoGuardResult> {
  if (!certificadoId) {
    return { ok: true };
  }

  const db = getDb();
  const [row] = await db
    .select({ periodoEstado: periodosAcademicos.estado })
    .from(certificados)
    .innerJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .leftJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(certificados.id, certificadoId))
    .limit(1);

  return toGuardResult(row?.periodoEstado);
}
