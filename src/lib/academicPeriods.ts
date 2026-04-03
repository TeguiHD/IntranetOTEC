import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { periodosAcademicos } from "@/db/schema";

type DbClient = ReturnType<typeof getDb>;
type EstadoPeriodo = "planificado" | "activo" | "cerrado";

export type AcademicPeriodDraft = {
  codigo: string;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoPeriodo;
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toIsoDateUtc = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;

const parseIsoDate = (rawValue: string): Date | null => {
  const match = rawValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "", 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return candidate;
};

const resolvePeriodState = (todayIso: string, startIso: string, endIso: string): EstadoPeriodo => {
  if (todayIso < startIso) {
    return "planificado";
  }

  if (todayIso > endIso) {
    return "cerrado";
  }

  return "activo";
};

export const buildAcademicPeriodDraftFromDate = (
  dateString: string,
  now: Date = new Date(),
): AcademicPeriodDraft => {
  const baseDate = parseIsoDate(dateString) ?? now;
  const year = baseDate.getUTCFullYear();
  const semester = baseDate.getUTCMonth() + 1 <= 6 ? 1 : 2;

  const startDate = new Date(Date.UTC(year, semester === 1 ? 0 : 6, 1));
  const endDate = new Date(Date.UTC(year, semester === 1 ? 5 : 11, semester === 1 ? 30 : 31));

  const fechaInicio = toIsoDateUtc(startDate);
  const fechaFin = toIsoDateUtc(endDate);
  const codigo = `${year}-S${semester}`;

  return {
    codigo,
    nombre: `Semestre ${semester} ${year}`,
    fechaInicio,
    fechaFin,
    estado: resolvePeriodState(toIsoDateUtc(now), fechaInicio, fechaFin),
  };
};

export const resolveAcademicPeriodForDate = async (db: DbClient, dateString: string) => {
  const draft = buildAcademicPeriodDraftFromDate(dateString);

  const [existing] = await db
    .select({
      id: periodosAcademicos.id,
      codigo: periodosAcademicos.codigo,
      nombre: periodosAcademicos.nombre,
    })
    .from(periodosAcademicos)
    .where(eq(periodosAcademicos.codigo, draft.codigo))
    .limit(1);

  if (existing) {
    return existing;
  }

  await db.insert(periodosAcademicos).values(draft).onConflictDoNothing();

  const [created] = await db
    .select({
      id: periodosAcademicos.id,
      codigo: periodosAcademicos.codigo,
      nombre: periodosAcademicos.nombre,
    })
    .from(periodosAcademicos)
    .where(eq(periodosAcademicos.codigo, draft.codigo))
    .limit(1);

  if (!created) {
    throw new Error(`No se pudo resolver periodo academico para fecha ${dateString}.`);
  }

  return created;
};
