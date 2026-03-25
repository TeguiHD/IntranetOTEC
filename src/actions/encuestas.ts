"use server";

import { and, asc, avg, count, desc, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import {
  asignaturas,
  encuestaDocenteConfig,
  encuestasDocente,
  matriculas,
  testEstilos,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";

import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

// ----------------------------------------------------------------
// PREGUNTAS FIJAS – Evaluación Docente y OTEC (escala 1-7)
// ----------------------------------------------------------------
export const PREGUNTAS_DOCENTE = [
  "El docente demuestra dominio de los contenidos impartidos.",
  "Explica los temas de manera clara y comprensible.",
  "Fomenta la participación y el interés en la clase.",
  "Mantiene una actitud respetuosa y profesional.",
  "Responde adecuadamente a dudas y consultas.",
  "Utiliza metodologías adecuadas para facilitar el aprendizaje.",
] as const;

export const PREGUNTAS_OTEC = [
  "La organización del curso fue adecuada.",
  "Los contenidos del curso cumplen con mis expectativas.",
  "Los recursos y materiales entregados fueron útiles.",
  "La comunicación e información entregada fue clara y oportuna.",
  "La infraestructura o plataforma utilizada fue adecuada.",
  "Estoy satisfecho/a con la calidad general del servicio entregado por la OTEC.",
] as const;

// ----------------------------------------------------------------
// PREGUNTAS FIJAS – Test de Estilos de Aprendizaje (escala 1-5)
// ----------------------------------------------------------------
export const PREGUNTAS_VISUAL = [
  "Me resulta más fácil aprender cuando veo imágenes, gráficos o videos.",
  "Prefiero que me expliquen con esquemas o presentaciones.",
  "Recuerdo mejor lo que leo que lo que escucho.",
  "Me ayudan los colores, mapas conceptuales o dibujos para estudiar.",
  "Me gusta tomar apuntes ordenados y visuales.",
] as const;

export const PREGUNTAS_AUDITIVO = [
  "Aprendo mejor cuando escucho explicaciones en voz alta.",
  "Prefiero que me expliquen los temas verbalmente antes que leerlos.",
  "Recuerdo mejor lo que escucho que lo que leo.",
  "Me ayuda repetir en voz alta la información para memorizarla.",
  "Disfruto participar en debates o discusiones grupales para aprender.",
] as const;

export const PREGUNTAS_KINESTESICO = [
  "Aprendo mejor cuando puedo experimentar o practicar directamente.",
  "Prefiero actividades prácticas o dinámicas en lugar de solo escuchar.",
  "Me resulta difícil estar quieto/a mucho tiempo cuando estoy aprendiendo.",
  "Recuerdo mejor lo que hice que lo que leí o escuché.",
  "Necesito moverme o manipular objetos para entender mejor un concepto.",
] as const;

// ----------------------------------------------------------------
// CONFIG ENCUESTA – Admin puede habilitar/deshabilitar por asignatura
// ----------------------------------------------------------------

export async function obtenerConfigEncuesta(asignaturaId: string): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select({ habilitada: encuestaDocenteConfig.habilitada })
    .from(encuestaDocenteConfig)
    .where(eq(encuestaDocenteConfig.asignaturaId, asignaturaId))
    .limit(1);
  return row?.habilitada ?? false;
}

export async function listarAsignaturasConConfigEncuesta() {
  const actorResult = await requireActionActor("admin_encuesta_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: asignaturas.id,
      nombre: asignaturas.nombre,
      codigo: asignaturas.codigo,
      estado: asignaturas.estado,
      habilitada: encuestaDocenteConfig.habilitada,
    })
    .from(asignaturas)
    .leftJoin(encuestaDocenteConfig, eq(encuestaDocenteConfig.asignaturaId, asignaturas.id))
    .where(ne(asignaturas.estado, "archivado"))
    .orderBy(asc(asignaturas.nombre));

  return rows.map((r) => ({
    ...r,
    habilitada: r.habilitada ?? false,
  }));
}

export async function toggleEncuestaDocenteAction(asignaturaId: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_encuesta_toggle", ["admin"]);
  if (!actorResult.ok) return actorResult.result;
  if (!asignaturaId) return { ok: false, code: "invalid_input", message: "Asignatura requerida." };

  const db = getDb();

  const [existing] = await db
    .select({ habilitada: encuestaDocenteConfig.habilitada })
    .from(encuestaDocenteConfig)
    .where(eq(encuestaDocenteConfig.asignaturaId, asignaturaId))
    .limit(1);

  const newValue = !(existing?.habilitada ?? false);

  if (existing) {
    await db
      .update(encuestaDocenteConfig)
      .set({ habilitada: newValue, updatedAt: new Date() })
      .where(eq(encuestaDocenteConfig.asignaturaId, asignaturaId));
  } else {
    await db.insert(encuestaDocenteConfig).values({
      asignaturaId,
      habilitada: newValue,
      updatedAt: new Date(),
    });
  }

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "encuesta_docente_config",
    entidadId: asignaturaId,
    payload: { habilitada: newValue },
    exitoso: true,
  });

  revalidatePath("/admin/encuestas");
  return { ok: true, code: newValue ? "encuesta_enabled" : "encuesta_disabled" };
}

export async function toggleEncuestaDocenteFormAction(formData: FormData): Promise<void> {
  await toggleEncuestaDocenteAction(getStringField(formData, "asignaturaId"));
  revalidatePath("/admin/encuestas");
  redirect("/admin/encuestas?state=toggle_ok");
}

// ----------------------------------------------------------------
// ALUMNO: listar asignaturas con encuesta disponible
// ----------------------------------------------------------------

export type EncuestaDisponible = {
  asignaturaId: string;
  asignaturaNombre: string;
  asignaturaCodigo: string | null;
  yaRespondio: boolean;
};

export async function listarEncuestasDisponiblesAlumno(): Promise<EncuestaDisponible[]> {
  const actorResult = await requireActionActor("alumno_encuesta_list", ["alumno"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  // Asignaturas del alumno con encuesta habilitada
  const rows = await db
    .select({
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      asignaturaCodigo: asignaturas.codigo,
      yaRespondio: encuestasDocente.id,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(encuestaDocenteConfig, eq(encuestaDocenteConfig.asignaturaId, asignaturas.id))
    .leftJoin(
      encuestasDocente,
      and(
        eq(encuestasDocente.asignaturaId, asignaturas.id),
        eq(encuestasDocente.alumnoId, actorResult.actor.userId),
      ),
    )
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(encuestaDocenteConfig.habilitada, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .orderBy(asc(asignaturas.nombre));

  return rows.map((r) => ({
    asignaturaId: r.asignaturaId,
    asignaturaNombre: r.asignaturaNombre,
    asignaturaCodigo: r.asignaturaCodigo,
    yaRespondio: Boolean(r.yaRespondio),
  }));
}

// ----------------------------------------------------------------
// ALUMNO: enviar respuestas encuesta docente/OTEC
// ----------------------------------------------------------------

export async function enviarEncuestaDocenteAction(input: {
  asignaturaId: string;
  respuestasDocente: Record<string, number>; // d1..d6: 1-7
  respuestasOtec: Record<string, number>;    // o1..o6: 1-7
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("alumno_enviar_encuesta", ["alumno"]);
  if (!actorResult.ok) return actorResult.result;

  if (!input.asignaturaId) return { ok: false, code: "invalid_input", message: "Asignatura requerida." };

  const db = getDb();

  // Verificar encuesta habilitada
  const [config] = await db
    .select({ habilitada: encuestaDocenteConfig.habilitada })
    .from(encuestaDocenteConfig)
    .where(eq(encuestaDocenteConfig.asignaturaId, input.asignaturaId))
    .limit(1);

  if (!config?.habilitada) {
    return { ok: false, code: "encuesta_disabled", message: "La encuesta no está habilitada." };
  }

  // Verificar matrícula
  const [matricula] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.asignaturaId, input.asignaturaId),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matricula) {
    return { ok: false, code: "not_enrolled", message: "No tienes matrícula en esta asignatura." };
  }

  // Verificar que no haya respondido ya
  const [existing] = await db
    .select({ id: encuestasDocente.id })
    .from(encuestasDocente)
    .where(
      and(
        eq(encuestasDocente.asignaturaId, input.asignaturaId),
        eq(encuestasDocente.alumnoId, actorResult.actor.userId),
      ),
    )
    .limit(1);

  if (existing) {
    return { ok: false, code: "already_submitted", message: "Ya respondiste esta encuesta." };
  }

  // Validar valores 1-7
  const allD = Object.values(input.respuestasDocente);
  const allO = Object.values(input.respuestasOtec);
  const isValid = (vals: number[]) => vals.length === 6 && vals.every((v) => v >= 1 && v <= 7);

  if (!isValid(allD) || !isValid(allO)) {
    return { ok: false, code: "invalid_input", message: "Respuestas inválidas. Usa valores del 1 al 7." };
  }

  const promedioDocente = allD.reduce((a, b) => a + b, 0) / 6;
  const promedioOtec = allO.reduce((a, b) => a + b, 0) / 6;

  try {
    await db.insert(encuestasDocente).values({
      asignaturaId: input.asignaturaId,
      alumnoId: actorResult.actor.userId,
      respuestas: { ...input.respuestasDocente, ...input.respuestasOtec },
      promedioDocente: String(Math.round(promedioDocente * 10) / 10),
      promedioOtec: String(Math.round(promedioOtec * 10) / 10),
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "encuestas_docente",
      entidadId: input.asignaturaId,
      payload: { promedioDocente, promedioOtec },
      exitoso: true,
    });

    return { ok: true, code: "encuesta_submitted" };
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
    return { ok: false, code: "submit_failed", message: "No fue posible guardar la encuesta." };
  }
}

export async function enviarEncuestaDocenteFormAction(formData: FormData): Promise<void> {
  const asignaturaId = getStringField(formData, "asignaturaId");

  const respuestasDocente: Record<string, number> = {};
  const respuestasOtec: Record<string, number> = {};

  for (let i = 1; i <= 6; i++) {
    respuestasDocente[`d${i}`] = Number(getStringField(formData, `d${i}`));
    respuestasOtec[`o${i}`] = Number(getStringField(formData, `o${i}`));
  }

  const result = await enviarEncuestaDocenteAction({ asignaturaId, respuestasDocente, respuestasOtec });
  revalidatePath("/alumno/encuesta-docente");
  redirect(`/alumno/encuesta-docente?state=${result.code}&asignaturaId=${encodeURIComponent(asignaturaId)}`);
}

// ----------------------------------------------------------------
// ADMIN: resultados encuesta por asignatura
// ----------------------------------------------------------------

export type ResultadoEncuesta = {
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  promedioDocente: string | null;
  promedioOtec: string | null;
  createdAt: Date | null;
};

export async function listarResultadosEncuesta(asignaturaId: string): Promise<ResultadoEncuesta[]> {
  const actorResult = await requireActionActor("admin_encuesta_resultados", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      promedioDocente: encuestasDocente.promedioDocente,
      promedioOtec: encuestasDocente.promedioOtec,
      createdAt: encuestasDocente.createdAt,
    })
    .from(encuestasDocente)
    .innerJoin(usuarios, eq(encuestasDocente.alumnoId, usuarios.id))
    .where(eq(encuestasDocente.asignaturaId, asignaturaId))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre));
}

export async function obtenerPromediosGlobalesEncuesta(asignaturaId: string) {
  const actorResult = await requireActionActor("admin_encuesta_promedios", ["admin"]);
  if (!actorResult.ok) return null;

  const db = getDb();

  const [row] = await db
    .select({
      totalRespuestas: count(),
      promedioDocente: avg(encuestasDocente.promedioDocente),
      promedioOtec: avg(encuestasDocente.promedioOtec),
    })
    .from(encuestasDocente)
    .where(eq(encuestasDocente.asignaturaId, asignaturaId));

  return row ?? null;
}

// ----------------------------------------------------------------
// TEST ESTILOS DE APRENDIZAJE
// ----------------------------------------------------------------

export async function obtenerIntentosTestEstilos(): Promise<number> {
  const actorResult = await requireActionActor("alumno_test_estilos", ["alumno"]);
  if (!actorResult.ok) return 0;

  const db = getDb();
  const [row] = await db
    .select({ maxIntento: testEstilos.intento })
    .from(testEstilos)
    .where(eq(testEstilos.alumnoId, actorResult.actor.userId))
    .orderBy(desc(testEstilos.intento))
    .limit(1);

  return row?.maxIntento ?? 0;
}

export async function enviarTestEstilosAction(input: {
  respuestasVisual: Record<string, number>;
  respuestasAuditivo: Record<string, number>;
  respuestasKinestesico: Record<string, number>;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("alumno_enviar_test_estilos", ["alumno"]);
  if (!actorResult.ok) return actorResult.result;

  const db = getDb();

  // Contar intentos previos
  const [intentoRow] = await db
    .select({ maxIntento: testEstilos.intento })
    .from(testEstilos)
    .where(eq(testEstilos.alumnoId, actorResult.actor.userId))
    .orderBy(desc(testEstilos.intento))
    .limit(1);

  const intentosUsados = intentoRow?.maxIntento ?? 0;
  if (intentosUsados >= 2) {
    return { ok: false, code: "max_intentos_reached", message: "Ya completaste el test 2 veces (máximo permitido)." };
  }

  const currentIntento = intentosUsados + 1;

  // Validar valores 1-5
  const allV = Object.values(input.respuestasVisual);
  const allA = Object.values(input.respuestasAuditivo);
  const allK = Object.values(input.respuestasKinestesico);
  const isValid5 = (vals: number[]) => vals.length === 5 && vals.every((v) => v >= 1 && v <= 5);

  if (!isValid5(allV) || !isValid5(allA) || !isValid5(allK)) {
    return { ok: false, code: "invalid_input", message: "Respuestas inválidas. Usa valores del 1 al 5." };
  }

  const puntajeVisual = allV.reduce((a, b) => a + b, 0);
  const puntajeAuditivo = allA.reduce((a, b) => a + b, 0);
  const puntajeKinestesico = allK.reduce((a, b) => a + b, 0);

  const max = Math.max(puntajeVisual, puntajeAuditivo, puntajeKinestesico);
  const estiloPreferente =
    max === puntajeVisual ? "visual" : max === puntajeAuditivo ? "auditivo" : "kinestesico";

  try {
    await db.insert(testEstilos).values({
      alumnoId: actorResult.actor.userId,
      intento: currentIntento,
      respuestas: {
        ...input.respuestasVisual,
        ...input.respuestasAuditivo,
        ...input.respuestasKinestesico,
      },
      puntajeVisual: String(puntajeVisual),
      puntajeAuditivo: String(puntajeAuditivo),
      puntajeKinestesico: String(puntajeKinestesico),
      estiloPreferente,
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "test_estilos",
      entidadId: actorResult.actor.userId,
      payload: { intento: currentIntento, estiloPreferente },
      exitoso: true,
    });

    return { ok: true, code: "test_submitted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "test_estilos_submit_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });
    return { ok: false, code: "submit_failed", message: "No fue posible guardar el test." };
  }
}

export async function enviarTestEstilosFormAction(formData: FormData): Promise<void> {
  const rv: Record<string, number> = {};
  const ra: Record<string, number> = {};
  const rk: Record<string, number> = {};

  for (let i = 1; i <= 5; i++) {
    rv[`v${i}`] = Number(getStringField(formData, `v${i}`));
    ra[`a${i}`] = Number(getStringField(formData, `a${i}`));
    rk[`k${i}`] = Number(getStringField(formData, `k${i}`));
  }

  const result = await enviarTestEstilosAction({
    respuestasVisual: rv,
    respuestasAuditivo: ra,
    respuestasKinestesico: rk,
  });

  revalidatePath("/alumno/test-estilos");
  redirect(`/alumno/test-estilos?state=${result.code}`);
}

// ----------------------------------------------------------------
// ADMIN: resultados test estilos
// ----------------------------------------------------------------

export type ResultadoTestEstilos = {
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  intento: number;
  puntajeVisual: string | null;
  puntajeAuditivo: string | null;
  puntajeKinestesico: string | null;
  estiloPreferente: string | null;
  createdAt: Date | null;
};

export async function listarResultadosTestEstilos(): Promise<ResultadoTestEstilos[]> {
  const actorResult = await requireActionActor("admin_test_estilos_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  return db
    .select({
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
      intento: testEstilos.intento,
      puntajeVisual: testEstilos.puntajeVisual,
      puntajeAuditivo: testEstilos.puntajeAuditivo,
      puntajeKinestesico: testEstilos.puntajeKinestesico,
      estiloPreferente: testEstilos.estiloPreferente,
      createdAt: testEstilos.createdAt,
    })
    .from(testEstilos)
    .innerJoin(usuarios, eq(testEstilos.alumnoId, usuarios.id))
    .orderBy(asc(usuarios.apellido), asc(usuarios.nombre), asc(testEstilos.intento));
}
