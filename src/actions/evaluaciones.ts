"use server";

import { and, asc, count, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  asignaturas,
  evaluaciones,
  matriculas,
  notas,
  preguntas,
  respuestasFormulario,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { sendEmail, templateEvaluacionPublicada } from "@/lib/email";
import { enviarPushADestinatarios } from "@/actions/notificaciones";
import { logEvent } from "@/lib/observability/logger";
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
import { requireActionActor, type MutationResult } from "./_security";

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

export type EvaluacionItem = {
  id: string;
  titulo: string;
  tipo: "formulario" | "tarea" | "examen" | "proyecto";
  ponderacion: string | null;
  instrucciones: string | null;
  intentosMax: number | null;
  fechaInicio: Date | null;
  fechaLimite: Date | null;
  publicada: boolean | null;
  asignaturaNombre: string;
  totalPreguntas: number;
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

export async function listarEvaluacionesByAsignatura(
  asignaturaId: string,
): Promise<EvaluacionItem[]> {
  const actorResult = await requireActionActor("evaluacion_list", ["admin", "docente"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: evaluaciones.id,
      titulo: evaluaciones.titulo,
      tipo: evaluaciones.tipo,
      ponderacion: evaluaciones.ponderacion,
      instrucciones: evaluaciones.instrucciones,
      intentosMax: evaluaciones.intentosMax,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      publicada: evaluaciones.publicada,
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

  const countMap = new Map(counts.map((c) => [c.evaluacionId, Number(c.total)]));

  return rows.map((r) => ({
    ...r,
    totalPreguntas: countMap.get(r.id) ?? 0,
  }));
}

export async function listarEvaluacionesAlumno(): Promise<EvaluacionItem[]> {
  const actorResult = await requireActionActor("alumno_evaluacion_list", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: evaluaciones.id,
      titulo: evaluaciones.titulo,
      tipo: evaluaciones.tipo,
      ponderacion: evaluaciones.ponderacion,
      instrucciones: evaluaciones.instrucciones,
      intentosMax: evaluaciones.intentosMax,
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      publicada: evaluaciones.publicada,
      asignaturaNombre: asignaturas.nombre,
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

  const countMap = new Map(counts.map((c) => [c.evaluacionId, Number(c.total)]));

  return rows.map((r) => ({
    ...r,
    totalPreguntas: countMap.get(r.id) ?? 0,
  }));
}

export async function listarPreguntasByEvaluacion(
  evaluacionId: string,
): Promise<PreguntaItem[]> {
  const actorResult = await requireActionActor("evaluacion_preguntas_list", [
    "admin",
    "docente",
    "alumno",
  ]);
  if (!actorResult.ok) return [];

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
}

export async function obtenerResultadosEvaluacion(evaluacionId: string) {
  const actorResult = await requireActionActor("evaluacion_resultados", ["admin", "docente"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
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
}

export async function crearEvaluacionAction(input: {
  asignaturaId: string;
  titulo: string;
  tipo: "formulario" | "tarea" | "examen" | "proyecto";
  ponderacion?: string;
  instrucciones?: string;
  fechaInicio?: string;
  fechaLimite?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_create", ["admin", "docente"]);
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
    const [asignatura] = await db
      .select({ id: asignaturas.id })
      .from(asignaturas)
      .where(eq(asignaturas.id, input.asignaturaId))
      .limit(1);

    if (!asignatura) {
      return { ok: false, code: "asignatura_not_found", message: "Asignatura no encontrada." };
    }

    const periodoCheck = await assertPeriodoAbiertoByAsignaturaId(input.asignaturaId);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    const [created] = await db
      .insert(evaluaciones)
      .values({
        asignaturaId: input.asignaturaId,
        titulo,
        tipo: input.tipo,
        ponderacion: input.ponderacion || null,
        instrucciones: sanitizeOptionalText(input.instrucciones),
        fechaInicio: input.fechaInicio ? new Date(input.fechaInicio) : null,
        fechaLimite: input.fechaLimite ? new Date(input.fechaLimite) : null,
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
  });

  revalidatePath("/admin/evaluaciones");
  const periodoQuery = periodoId ? `&periodoId=${encodeURIComponent(periodoId)}` : "";
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${periodoQuery}${filterQuery}`);
}

export async function crearPlantillaEncuestaAction(input: {
  asignaturaId: string;
  plantilla: SurveyTemplateKey;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_template_create", ["admin"]);
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
    const [subject] = await db
      .select({ id: asignaturas.id, estado: asignaturas.estado })
      .from(asignaturas)
      .where(eq(asignaturas.id, parsed.data.asignaturaId))
      .limit(1);

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
  const plantillaRaw = getStringField(formData, "plantilla");

  const result = await crearPlantillaEncuestaAction({
    asignaturaId,
    plantilla: plantillaRaw as SurveyTemplateKey,
  });

  revalidatePath("/admin/evaluaciones");
  const periodoQuery = periodoId ? `&periodoId=${encodeURIComponent(periodoId)}` : "";
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : result.code}${periodoQuery}${filterQuery}`);
}

export async function publicarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_publicar", ["admin", "docente"]);
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: evaluaciones.id, publicada: evaluaciones.publicada })
      .from(evaluaciones)
      .where(and(eq(evaluaciones.id, id), isNull(evaluaciones.eliminadoAt)))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }

    if (existing.publicada) {
      return { ok: true, code: "already_published" };
    }

    const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    await db.update(evaluaciones).set({ publicada: true }).where(eq(evaluaciones.id, id));

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
      const alumnos = await db
        .select({ id: usuarios.id, nombre: usuarios.nombre, apellido: usuarios.apellido, email: usuarios.email })
        .from(matriculas)
        .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
        .where(
          and(
            eq(matriculas.asignaturaId, evalData.asignaturaId),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
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
  const result = await publicarEvaluacionAction(getStringField(formData, "evaluacionId"));

  revalidatePath("/admin/evaluaciones");
  const periodoQuery = periodoId ? `&periodoId=${encodeURIComponent(periodoId)}` : "";
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${periodoQuery}${filterQuery}`);
}

export async function despublicarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_despublicar", ["admin"]);
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
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

    const periodoCheck = await assertPeriodoAbiertoByEvaluacionId(id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    await db.update(evaluaciones).set({ publicada: false }).where(eq(evaluaciones.id, id));

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
  const result = await despublicarEvaluacionAction(getStringField(formData, "evaluacionId"));

  revalidatePath("/admin/evaluaciones");
  const periodoQuery = periodoId ? `&periodoId=${encodeURIComponent(periodoId)}` : "";
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${periodoQuery}${filterQuery}`);
}

export async function eliminarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_delete", ["admin", "docente"]);
  if (!actorResult.ok) return actorResult.result;
  if (!id) return { ok: false, code: "invalid_input", message: "ID requerido." };

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: evaluaciones.id, eliminadoAt: evaluaciones.eliminadoAt })
      .from(evaluaciones)
      .where(eq(evaluaciones.id, id))
      .limit(1);

    if (!existing) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
    }

    if (existing.eliminadoAt) {
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
  const result = await eliminarEvaluacionAction(getStringField(formData, "evaluacionId"));

  revalidatePath("/admin/evaluaciones");
  const periodoQuery = periodoId ? `&periodoId=${encodeURIComponent(periodoId)}` : "";
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${periodoQuery}${filterQuery}`);
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
  const actorResult = await requireActionActor("pregunta_create", ["admin", "docente"]);
  if (!actorResult.ok) return actorResult.result;

  const enunciado = sanitizeText(input.enunciado).trim();
  if (!enunciado || !input.evaluacionId) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const db = getDb();

  try {
    const [ev] = await db
      .select({ id: evaluaciones.id })
      .from(evaluaciones)
      .where(and(eq(evaluaciones.id, input.evaluacionId), isNull(evaluaciones.eliminadoAt)))
      .limit(1);

    if (!ev) {
      return { ok: false, code: "evaluacion_not_found", message: "Evaluación no encontrada." };
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
    } else if (input.tipo === "verdadero_falso") {
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
    tipo === "verdadero_falso"
      ? correctaValue === "true"
        ? 1
        : 0
      : Number.parseInt(correctaValue, 10);

  const result = await agregarPreguntaAction({
    evaluacionId,
    enunciado: getStringField(formData, "enunciado"),
    tipo,
    opciones: opciones.length > 0 ? opciones : undefined,
    correcta: Number.isFinite(correcta) ? correcta : undefined,
    puntaje: getStringField(formData, "puntaje") || undefined,
    orden: Number.parseInt(getStringField(formData, "orden"), 10) || undefined,
  });

  revalidatePath("/admin/evaluaciones");
  const periodoQuery = periodoId ? `&periodoId=${encodeURIComponent(periodoId)}` : "";
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  const evaluacionQuery = evaluacionId ? `&evaluacionId=${encodeURIComponent(evaluacionId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${periodoQuery}${filterQuery}${evaluacionQuery}`);
}

export async function enviarRespuestasAction(input: {
  evaluacionId: string;
  respuestas: { preguntaId: string; respuesta: string }[];
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("alumno_enviar_respuestas", ["alumno"]);
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
          isNull(matriculas.eliminadoAt),
        ),
      )
      .limit(1);

    if (!matricula) {
      return { ok: false, code: "not_enrolled", message: "No tienes matrícula en esta asignatura." };
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
    const currentIntento = intentosUsados + 1;

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
    let puntosTotal = 0;
    const scaleAnswers: number[] = [];

    for (const resp of input.respuestas) {
      const pregunta = preguntaMap.get(resp.preguntaId);
      if (!pregunta) continue;

      const respuesta = sanitizeRespuesta(resp.respuesta);
      if (!respuesta) {
        return {
          ok: false,
          code: "invalid_input",
          message: "Se detectaron respuestas vacias o invalidas.",
        };
      }

      const puntaje = Number(pregunta.puntaje ?? "1");
      puntosTotal += puntaje;

      let esCorrecta: boolean | null = null;
      if (pregunta.tipo === "opcion_multiple") {
        const scaleOptions = coerceScaleQuestionOptions(pregunta.opciones);
        if (scaleOptions) {
          const parsedValue = parseScaleAnswer(respuesta, scaleOptions);
          if (parsedValue === null) {
            return {
              ok: false,
              code: "invalid_input",
              message: "Se detecto una respuesta fuera del rango permitido.",
            };
          }

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
        const opts = pregunta.opciones as { correcta: string } | null;
        if (opts) esCorrecta = respuesta === opts.correcta;
      }

      if (esCorrecta === true) puntosObtenidos += puntaje;

      await db.insert(respuestasFormulario).values({
        evaluacionId: input.evaluacionId,
        matriculaId: matricula.id,
        preguntaId: resp.preguntaId,
        respuesta,
        esCorrecta,
        intento: currentIntento,
        createdAt: now,
      });
    }

    const scaleAverage =
      scaleAnswers.length > 0
        ? scaleAnswers.reduce((accumulator, value) => accumulator + value, 0) /
          scaleAnswers.length
        : null;

    const rawNota =
      puntosTotal > 0
        ? 1 + 6 * (puntosObtenidos / puntosTotal)
        : scaleAverage !== null
          ? scaleAverage
          : 1.0;

    const notaCalculada = Math.round(Math.max(1, Math.min(7, rawNota)) * 10) / 10;

    const [existingNota] = await db
      .select({ id: notas.id })
      .from(notas)
      .where(and(eq(notas.evaluacionId, input.evaluacionId), eq(notas.matriculaId, matricula.id)))
      .limit(1);

    if (existingNota) {
      await db
        .update(notas)
        .set({
          nota: String(notaCalculada),
          calificadoPor: null,
          fechaNota: now,
          eliminadoAt: null,
          eliminadoPor: null,
        })
        .where(eq(notas.id, existingNota.id));
    } else {
      await db.insert(notas).values({
        evaluacionId: input.evaluacionId,
        matriculaId: matricula.id,
        nota: String(notaCalculada),
        calificadoPor: null,
        fechaNota: now,
      });
    }

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
        escalaPromedio: scaleAverage,
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
  const respuestas: { preguntaId: string; respuesta: string }[] = [];

  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith("respuesta_") && typeof value === "string") {
      respuestas.push({
        preguntaId: key.replace("respuesta_", ""),
        respuesta: value,
      });
    }
  }

  const result = await enviarRespuestasAction({ evaluacionId, respuestas });
  revalidatePath(`/alumno/evaluaciones/${evaluacionId}`);
  redirect(`/alumno/evaluaciones/${evaluacionId}?state=${result.ok ? result.code : "error"}`);
}
