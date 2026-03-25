import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { evaluaciones, preguntas } from "@/db/schema";
import { logEvent } from "@/lib/observability/logger";
import {
  SURVEY_TEMPLATE_DEFINITIONS,
  SURVEY_TEMPLATE_KEYS,
  getTemplateScaleOptions,
} from "@/lib/surveyTemplates";

export async function generarEncuestasObligatoriasAlFinalizar(
  asignaturaId: string,
): Promise<number> {
  const db = getDb();
  let createdCount = 0;

  for (const templateKey of SURVEY_TEMPLATE_KEYS) {
    const definition = SURVEY_TEMPLATE_DEFINITIONS[templateKey];

    const [existing] = await db
      .select({ id: evaluaciones.id })
      .from(evaluaciones)
      .where(
        and(
          eq(evaluaciones.asignaturaId, asignaturaId),
          eq(evaluaciones.titulo, definition.title),
          isNull(evaluaciones.eliminadoAt),
        ),
      )
      .limit(1);

    if (existing) {
      continue;
    }

    const scaleOptions = getTemplateScaleOptions(templateKey);

    const [createdEvaluacion] = await db
      .insert(evaluaciones)
      .values({
        asignaturaId,
        titulo: definition.title,
        tipo: "formulario",
        instrucciones: `[OBLIGATORIA] ${definition.intro}`,
        intentosMax: definition.attemptsMax,
        publicada: true,
        fechaInicio: new Date(),
        createdAt: new Date(),
      })
      .returning({ id: evaluaciones.id });

    await db.insert(preguntas).values(
      definition.questions.map((enunciado, index) => ({
        evaluacionId: createdEvaluacion.id,
        enunciado,
        tipo: "opcion_multiple" as const,
        opciones: { ...scaleOptions },
        puntaje: "1",
        orden: index + 1,
      })),
    );

    createdCount += 1;
  }

  if (createdCount > 0) {
    logEvent({
      correlationId: `survey-lifecycle-${Date.now()}`,
      action: "mandatory_surveys_generated",
      result: "success",
      details: {
        asignaturaId,
        createdCount,
      },
    });
  }

  return createdCount;
}
