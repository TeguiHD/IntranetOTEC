import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { evaluaciones, notas } from "@/db/schema";

export type NotaFinalResult = {
  notaFinal: number | null;
  esPonderada: boolean;
  totalEvaluaciones: number;
  evaluacionesConNota: number;
};

export async function calcularNotaFinalPonderada(
  matriculaId: string,
  asignaturaId: string,
): Promise<NotaFinalResult> {
  const db = getDb();

  const rows = await db
    .select({
      nota: notas.nota,
      ponderacion: evaluaciones.ponderacion,
    })
    .from(notas)
    .innerJoin(evaluaciones, eq(notas.evaluacionId, evaluaciones.id))
    .where(
      and(
        eq(notas.matriculaId, matriculaId),
        eq(evaluaciones.asignaturaId, asignaturaId),
        isNull(notas.eliminadoAt),
        isNull(evaluaciones.eliminadoAt),
      ),
    );

  const totalRows = await db
    .select({ id: evaluaciones.id })
    .from(evaluaciones)
    .where(
      and(
        eq(evaluaciones.asignaturaId, asignaturaId),
        isNull(evaluaciones.eliminadoAt),
        eq(evaluaciones.esEncuesta, false),
      ),
    );
  const totalEvaluaciones = totalRows.length;

  if (rows.length === 0) {
    return { notaFinal: null, esPonderada: false, totalEvaluaciones, evaluacionesConNota: 0 };
  }

  const hasPonderacion = rows.some((r) => r.ponderacion !== null);

  if (hasPonderacion) {
    const weighted = rows.filter((r) => r.ponderacion !== null && r.nota !== null);
    if (weighted.length === 0) {
      return { notaFinal: null, esPonderada: true, totalEvaluaciones, evaluacionesConNota: 0 };
    }
    const sumPeso = weighted.reduce((acc, r) => acc + Number(r.ponderacion), 0);
    const sumProducto = weighted.reduce(
      (acc, r) => acc + Number(r.nota) * Number(r.ponderacion),
      0,
    );
    const notaFinal = sumPeso > 0 ? Math.round((sumProducto / sumPeso) * 10) / 10 : null;
    return {
      notaFinal,
      esPonderada: true,
      totalEvaluaciones,
      evaluacionesConNota: weighted.length,
    };
  }

  const withNota = rows.filter((r) => r.nota !== null);
  if (withNota.length === 0) {
    return { notaFinal: null, esPonderada: false, totalEvaluaciones, evaluacionesConNota: 0 };
  }
  const avg = withNota.reduce((acc, r) => acc + Number(r.nota), 0) / withNota.length;
  return {
    notaFinal: Math.round(avg * 10) / 10,
    esPonderada: false,
    totalEvaluaciones,
    evaluacionesConNota: withNota.length,
  };
}
