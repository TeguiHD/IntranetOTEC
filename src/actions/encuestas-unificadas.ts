"use server";

import { and, asc, count, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  asignaturas,
  encuestaAsignaciones,
  evaluaciones,
  matriculas,
  preguntas,
  respuestasFormulario,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";
import { sanitizeText } from "@/lib/sanitize";

import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

// ----------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------

export type EncuestaListItem = {
  id: string;
  titulo: string;
  instrucciones: string | null;
  audiencia: "alumnos" | "docentes" | "todos" | null;
  obligatoria: boolean | null;
  estadoEncuesta: "borrador" | "activa" | "cerrada" | null;
  plantillaOrigen: string | null;
  totalPreguntas: number;
  totalAsignados: number;
  totalCompletados: number;
  createdAt: Date | null;
};

export type PreguntaEncuesta = {
  id: string;
  enunciado: string;
  tipo: string;
  opciones: unknown;
  orden: number | null;
};

export type RespuestaResumen = {
  usuarioId: string;
  usuarioNombre: string;
  usuarioApellido: string;
  usuarioRut: string | null;
  completada: boolean;
  completadaAt: Date | null;
};

// ----------------------------------------------------------------
// ADMIN: Crear encuesta
// ----------------------------------------------------------------

export async function crearEncuestaAction(input: {
  titulo: string;
  instrucciones?: string;
  audiencia: "alumnos" | "docentes" | "todos";
  obligatoria: boolean;
  // asignaturaId is required for the evaluaciones FK — use a sentinel for global surveys
  asignaturaId: string;
}): Promise<MutationResult & { id?: string }> {
  const actorResult = await requireActionActor("admin_encuesta_crear", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const titulo = sanitizeText(input.titulo).trim();
  if (!titulo) return { ok: false, code: "invalid_input", message: "El título es requerido." };
  if (!input.asignaturaId) return { ok: false, code: "invalid_input", message: "Asignatura requerida." };

  const db = getDb();

  try {
    const [created] = await db
      .insert(evaluaciones)
      .values({
        asignaturaId: input.asignaturaId,
        titulo,
        tipo: "formulario",
        instrucciones: input.instrucciones ? sanitizeText(input.instrucciones).trim() : null,
        publicada: false,
        esEncuesta: true,
        audiencia: input.audiencia,
        obligatoria: input.obligatoria,
        estadoEncuesta: "borrador",
        creadoPor: actorResult.actor.userId,
        createdAt: new Date(),
      })
      .returning({ id: evaluaciones.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "encuestas",
      entidadId: created.id,
      payload: { titulo, audiencia: input.audiencia, obligatoria: input.obligatoria },
      exitoso: true,
    });

    revalidatePath("/admin/encuestas-builder");
    return { ok: true, code: "encuesta_created", id: created.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "encuesta_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "encuesta_create_failed", message: "No fue posible crear la encuesta." };
  }
}

export async function crearEncuestaFormAction(formData: FormData): Promise<void> {
  const result = await crearEncuestaAction({
    titulo: getStringField(formData, "titulo"),
    instrucciones: getStringField(formData, "instrucciones") || undefined,
    audiencia: (getStringField(formData, "audiencia") || "alumnos") as "alumnos" | "docentes" | "todos",
    obligatoria: getStringField(formData, "obligatoria") === "true",
    asignaturaId: getStringField(formData, "asignaturaId"),
  });

  revalidatePath("/admin/encuestas-builder");
  if (result.ok && result.id) {
    redirect(`/admin/encuestas-builder/${result.id}?state=encuesta_created`);
  } else {
    redirect(`/admin/encuestas-builder?state=${result.ok ? result.code : "error"}`);
  }
}

// ----------------------------------------------------------------
// ADMIN: Agregar pregunta a encuesta
// ----------------------------------------------------------------

export async function agregarPreguntaEncuestaAction(input: {
  evaluacionId: string;
  enunciado: string;
  tipo: "likert" | "si_no" | "texto_libre" | "opcion_multiple";
  escalaMin?: number;
  escalaMax?: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
  opciones?: string[]; // for opcion_multiple
  orden?: number;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_pregunta_encuesta_crear", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const enunciado = sanitizeText(input.enunciado).trim();
  if (!enunciado || !input.evaluacionId) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const db = getDb();

  const [ev] = await db
    .select({ id: evaluaciones.id, esEncuesta: evaluaciones.esEncuesta })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.id, input.evaluacionId), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  if (!ev) return { ok: false, code: "not_found", message: "Encuesta no encontrada." };

  let opcionesJson: unknown = null;

  if (input.tipo === "likert") {
    const min = input.escalaMin ?? 1;
    const max = input.escalaMax ?? 5;
    opcionesJson = {
      modo: "likert",
      escalaMin: min,
      escalaMax: max,
      opciones: Array.from({ length: max - min + 1 }, (_, i) => String(min + i)),
      etiquetaMin: input.etiquetaMin ?? "Totalmente en desacuerdo",
      etiquetaMax: input.etiquetaMax ?? "Totalmente de acuerdo",
    };
  } else if (input.tipo === "si_no") {
    opcionesJson = { opciones: ["Sí", "No"] };
  } else if (input.tipo === "opcion_multiple" && input.opciones?.length) {
    opcionesJson = {
      opciones: input.opciones.map((o) => sanitizeText(o).trim()).filter(Boolean),
    };
  }

  try {
    const [maxOrdenRow] = await db
      .select({ maxOrden: count() })
      .from(preguntas)
      .where(and(eq(preguntas.evaluacionId, input.evaluacionId), isNull(preguntas.eliminadoAt)));

    const orden = input.orden ?? (Number(maxOrdenRow?.maxOrden ?? 0) + 1);

    await db.insert(preguntas).values({
      evaluacionId: input.evaluacionId,
      enunciado,
      tipo: input.tipo,
      opciones: opcionesJson,
      puntaje: "1",
      orden,
    });

    revalidatePath(`/admin/encuestas-builder/${input.evaluacionId}`);
    return { ok: true, code: "pregunta_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "pregunta_encuesta_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "pregunta_create_failed", message: "No fue posible agregar la pregunta." };
  }
}

export async function agregarPreguntaEncuestaFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const tipo = getStringField(formData, "tipo") as "likert" | "si_no" | "texto_libre" | "opcion_multiple";

  const opciones = formData
    .getAll("opcion")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);

  const result = await agregarPreguntaEncuestaAction({
    evaluacionId,
    enunciado: getStringField(formData, "enunciado"),
    tipo,
    escalaMin: Number(getStringField(formData, "escalaMin")) || 1,
    escalaMax: Number(getStringField(formData, "escalaMax")) || 5,
    etiquetaMin: getStringField(formData, "etiquetaMin") || undefined,
    etiquetaMax: getStringField(formData, "etiquetaMax") || undefined,
    opciones: opciones.length > 0 ? opciones : undefined,
  });

  revalidatePath(`/admin/encuestas-builder/${evaluacionId}`);
  redirect(`/admin/encuestas-builder/${evaluacionId}?state=${result.ok ? result.code : "error"}`);
}

// ----------------------------------------------------------------
// ADMIN: Eliminar pregunta
// ----------------------------------------------------------------

export async function eliminarPreguntaEncuestaFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionActor("admin_pregunta_encuesta_delete", ["admin"]);
  const evaluacionId = getStringField(formData, "evaluacionId");
  const preguntaId = getStringField(formData, "preguntaId");

  if (!actorResult.ok || !preguntaId) {
    redirect(`/admin/encuestas-builder/${evaluacionId}?state=error`);
    return;
  }

  const db = getDb();
  await db
    .update(preguntas)
    .set({ eliminadoAt: new Date(), eliminadoPor: actorResult.actor.userId })
    .where(eq(preguntas.id, preguntaId));

  revalidatePath(`/admin/encuestas-builder/${evaluacionId}`);
  redirect(`/admin/encuestas-builder/${evaluacionId}?state=pregunta_deleted`);
}

// ----------------------------------------------------------------
// ADMIN: Lanzar encuesta (activar + asignar a usuarios)
// ----------------------------------------------------------------

export async function lanzarEncuestaAction(input: {
  evaluacionId: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_encuesta_lanzar", ["admin"]);
  if (!actorResult.ok) return actorResult.result;

  const db = getDb();

  const [ev] = await db
    .select({
      id: evaluaciones.id,
      audiencia: evaluaciones.audiencia,
      asignaturaId: evaluaciones.asignaturaId,
      estadoEncuesta: evaluaciones.estadoEncuesta,
      esEncuesta: evaluaciones.esEncuesta,
    })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.id, input.evaluacionId), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  if (!ev || !ev.esEncuesta) {
    return { ok: false, code: "not_found", message: "Encuesta no encontrada." };
  }

  if (ev.estadoEncuesta === "activa") {
    return { ok: true, code: "already_active" };
  }

  if (ev.estadoEncuesta === "cerrada") {
    return { ok: false, code: "already_closed", message: "La encuesta ya está cerrada." };
  }

  // Verify at least 1 question
  const [qCount] = await db
    .select({ total: count() })
    .from(preguntas)
    .where(and(eq(preguntas.evaluacionId, input.evaluacionId), isNull(preguntas.eliminadoAt)));

  if (!qCount || Number(qCount.total) === 0) {
    return { ok: false, code: "no_preguntas", message: "La encuesta no tiene preguntas." };
  }

  // Activate
  await db
    .update(evaluaciones)
    .set({ estadoEncuesta: "activa", publicada: true })
    .where(eq(evaluaciones.id, input.evaluacionId));

  // Gather users to assign based on audience
  let userIds: string[] = [];

  if (ev.audiencia === "alumnos" || ev.audiencia === "todos") {
    const alumnos = await db
      .select({ id: matriculas.alumnoId })
      .from(matriculas)
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .where(
        and(
          eq(matriculas.asignaturaId, ev.asignaturaId),
          isNull(matriculas.eliminadoAt),
          eq(usuarios.activo, true),
        ),
      );
    userIds.push(...alumnos.map((a) => a.id));
  }

  if (ev.audiencia === "docentes" || ev.audiencia === "todos") {
    const [asig] = await db
      .select({ docenteId: asignaturas.docenteId })
      .from(asignaturas)
      .where(eq(asignaturas.id, ev.asignaturaId))
      .limit(1);
    if (asig?.docenteId) userIds.push(asig.docenteId);
  }

  // Remove duplicates
  userIds = [...new Set(userIds)];

  if (userIds.length > 0) {
    await db
      .insert(encuestaAsignaciones)
      .values(
        userIds.map((uid) => ({
          evaluacionId: input.evaluacionId,
          usuarioId: uid,
          completada: false,
        })),
      )
      .onConflictDoNothing();
  }

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "encuestas",
    entidadId: input.evaluacionId,
    payload: { accion: "lanzar", totalAsignados: userIds.length },
    exitoso: true,
  });

  revalidatePath("/admin/encuestas-builder");
  return { ok: true, code: "encuesta_lanzada" };
}

export async function lanzarEncuestaFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const result = await lanzarEncuestaAction({ evaluacionId });
  revalidatePath(`/admin/encuestas-builder/${evaluacionId}`);
  redirect(`/admin/encuestas-builder/${evaluacionId}?state=${result.ok ? result.code : result.code}`);
}

// ----------------------------------------------------------------
// ADMIN: Cerrar encuesta
// ----------------------------------------------------------------

export async function cerrarEncuestaFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionActor("admin_encuesta_cerrar", ["admin"]);
  const evaluacionId = getStringField(formData, "evaluacionId");

  if (!actorResult.ok) {
    redirect(`/admin/encuestas-builder/${evaluacionId}?state=error`);
    return;
  }

  const db = getDb();
  await db
    .update(evaluaciones)
    .set({ estadoEncuesta: "cerrada", publicada: false })
    .where(eq(evaluaciones.id, evaluacionId));

  revalidatePath("/admin/encuestas-builder");
  redirect(`/admin/encuestas-builder/${evaluacionId}?state=encuesta_cerrada`);
}

// ----------------------------------------------------------------
// ADMIN: Eliminar encuesta
// ----------------------------------------------------------------

export async function eliminarEncuestaFormAction(formData: FormData): Promise<void> {
  const actorResult = await requireActionActor("admin_encuesta_delete", ["admin"]);
  const evaluacionId = getStringField(formData, "evaluacionId");

  if (!actorResult.ok) {
    redirect("/admin/encuestas-builder?state=error");
    return;
  }

  const db = getDb();
  await db
    .update(evaluaciones)
    .set({ eliminadoAt: new Date(), eliminadoPor: actorResult.actor.userId })
    .where(eq(evaluaciones.id, evaluacionId));

  revalidatePath("/admin/encuestas-builder");
  redirect("/admin/encuestas-builder?state=encuesta_deleted");
}

// ----------------------------------------------------------------
// ADMIN: List all surveys
// ----------------------------------------------------------------

export async function listarEncuestasAdmin(asignaturaId?: string): Promise<EncuestaListItem[]> {
  const actorResult = await requireActionActor("admin_encuestas_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: evaluaciones.id,
      titulo: evaluaciones.titulo,
      instrucciones: evaluaciones.instrucciones,
      audiencia: evaluaciones.audiencia,
      obligatoria: evaluaciones.obligatoria,
      estadoEncuesta: evaluaciones.estadoEncuesta,
      plantillaOrigen: evaluaciones.plantillaOrigen,
      createdAt: evaluaciones.createdAt,
    })
    .from(evaluaciones)
    .where(
      and(
        eq(evaluaciones.esEncuesta, true),
        isNull(evaluaciones.eliminadoAt),
        ...(asignaturaId ? [eq(evaluaciones.asignaturaId, asignaturaId)] : []),
      ),
    )
    .orderBy(asc(evaluaciones.createdAt));

  if (rows.length === 0) return [];

  const evalIds = rows.map((r) => r.id);

  const [pregCounts, asigCounts] = await Promise.all([
    db
      .select({ evaluacionId: preguntas.evaluacionId, total: count() })
      .from(preguntas)
      .where(isNull(preguntas.eliminadoAt))
      .groupBy(preguntas.evaluacionId),
    db
      .select({
        evaluacionId: encuestaAsignaciones.evaluacionId,
        total: count(),
        completados: count(encuestaAsignaciones.completadaAt),
      })
      .from(encuestaAsignaciones)
      .groupBy(encuestaAsignaciones.evaluacionId),
  ]);

  const pregMap = new Map(pregCounts.map((c) => [c.evaluacionId, Number(c.total)]));
  const asigMap = new Map(
    asigCounts.map((c) => [
      c.evaluacionId,
      { total: Number(c.total), completados: Number(c.completados) },
    ]),
  );

  return rows
    .filter((r) => evalIds.includes(r.id))
    .map((r) => ({
      ...r,
      totalPreguntas: pregMap.get(r.id) ?? 0,
      totalAsignados: asigMap.get(r.id)?.total ?? 0,
      totalCompletados: asigMap.get(r.id)?.completados ?? 0,
    }));
}

// ----------------------------------------------------------------
// ADMIN: Get single survey detail with preguntas
// ----------------------------------------------------------------

export async function obtenerEncuestaDetalle(evaluacionId: string) {
  const actorResult = await requireActionActor("admin_encuesta_detalle", ["admin"]);
  if (!actorResult.ok) return null;

  const db = getDb();

  const [ev] = await db
    .select({
      id: evaluaciones.id,
      titulo: evaluaciones.titulo,
      instrucciones: evaluaciones.instrucciones,
      audiencia: evaluaciones.audiencia,
      obligatoria: evaluaciones.obligatoria,
      estadoEncuesta: evaluaciones.estadoEncuesta,
      plantillaOrigen: evaluaciones.plantillaOrigen,
      asignaturaId: evaluaciones.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
      createdAt: evaluaciones.createdAt,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(evaluaciones.id, evaluacionId),
        eq(evaluaciones.esEncuesta, true),
        isNull(evaluaciones.eliminadoAt),
      ),
    )
    .limit(1);

  if (!ev) return null;

  const pregs = await db
    .select({
      id: preguntas.id,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      opciones: preguntas.opciones,
      orden: preguntas.orden,
    })
    .from(preguntas)
    .where(and(eq(preguntas.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)))
    .orderBy(asc(preguntas.orden), asc(preguntas.id));

  const asigs = await db
    .select({
      usuarioId: encuestaAsignaciones.usuarioId,
      usuarioNombre: usuarios.nombre,
      usuarioApellido: usuarios.apellido,
      usuarioRut: usuarios.rut,
      completada: encuestaAsignaciones.completada,
      completadaAt: encuestaAsignaciones.completadaAt,
    })
    .from(encuestaAsignaciones)
    .innerJoin(usuarios, eq(encuestaAsignaciones.usuarioId, usuarios.id))
    .where(eq(encuestaAsignaciones.evaluacionId, evaluacionId))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));

  return { ...ev, preguntas: pregs, asignaciones: asigs };
}

// ----------------------------------------------------------------
// USUARIO: Listar encuestas pendientes propias
// ----------------------------------------------------------------

export type EncuestaPendiente = {
  evaluacionId: string;
  titulo: string;
  instrucciones: string | null;
  obligatoria: boolean | null;
  asignaturaNombre: string;
};

export async function listarMisEncuestasPendientes(): Promise<EncuestaPendiente[]> {
  const actorResult = await requireActionActor("usuario_encuestas_pendientes", [
    "alumno",
    "docente",
    "admin",
  ]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({
      evaluacionId: encuestaAsignaciones.evaluacionId,
      titulo: evaluaciones.titulo,
      instrucciones: evaluaciones.instrucciones,
      obligatoria: evaluaciones.obligatoria,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(encuestaAsignaciones)
    .innerJoin(evaluaciones, eq(encuestaAsignaciones.evaluacionId, evaluaciones.id))
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(encuestaAsignaciones.usuarioId, actorResult.actor.userId),
        eq(encuestaAsignaciones.completada, false),
        eq(evaluaciones.estadoEncuesta, "activa"),
      ),
    )
    .orderBy(asc(evaluaciones.createdAt));
}

// ----------------------------------------------------------------
// USUARIO: Obtener encuesta para responder
// ----------------------------------------------------------------

export async function obtenerEncuestaParaResponder(evaluacionId: string) {
  const actorResult = await requireActionActor("usuario_encuesta_responder", [
    "alumno",
    "docente",
    "admin",
  ]);
  if (!actorResult.ok) return null;

  const db = getDb();

  // Check assignment
  const [asig] = await db
    .select({ completada: encuestaAsignaciones.completada })
    .from(encuestaAsignaciones)
    .where(
      and(
        eq(encuestaAsignaciones.evaluacionId, evaluacionId),
        eq(encuestaAsignaciones.usuarioId, actorResult.actor.userId),
      ),
    )
    .limit(1);

  if (!asig) return null;

  const [ev] = await db
    .select({
      id: evaluaciones.id,
      titulo: evaluaciones.titulo,
      instrucciones: evaluaciones.instrucciones,
      obligatoria: evaluaciones.obligatoria,
      estadoEncuesta: evaluaciones.estadoEncuesta,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(evaluaciones)
    .innerJoin(asignaturas, eq(evaluaciones.asignaturaId, asignaturas.id))
    .where(
      and(
        eq(evaluaciones.id, evaluacionId),
        eq(evaluaciones.esEncuesta, true),
        eq(evaluaciones.estadoEncuesta, "activa"),
        isNull(evaluaciones.eliminadoAt),
      ),
    )
    .limit(1);

  if (!ev) return null;

  const pregs = await db
    .select({
      id: preguntas.id,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      opciones: preguntas.opciones,
      orden: preguntas.orden,
    })
    .from(preguntas)
    .where(and(eq(preguntas.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)))
    .orderBy(asc(preguntas.orden), asc(preguntas.id));

  return { ...ev, yaRespondio: asig.completada, preguntas: pregs };
}

// ----------------------------------------------------------------
// USUARIO: Enviar respuestas de encuesta
// ----------------------------------------------------------------

export async function enviarRespuestasEncuestaAction(input: {
  evaluacionId: string;
  respuestas: { preguntaId: string; respuesta: string }[];
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("usuario_enviar_encuesta", [
    "alumno",
    "docente",
    "admin",
  ]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.evaluacionId || input.respuestas.length === 0) {
    return { ok: false, code: "invalid_input", message: "Datos inválidos." };
  }

  const db = getDb();

  // Check assignment
  const [asig] = await db
    .select({ id: encuestaAsignaciones.id, completada: encuestaAsignaciones.completada })
    .from(encuestaAsignaciones)
    .where(
      and(
        eq(encuestaAsignaciones.evaluacionId, input.evaluacionId),
        eq(encuestaAsignaciones.usuarioId, actorResult.actor.userId),
      ),
    )
    .limit(1);

  if (!asig) {
    return { ok: false, code: "not_assigned", message: "No tienes acceso a esta encuesta." };
  }

  if (asig.completada) {
    return { ok: false, code: "already_completed", message: "Ya completaste esta encuesta." };
  }

  // Check survey is active
  const [ev] = await db
    .select({ id: evaluaciones.id, estadoEncuesta: evaluaciones.estadoEncuesta, asignaturaId: evaluaciones.asignaturaId })
    .from(evaluaciones)
    .where(and(eq(evaluaciones.id, input.evaluacionId), isNull(evaluaciones.eliminadoAt)))
    .limit(1);

  if (!ev || ev.estadoEncuesta !== "activa") {
    return { ok: false, code: "encuesta_not_active", message: "La encuesta no está activa." };
  }

  // Get matricula for the respuestasFormulario FK (alumnos only; docentes use a stub)
  let matriculaId: string | null = null;
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

  matriculaId = matricula?.id ?? null;

  if (!matriculaId) {
    // Docente or user not enrolled — store responses linked to any available matricula for this asignatura
    // For docentes, we skip the respuestas_formulario insert and just mark assignment complete
    await db
      .update(encuestaAsignaciones)
      .set({ completada: true, completadaAt: new Date() })
      .where(eq(encuestaAsignaciones.id, asig.id));

    return { ok: true, code: "encuesta_completada" };
  }

  // Insert individual responses
  const now = new Date();
  try {
    for (const resp of input.respuestas) {
      const sanitized = sanitizeText(resp.respuesta).trim().slice(0, 2000);
      if (!sanitized) continue;

      await db.insert(respuestasFormulario).values({
        evaluacionId: input.evaluacionId,
        matriculaId,
        preguntaId: resp.preguntaId,
        respuesta: sanitized,
        esCorrecta: null,
        intento: 1,
        createdAt: now,
      });
    }

    // Mark assignment complete
    await db
      .update(encuestaAsignaciones)
      .set({ completada: true, completadaAt: now })
      .where(eq(encuestaAsignaciones.id, asig.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "encuestas",
      entidadId: input.evaluacionId,
      payload: { accion: "completar", totalRespuestas: input.respuestas.length },
      exitoso: true,
    });

    return { ok: true, code: "encuesta_completada" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "encuesta_submit_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "submit_failed", message: "No fue posible enviar las respuestas." };
  }
}

export async function enviarRespuestasEncuestaFormAction(formData: FormData): Promise<void> {
  const evaluacionId = getStringField(formData, "evaluacionId");
  const respuestas: { preguntaId: string; respuesta: string }[] = [];

  for (const [key, value] of Array.from(formData.entries())) {
    if (key.startsWith("resp_") && typeof value === "string") {
      respuestas.push({ preguntaId: key.replace("resp_", ""), respuesta: value });
    }
  }

  const result = await enviarRespuestasEncuestaAction({ evaluacionId, respuestas });

  revalidatePath("/alumno/encuestas");
  revalidatePath("/docente/encuestas");
  redirect(`/encuestas/${evaluacionId}?state=${result.ok ? result.code : "error"}`);
}

// ----------------------------------------------------------------
// ADMIN: Resultados de encuesta por pregunta
// ----------------------------------------------------------------

export type ResultadoEncuestaPregunta = {
  preguntaId: string;
  enunciado: string;
  tipo: string;
  respuestas: { valor: string; count: number }[];
  promedioNumerico: number | null;
};

export async function obtenerResultadosEncuesta(
  evaluacionId: string,
): Promise<ResultadoEncuestaPregunta[]> {
  const actorResult = await requireActionActor("admin_encuesta_resultados_v2", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const pregs = await db
    .select({
      id: preguntas.id,
      enunciado: preguntas.enunciado,
      tipo: preguntas.tipo,
      opciones: preguntas.opciones,
    })
    .from(preguntas)
    .where(and(eq(preguntas.evaluacionId, evaluacionId), isNull(preguntas.eliminadoAt)))
    .orderBy(asc(preguntas.orden));

  const resps = await db
    .select({
      preguntaId: respuestasFormulario.preguntaId,
      respuesta: respuestasFormulario.respuesta,
    })
    .from(respuestasFormulario)
    .where(eq(respuestasFormulario.evaluacionId, evaluacionId));

  return pregs.map((p) => {
    const pregResps = resps
      .filter((r) => r.preguntaId === p.id)
      .map((r) => r.respuesta ?? "");

    // Count by value
    const counts = new Map<string, number>();
    for (const v of pregResps) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }

    const respuestasAgg = Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([valor, count]) => ({ valor, count }));

    // Average for numeric types
    const numericValues = pregResps
      .map((v) => Number(v))
      .filter((n) => !Number.isNaN(n));

    const promedioNumerico =
      numericValues.length > 0
        ? Math.round((numericValues.reduce((a, b) => a + b, 0) / numericValues.length) * 10) / 10
        : null;

    return {
      preguntaId: p.id,
      enunciado: p.enunciado,
      tipo: p.tipo,
      respuestas: respuestasAgg,
      promedioNumerico,
    };
  });
}
