import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { encuestaAsignaciones, evaluaciones } from "@/db/schema";

export type PendingSurvey = {
  evaluacionId: string;
  titulo: string;
  instrucciones: string | null;
};

/**
 * Returns obligatory pending surveys for a given user.
 * Used by the layout to block navigation until all are completed.
 */
export async function obtenerEncuestasPendientesObligatorias(
  userId: string,
): Promise<PendingSurvey[]> {
  const db = getDb();

  const rows = await db
    .select({
      evaluacionId: encuestaAsignaciones.evaluacionId,
      titulo: evaluaciones.titulo,
      instrucciones: evaluaciones.instrucciones,
    })
    .from(encuestaAsignaciones)
    .innerJoin(evaluaciones, eq(encuestaAsignaciones.evaluacionId, evaluaciones.id))
    .where(
      and(
        eq(encuestaAsignaciones.usuarioId, userId),
        eq(encuestaAsignaciones.completada, false),
        eq(evaluaciones.esEncuesta, true),
        eq(evaluaciones.obligatoria, true),
        eq(evaluaciones.estadoEncuesta, "activa"),
      ),
    );

  return rows;
}

/**
 * Check if user has any pending obligatory survey (fast boolean check).
 */
export async function tienePendientesObligatorias(userId: string): Promise<boolean> {
  const pending = await obtenerEncuestasPendientesObligatorias(userId);
  return pending.length > 0;
}
