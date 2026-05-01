import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas } from "@/db/schema";
import { logEvent } from "@/lib/observability/logger";
import { generarEncuestasObligatoriasAlFinalizar } from "@/lib/surveyLifecycle";

// #51: In-memory throttle — run at most once per minute
let lastRun = 0;

const toUtcDayStart = (value: Date): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

const addUtcMonths = (value: Date, months: number): Date =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, value.getUTCDate()));

const parseIsoDateUtc = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export async function finalizarAsignaturasVencidas(): Promise<number> {
  const nowMs = Date.now();
  if (nowMs - lastRun < 60_000) {
    return 0;
  }
  lastRun = nowMs;

  const db = getDb();
  const todayStart = toUtcDayStart(new Date());

  const rows = await db
    .select({
      id: asignaturas.id,
      fechaInicio: asignaturas.fechaInicio,
      fechaFin: asignaturas.fechaFin,
      duracionMeses: asignaturas.duracionMeses,
    })
    .from(asignaturas)
    .where(eq(asignaturas.estado, "activo"));

  const expiredIds = rows
    .filter((row) => {
      const explicitEnd = row.fechaFin ? parseIsoDateUtc(row.fechaFin) : null;
      if (explicitEnd) {
        return explicitEnd <= todayStart;
      }

      const startedAt = parseIsoDateUtc(row.fechaInicio);
      if (!startedAt) {
        return false;
      }

      const endDate = addUtcMonths(startedAt, row.duracionMeses);
      return endDate <= todayStart;
    })
    .map((row) => row.id);

  if (expiredIds.length === 0) {
    return 0;
  }

  const now = new Date();
  const finalizedIds = (
    await Promise.all(
    expiredIds.map((id) =>
      db
        .update(asignaturas)
        .set({ estado: "finalizado", updatedAt: now })
        .where(and(eq(asignaturas.id, id), eq(asignaturas.estado, "activo")))
        .returning({ id: asignaturas.id }),
    ),
    )
  )
    .flatMap((rows) => rows)
    .map((row) => row.id);

  if (finalizedIds.length === 0) {
    return 0;
  }

  for (const asignaturaId of finalizedIds) {
    try {
      await generarEncuestasObligatoriasAlFinalizar(asignaturaId);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unknown_error";
      logEvent({
        correlationId: `course-lifecycle-${Date.now()}`,
        action: "mandatory_surveys_generation_failed",
        result: "error",
        details: {
          asignaturaId,
          reason,
        },
      });
    }
  }

  return finalizedIds.length;
}
