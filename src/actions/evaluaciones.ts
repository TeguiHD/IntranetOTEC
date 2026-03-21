"use server";

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
import { logEvent } from "@/lib/observability/logger";
import { sanitizeText } from "@/lib/sanitize";

import { requireActionActor, type MutationResult } from "./_security";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const sanitizeOptionalText = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const clean = sanitizeText(value).replace(/\s+/g, " ").trim();
  return clean.length > 0 ? clean : undefined;
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EvaluacionItem = {
  id: string;
  titulo: string;
  tipo: "formulario" | "tarea" | "examen" | "proyecto";
  ponderacion: string | null;
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
  tipo: "opcion_multiple" | "verdadero_falso" | "respuesta_corta" | "desarrollo";
  opciones: unknown;
  puntaje: string | null;
  orden: number | null;
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

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
      fechaInicio: evaluaciones.fechaInicio,
      fechaLimite: evaluaciones.fechaLimite,
      publicada: evaluaciones.publicada,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(evaluaciones.asignaturaId, asignaturaId),
        isNull(evaluaciones.eliminadoAt),
      ),
    )
    .orderBy(asc(evaluaciones.fechaLimite), asc(evaluaciones.createdAt));

  if (rows.length === 0) return [];

  // Fetch question counts for all evaluaciones in one query
  const counts = await db
    .select({
      evaluacionId: preguntas.evaluacionId,
      total: count(),
    })
    .from(preguntas)
    .where(
      and(
        isNull(preguntas.eliminadoAt),
      ),
    )
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

  const rows = await db
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
    .where(
      and(eq(preguntas.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)),
    )
    .orderBy(asc(preguntas.orden), asc(preguntas.id));

  return rows;
}

export async function obtenerResultadosEvaluacion(evaluacionId: string) {
  const actorResult = await requireActionActor("evaluacion_resultados", [
    "admin",
    "docente",
  ]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const results = await db
    .select({
      matriculaId: notas.matriculaId,
      nota: notas.nota,
      observacion: notas.observacion,
      fechaNota: notas.fechaNota,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
    })
    .from(notas)
    .innerJoin(matriculas, eq(notas.matriculaId, matriculas.id))
    .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(and(eq(notas.evaluacionId, evaluacionId), isNull(notas.eliminadoAt)))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  return results;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function crearEvaluacionAction(input: {
  asignaturaId: string;
  titulo: string;
  tipo: "formulario" | "tarea" | "examen" | "proyecto";
  ponderacion?: string;
  instrucciones?: string;
  fechaInicio?: string;
  fechaLimite?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_create", [
    "admin",
    "docente",
  ]);
  if (!actorResult.ok) return actorResult.result;

  const titulo = sanitizeText(input.titulo).trim();
  if (!titulo) {
    return { ok: false, code: "invalid_input", message: "El título es requerido." };
  }

  if (!input.asignaturaId) {
    return { ok: false, code: "invalid_input", message: "La asignatura es requerida." };
  }

  const tiposValidos = ["formulario", "tarea", "examen", "proyecto"] as const;
  if (!tiposValidos.includes(input.tipo)) {
    return { ok: false, code: "invalid_input", message: "Tipo de evaluación inválido." };
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
  const result = await crearEvaluacionAction({
    asignaturaId,
    titulo: getStringField(formData, "titulo"),
    tipo: getStringField(formData, "tipo") as "formulario" | "tarea" | "examen" | "proyecto",
    ponderacion: getStringField(formData, "ponderacion") || undefined,
    instrucciones: getStringField(formData, "instrucciones") || undefined,
    fechaInicio: getStringField(formData, "fechaInicio") || undefined,
    fechaLimite: getStringField(formData, "fechaLimite") || undefined,
  });

  revalidatePath("/admin/evaluaciones");
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${filterQuery}`);
}

export async function publicarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_publicar", [
    "admin",
    "docente",
  ]);
  if (!actorResult.ok) return actorResult.result;

  if (!id) {
    return { ok: false, code: "invalid_input", message: "ID de evaluación requerido." };
  }

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

    await db
      .update(evaluaciones)
      .set({ publicada: true })
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
  const result = await publicarEvaluacionAction(getStringField(formData, "evaluacionId"));

  revalidatePath("/admin/evaluaciones");
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${filterQuery}`);
}

export async function eliminarEvaluacionAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("evaluacion_delete", [
    "admin",
    "docente",
  ]);
  if (!actorResult.ok) return actorResult.result;

  if (!id) {
    return { ok: false, code: "invalid_input", message: "ID de evaluación requerido." };
  }

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
  const result = await eliminarEvaluacionAction(getStringField(formData, "evaluacionId"));

  revalidatePath("/admin/evaluaciones");
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${filterQuery}`);
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
  const actorResult = await requireActionActor("pregunta_create", [
    "admin",
    "docente",
  ]);
  if (!actorResult.ok) return actorResult.result;

  const enunciado = sanitizeText(input.enunciado).trim();
  if (!enunciado) {
    return { ok: false, code: "invalid_input", message: "El enunciado es requerido." };
  }

  if (!input.evaluacionId) {
    return { ok: false, code: "invalid_input", message: "ID de evaluación requerido." };
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

    // Build opciones jsonb
    let opcionesJson: unknown = null;
    if (input.tipo === "opcion_multiple" && input.opciones && input.opciones.length > 0) {
      opcionesJson = {
        opciones: input.opciones,
        correcta: input.correcta ?? 0,
      };
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

  // Parse multiple opciones fields
  const opcionesRaw = formData.getAll("opcion");
  const opciones = opcionesRaw
    .map((o) => (typeof o === "string" ? o.trim() : ""))
    .filter(Boolean);

  const correctaRaw = getStringField(formData, "correcta");
  const correcta = correctaRaw ? Number.parseInt(correctaRaw, 10) : 0;

  const result = await agregarPreguntaAction({
    evaluacionId,
    enunciado: getStringField(formData, "enunciado"),
    tipo: getStringField(formData, "tipo") as
      | "opcion_multiple"
      | "verdadero_falso"
      | "respuesta_corta"
      | "desarrollo",
    opciones: opciones.length > 0 ? opciones : undefined,
    correcta: Number.isFinite(correcta) ? correcta : undefined,
    puntaje: getStringField(formData, "puntaje") || undefined,
  });

  revalidatePath("/admin/evaluaciones");
  const filterQuery = asignaturaId ? `&asignaturaId=${encodeURIComponent(asignaturaId)}` : "";
  redirect(`/admin/evaluaciones?state=${result.ok ? result.code : "error"}${filterQuery}`);
}

export async function enviarRespuestasAction(input: {
  evaluacionId: string;
  respuestas: { preguntaId: string; respuesta: string }[];
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("alumno_enviar_respuestas", ["alumno"]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.evaluacionId || !input.respuestas || input.respuestas.length === 0) {
    return { ok: false, code: "invalid_input", message: "Datos de respuesta inválidos." };
  }

  const db = getDb();

  try {
    // Verify evaluacion exists and is published
    const [ev] = await db
      .select({
        id: evaluaciones.id,
        publicada: evaluaciones.publicada,
        asignaturaId: evaluaciones.asignaturaId,
        intentosMax: evaluaciones.intentosMax,
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
      return {
        ok: false,
        code: "evaluacion_not_found",
        message: "Evaluación no encontrada o no disponible.",
      };
    }

    // Verify alumno is enrolled in the asignatura
    const [matricula] = await db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.alumnoId, actorResult.actor.userId),
          eq(matriculas.asignaturaId, ev.asignaturaId),
          isNull(matriculas.eliminadoAt),
        ),
      )
      .limit(1);

    if (!matricula) {
      return {
        ok: false,
        code: "not_enrolled",
        message: "No tienes matrícula en esta asignatura.",
      };
    }

    // Check existing intento count
    const [intentoRow] = await db
      .select({ maxIntento: respuestasFormulario.intento })
      .from(respuestasFormulario)
      .where(
        and(
          eq(respuestasFormulario.evaluacionId, input.evaluacionId),
          eq(respuestasFormulario.matriculaId, matricula.id),
        ),
      )
      .orderBy(asc(respuestasFormulario.intento))
      .limit(1);

    // Determine current attempt number
    const intentosUsados = intentoRow ? intentoRow.maxIntento ?? 1 : 0;
    const intentosMax = ev.intentosMax ?? 1;
    if (intentosUsados >= intentosMax) {
      return {
        ok: false,
        code: "max_intentos_reached",
        message: "Has alcanzado el número máximo de intentos para esta evaluación.",
      };
    }
    const currentIntento = intentosUsados + 1;

    // Load questions to auto-grade
    const preguntaRows = await db
      .select({
        id: preguntas.id,
        tipo: preguntas.tipo,
        opciones: preguntas.opciones,
        puntaje: preguntas.puntaje,
      })
      .from(preguntas)
      .where(
        and(
          eq(preguntas.evaluacionId, input.evaluacionId),
          isNull(preguntas.eliminadoAt),
        ),
      );

    const preguntaMap = new Map(preguntaRows.map((p) => [p.id, p]));
    let puntosObtenidos = 0;
    let puntosTotal = 0;

    // Insert respuestas and auto-grade
    for (const resp of input.respuestas) {
      const pregunta = preguntaMap.get(resp.preguntaId);
      if (!pregunta) continue;

      const puntaje = Number(pregunta.puntaje ?? "1");
      puntosTotal += puntaje;

      let esCorrecta: boolean | null = null;

      if (pregunta.tipo === "opcion_multiple") {
        const opts = pregunta.opciones as { opciones: string[]; correcta: number } | null;
        if (opts) {
          esCorrecta = resp.respuesta === String(opts.correcta);
        }
      } else if (pregunta.tipo === "verdadero_falso") {
        // Expect respuesta to be "true" or "false" — stored in opciones as { correcta: "true" | "false" }
        const opts = pregunta.opciones as { correcta: string } | null;
        if (opts) {
          esCorrecta = resp.respuesta === opts.correcta;
        }
      }

      if (esCorrecta === true) {
        puntosObtenidos += puntaje;
      }

      await db.insert(respuestasFormulario).values({
        evaluacionId: input.evaluacionId,
        matriculaId: matricula.id,
        preguntaId: resp.preguntaId,
        respuesta: resp.respuesta,
        esCorrecta,
        intento: currentIntento,
        createdAt: new Date(),
      });
    }

    // Compute nota on 1.0 - 7.0 scale
    const notaCalculada =
      puntosTotal > 0
        ? Math.round((1 + 6 * (puntosObtenidos / puntosTotal)) * 10) / 10
        : 1.0;

    // Upsert nota — use ON CONFLICT if record already exists
    const [existingNota] = await db
      .select({ id: notas.id })
      .from(notas)
      .where(
        and(
          eq(notas.evaluacionId, input.evaluacionId),
          eq(notas.matriculaId, matricula.id),
        ),
      )
      .limit(1);

    if (existingNota) {
      await db
        .update(notas)
        .set({
          nota: String(notaCalculada),
          calificadoPor: null,
          fechaNota: new Date(),
          eliminadoAt: null,
        })
        .where(eq(notas.id, existingNota.id));
    } else {
      await db.insert(notas).values({
        evaluacionId: input.evaluacionId,
        matriculaId: matricula.id,
        nota: String(notaCalculada),
        calificadoPor: null,
        fechaNota: new Date(),
      });
    }

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "respuestasFormulario",
      entidadId: input.evaluacionId,
      payload: { intento: currentIntento, nota: notaCalculada },
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

  // Collect all respuestas — keys like respuesta_<preguntaId>
  const respuestas: { preguntaId: string; respuesta: string }[] = [];
  const entries = Array.from(formData.entries());
  for (const [key, value] of entries) {
    if (key.startsWith("respuesta_") && typeof value === "string") {
      const preguntaId = key.replace("respuesta_", "");
      respuestas.push({ preguntaId, respuesta: value });
    }
  }

  const result = await enviarRespuestasAction({ evaluacionId, respuestas });

  revalidatePath(`/alumno/evaluaciones/${evaluacionId}`);
  redirect(
    `/alumno/evaluaciones/${evaluacionId}?state=${result.ok ? result.code : "error"}`,
  );
}
