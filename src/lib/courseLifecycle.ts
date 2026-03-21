import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { asignaturas } from "@/db/schema";

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

// Performance #51: throttle to max once per 60 seconds instead of 14+ calls per request
let lastRunAt = 0;
const THROTTLE_MS = 60_000;

export async function finalizarAsignaturasVencidas(): Promise<number> {
  const now = Date.now();
  if (now - lastRunAt < THROTTLE_MS) {
    return 0;
  }
  lastRunAt = now;

  const db = getDb();
  const todayStart = toUtcDayStart(new Date());

  const rows = await db
    .select({
      id: asignaturas.id,
      fechaInicio: asignaturas.fechaInicio,
      duracionMeses: asignaturas.duracionMeses,
    })
    .from(asignaturas)
    .where(eq(asignaturas.estado, "activo"));

  const expiredIds = rows
    .filter((row) => {
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

  const timestamp = new Date();
  await Promise.all(
    expiredIds.map((id) =>
      db
        .update(asignaturas)
        .set({ estado: "finalizado", updatedAt: timestamp })
        .where(and(eq(asignaturas.id, id), eq(asignaturas.estado, "activo"))),
    ),
  );

  return expiredIds.length;
}
