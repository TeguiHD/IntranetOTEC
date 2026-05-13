"use server";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { asignaturas, certificados, cursos, matriculas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { generarCodigoCertificadoAR, sanitizeCertificadoText } from "@/lib/certificados";
import { INSTITUCION_OTEC } from "@/lib/institucion";
import { logEvent } from "@/lib/observability/logger";

import {
  assertPeriodoAbiertoByCertificadoId,
  assertPeriodoAbiertoByMatriculaId,
} from "./_period-lock";
import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const parsePageField = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

const emitirCertificadoInputSchema = z.object({
  matriculaId: z.string().uuid(),
  tipo: z.enum(["alumno_regular", "termino_curso"]),
});

/* ------------------------------------------------------------------ */
/*  Existing: per-matricula listing (kept for backwards compatibility) */
/* ------------------------------------------------------------------ */

export async function listarCertificadosPorMatricula(
  matriculaId: string,
  pagination: PaginationInput = {},
  options?: { soloValidos?: boolean },
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  if (options?.soloValidos) {
    return db
      .select()
      .from(certificados)
      .where(and(eq(certificados.matriculaId, matriculaId), eq(certificados.valido, true)))
      .orderBy(desc(certificados.fechaEmision))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(certificados)
    .where(eq(certificados.matriculaId, matriculaId))
    .orderBy(desc(certificados.fechaEmision))
    .limit(limit)
    .offset(offset);
}

/* ------------------------------------------------------------------ */
/*  Admin: list certificados with alumno name                         */
/* ------------------------------------------------------------------ */

export async function listarCertificadosAdmin(
  pagination: PaginationInput = {},
  options?: { tipo?: "alumno_regular" | "termino_curso"; matriculaId?: string },
) {
  const actorResult = await requireActionActor("admin_certificado_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const conditions = [];

  if (options?.tipo) {
    conditions.push(eq(certificados.tipo, options.tipo));
  }

  if (options?.matriculaId) {
    conditions.push(eq(certificados.matriculaId, options.matriculaId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db
    .select({
      id: certificados.id,
      codigoUnico: certificados.codigoUnico,
      matriculaId: certificados.matriculaId,
      tipo: certificados.tipo,
      fechaEmision: certificados.fechaEmision,
      valido: certificados.valido,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
    })
    .from(certificados)
    .leftJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
    .leftJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
    .where(whereClause)
    .orderBy(desc(certificados.fechaEmision))
    .limit(limit)
    .offset(offset);
}

export async function countCertificadosAdmin(
  options?: { tipo?: "alumno_regular" | "termino_curso"; matriculaId?: string },
): Promise<number> {
  const actorResult = await requireActionActor("admin_certificado_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const conditions = [];

  if (options?.tipo) {
    conditions.push(eq(certificados.tipo, options.tipo));
  }

  if (options?.matriculaId) {
    conditions.push(eq(certificados.matriculaId, options.matriculaId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const result = await db
    .select({ total: count() })
    .from(certificados)
    .where(whereClause);

  return Number(result[0]?.total ?? 0);
}

/* ------------------------------------------------------------------ */
/*  Admin: emit certificado                                           */
/* ------------------------------------------------------------------ */

export async function emitirCertificadoAction(input: {
  matriculaId: string;
  tipo: "alumno_regular" | "termino_curso";
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_certificado_emitir", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = emitirCertificadoInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para emitir el certificado.",
    };
  }

  const db = getDb();

  try {
    // Verify matricula exists
    const [matricula] = await db
      .select({
        id: matriculas.id,
        alumnoId: matriculas.alumnoId,
        asignaturaId: matriculas.asignaturaId,
      })
      .from(matriculas)
      .where(eq(matriculas.id, parsed.data.matriculaId))
      .limit(1);

    if (!matricula) {
      return {
        ok: false,
        code: "matricula_not_found",
        message: "Matrícula no encontrada.",
      };
    }

    const periodoCheck = await assertPeriodoAbiertoByMatriculaId(matricula.id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    // Get alumno info for snapshot
    const [alumno] = await db
      .select({
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        rut: usuarios.rut,
      })
      .from(usuarios)
      .where(eq(usuarios.id, matricula.alumnoId))
      .limit(1);

    const codigoVerificacion = randomUUID();

    const snapshotData = {
      alumnoNombre: alumno?.nombre ?? "",
      alumnoApellido: alumno?.apellido ?? "",
      alumnoRut: alumno?.rut ?? null,
      matriculaId: matricula.id,
      asignaturaId: matricula.asignaturaId,
      fechaEmision: new Date().toISOString(),
    };

    const [created] = await db
      .insert(certificados)
      .values({
        codigoUnico: codigoVerificacion,
        matriculaId: parsed.data.matriculaId,
        tipo: parsed.data.tipo,
        datosSnapshot: snapshotData,
        generadoPor: actorResult.actor.userId,
        fechaEmision: new Date(),
        valido: true,
      })
      .returning({ id: certificados.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "emitir_certificado",
      entidad: "certificados",
      entidadId: created.id,
      payload: {
        tipo: parsed.data.tipo,
        matriculaId: parsed.data.matriculaId,
      },
      exitoso: true,
    });

    return { ok: true, code: "certificado_emitido" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_certificado_emitir_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "certificado_emitir_failed",
      message: "No fue posible emitir el certificado.",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Admin: invalidate certificado (soft delete via valido = false)     */
/* ------------------------------------------------------------------ */

export async function invalidarCertificadoAction(input: {
  id: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_certificado_invalidar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  if (!input.id || typeof input.id !== "string") {
    return {
      ok: false,
      code: "invalid_input",
      message: "Certificado inválido.",
    };
  }

  const db = getDb();

  try {
    const [row] = await db
      .select({ id: certificados.id, valido: certificados.valido })
      .from(certificados)
      .where(eq(certificados.id, input.id))
      .limit(1);

    if (!row) {
      return {
        ok: false,
        code: "certificado_not_found",
        message: "Certificado no encontrado.",
      };
    }

    if (!row.valido) {
      return { ok: true, code: "already_invalidated" };
    }

    const periodoCheck = await assertPeriodoAbiertoByCertificadoId(row.id);
    if (!periodoCheck.ok) {
      return periodoCheck.result;
    }

    await db
      .update(certificados)
      .set({ valido: false })
      .where(eq(certificados.id, row.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "invalidar_certificado",
      entidad: "certificados",
      entidadId: row.id,
      exitoso: true,
    });

    return { ok: true, code: "certificado_invalidado" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_certificado_invalidar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "invalidar_failed",
      message: "No fue posible invalidar el certificado.",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Form action wrappers                                              */
/* ------------------------------------------------------------------ */

export async function emitirCertificadoFormAction(formData: FormData): Promise<void> {
  const page = parsePageField(getStringField(formData, "page"));
  const filterTipo = getStringField(formData, "filterTipo");

  const result = await emitirCertificadoAction({
    matriculaId: getStringField(formData, "matriculaId"),
    tipo: getStringField(formData, "tipo") as "alumno_regular" | "termino_curso",
  });

  revalidatePath("/admin/certificados");
  const pageQuery = page ? `&page=${page}` : "";
  const tipoQuery = filterTipo ? `&tipo=${encodeURIComponent(filterTipo)}` : "";

  redirect(`/admin/certificados?state=${result.ok ? result.code : "error"}${tipoQuery}${pageQuery}`);
}

/* ------------------------------------------------------------------ */
/*  Alumno: autonomous certificado de alumno regular                  */
/* ------------------------------------------------------------------ */

const FINALIDAD_PRESETS = [
  "asignacion_familiar",
  "servicio_militar",
  "fines_particulares",
  "otro",
] as const;

const FINALIDAD_LABELS: Record<(typeof FINALIDAD_PRESETS)[number], string> = {
  asignacion_familiar: "Asignación familiar",
  servicio_militar: "Servicio militar",
  fines_particulares: "Fines particulares",
  otro: "Otro",
};

const emitirCertificadoAlumnoRegularSchema = z
  .object({
    matriculaId: z.string().uuid(),
    finalidad: z.enum(FINALIDAD_PRESETS),
    finalidadOtro: z.string().trim().min(3).max(120).optional(),
  })
  .refine(
    (data) => data.finalidad !== "otro" || (typeof data.finalidadOtro === "string" && data.finalidadOtro.trim().length >= 3),
    { message: "Debes describir la finalidad cuando seleccionas 'Otro'.", path: ["finalidadOtro"] },
  );

export type EmitirCertificadoAlumnoRegularInput = z.infer<typeof emitirCertificadoAlumnoRegularSchema>;

export type CertificadoDisponible = {
  matriculaId: string;
  asignaturaId: string;
  asignaturaNombre: string;
  asignaturaCodigo: string | null;
  cursoNombre: string;
  fechaInicio: string;
  fechaFin: string | null;
};

export async function getCertificadosAlumnoRegularDisponibles(): Promise<CertificadoDisponible[]> {
  const actorResult = await requireActionActor("alumno_certificado_listar_disponibles", ["alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  const rows = await db
    .select({
      matriculaId: matriculas.id,
      asignaturaId: asignaturas.id,
      asignaturaNombre: asignaturas.nombre,
      asignaturaCodigo: asignaturas.codigo,
      cursoNombre: cursos.nombre,
      fechaInicio: asignaturas.fechaInicio,
      fechaFin: asignaturas.fechaFin,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .where(
      and(
        eq(matriculas.alumnoId, actorResult.actor.userId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
        isNull(asignaturas.eliminadoAt),
        eq(asignaturas.estado, "activo"),
      ),
    )
    .orderBy(desc(asignaturas.fechaInicio));

  return rows.map((r) => ({
    matriculaId: r.matriculaId,
    asignaturaId: r.asignaturaId,
    asignaturaNombre: r.asignaturaNombre,
    asignaturaCodigo: r.asignaturaCodigo,
    cursoNombre: r.cursoNombre,
    fechaInicio: r.fechaInicio,
    fechaFin: r.fechaFin,
  }));
}

export type CertificadoHistorialItem = {
  id: string;
  codigoUnico: string;
  tipo: "alumno_regular" | "termino_curso";
  fechaEmision: string | null;
  valido: boolean;
  asignaturaNombre: string | null;
  cursoNombre: string | null;
  finalidad: string | null;
};

export async function getHistorialCertificadosAlumno(): Promise<CertificadoHistorialItem[]> {
  const actorResult = await requireActionActor("alumno_certificado_historial", ["alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  const rows = await db
    .select({
      id: certificados.id,
      codigoUnico: certificados.codigoUnico,
      tipo: certificados.tipo,
      fechaEmision: certificados.fechaEmision,
      valido: certificados.valido,
      datosSnapshot: certificados.datosSnapshot,
      asignaturaNombre: asignaturas.nombre,
      cursoNombre: cursos.nombre,
    })
    .from(certificados)
    .innerJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
    .leftJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .leftJoin(cursos, eq(asignaturas.cursoId, cursos.id))
    .where(eq(matriculas.alumnoId, actorResult.actor.userId))
    .orderBy(desc(certificados.fechaEmision))
    .limit(100);

  return rows.map((r) => {
    const snapshot = (r.datosSnapshot ?? {}) as Record<string, unknown>;
    const finalidad = typeof snapshot.finalidad === "string" ? snapshot.finalidad : null;

    return {
      id: r.id,
      codigoUnico: r.codigoUnico,
      tipo: r.tipo,
      fechaEmision: r.fechaEmision ? new Date(r.fechaEmision).toISOString() : null,
      valido: Boolean(r.valido),
      asignaturaNombre: r.asignaturaNombre,
      cursoNombre: r.cursoNombre,
      finalidad,
    };
  });
}

export type CertificadoPdfPayload = {
  codigoUnico: string;
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  cursoNombre: string;
  finalidad: string;
  fechaEmision: string;
};

export async function obtenerCertificadoAlumnoParaPdf(
  certificadoId: string,
): Promise<CertificadoPdfPayload | null> {
  const actorResult = await requireActionActor("alumno_certificado_obtener_pdf", ["alumno"]);

  if (!actorResult.ok) return null;

  const idCheck = z.string().uuid().safeParse(certificadoId);
  if (!idCheck.success) return null;

  const db = getDb();

  const [row] = await db
    .select({
      codigoUnico: certificados.codigoUnico,
      datosSnapshot: certificados.datosSnapshot,
      fechaEmision: certificados.fechaEmision,
      valido: certificados.valido,
      alumnoId: matriculas.alumnoId,
      tipo: certificados.tipo,
    })
    .from(certificados)
    .innerJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
    .where(eq(certificados.id, certificadoId))
    .limit(1);

  if (!row) return null;
  if (row.alumnoId !== actorResult.actor.userId) return null;
  if (row.tipo !== "alumno_regular") return null;

  const snap = (row.datosSnapshot ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === "string" ? v : "");

  return {
    codigoUnico: row.codigoUnico,
    alumnoNombre: str(snap.alumnoNombre),
    alumnoApellido: str(snap.alumnoApellido),
    alumnoRut: typeof snap.alumnoRut === "string" ? snap.alumnoRut : null,
    cursoNombre: str(snap.nombreCurso),
    finalidad: str(snap.finalidad),
    fechaEmision:
      typeof snap.fechaEmision === "string"
        ? snap.fechaEmision
        : (row.fechaEmision ?? new Date()).toISOString(),
  };
}

export type EmitirCertificadoAlumnoRegularResult =
  | {
      ok: true;
      code: "certificado_emitido";
      certificadoId: string;
      codigoUnico: string;
    }
  | { ok: false; code: string; message: string };

export async function emitirCertificadoAlumnoRegular(
  input: EmitirCertificadoAlumnoRegularInput,
): Promise<EmitirCertificadoAlumnoRegularResult> {
  const actorResult = await requireActionActor("alumno_certificado_emitir", ["alumno"]);

  if (!actorResult.ok) {
    const fail = actorResult.result;
    return {
      ok: false,
      code: fail.code,
      message: fail.ok ? "No autorizado." : fail.message,
    };
  }

  const parsed = emitirCertificadoAlumnoRegularSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  const finalidadTexto =
    parsed.data.finalidad === "otro"
      ? sanitizeCertificadoText(parsed.data.finalidadOtro ?? "", 120)
      : FINALIDAD_LABELS[parsed.data.finalidad];

  if (!finalidadTexto) {
    return {
      ok: false,
      code: "invalid_finalidad",
      message: "Finalidad inválida.",
    };
  }

  const db = getDb();

  try {
    const [registro] = await db
      .select({
        matriculaId: matriculas.id,
        alumnoId: matriculas.alumnoId,
        matriculaActiva: matriculas.activa,
        matriculaEliminadoAt: matriculas.eliminadoAt,
        asignaturaId: asignaturas.id,
        asignaturaNombre: asignaturas.nombre,
        asignaturaEstado: asignaturas.estado,
        asignaturaEliminadoAt: asignaturas.eliminadoAt,
        cursoNombre: cursos.nombre,
        usuarioActivo: usuarios.activo,
        usuarioEliminadoAt: usuarios.eliminadoAt,
        usuarioRol: usuarios.rol,
        alumnoNombre: usuarios.nombre,
        alumnoApellido: usuarios.apellido,
        alumnoRut: usuarios.rut,
      })
      .from(matriculas)
      .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
      .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .where(
        and(
          eq(matriculas.id, parsed.data.matriculaId),
          eq(matriculas.alumnoId, actorResult.actor.userId),
        ),
      )
      .limit(1);

    if (!registro) {
      return {
        ok: false,
        code: "matricula_not_found",
        message: "No se encontró una matrícula activa a tu nombre.",
      };
    }

    if (registro.usuarioRol !== "alumno" || !registro.usuarioActivo || registro.usuarioEliminadoAt) {
      return {
        ok: false,
        code: "alumno_inactivo",
        message: "Tu cuenta no está habilitada para emitir certificados.",
      };
    }

    if (!registro.matriculaActiva || registro.matriculaEliminadoAt) {
      return {
        ok: false,
        code: "matricula_inactiva",
        message: "La matrícula seleccionada no está activa.",
      };
    }

    if (registro.asignaturaEliminadoAt || registro.asignaturaEstado !== "activo") {
      return {
        ok: false,
        code: "asignatura_inactiva",
        message: "El curso seleccionado no está activo.",
      };
    }

    let codigoUnico = generarCodigoCertificadoAR();
    for (let intento = 0; intento < 3; intento += 1) {
      const [existing] = await db
        .select({ id: certificados.id })
        .from(certificados)
        .where(eq(certificados.codigoUnico, codigoUnico))
        .limit(1);

      if (!existing) break;
      codigoUnico = generarCodigoCertificadoAR();
    }

    const fechaEmision = new Date();

    const snapshotData = {
      alumnoNombre: registro.alumnoNombre ?? "",
      alumnoApellido: registro.alumnoApellido ?? "",
      alumnoRut: registro.alumnoRut ?? null,
      asignaturaId: registro.asignaturaId,
      fechaEmision: fechaEmision.toISOString(),
      nombreCurso: registro.cursoNombre ?? registro.asignaturaNombre ?? "",
      nombreEstablecimiento: INSTITUCION_OTEC.nombreCorto,
      finalidad: finalidadTexto,
      codigoUnico,
      rutInstitucion: INSTITUCION_OTEC.rut,
      registrosInstitucionales: `${INSTITUCION_OTEC.registroSence} · ${INSTITUCION_OTEC.idOtec} · ${INSTITUCION_OTEC.registroInn}`,
      nombreFirmante: INSTITUCION_OTEC.director.nombre,
      cargoFirmante: INSTITUCION_OTEC.director.cargo,
    };

    const urlPublica = `${INSTITUCION_OTEC.intranetUrl}/verificar/${codigoUnico}`;

    const [created] = await db
      .insert(certificados)
      .values({
        codigoUnico,
        matriculaId: parsed.data.matriculaId,
        tipo: "alumno_regular",
        datosSnapshot: snapshotData,
        urlPublica,
        qrPayload: urlPublica,
        generadoPor: actorResult.actor.userId,
        fechaEmision,
        valido: true,
      })
      .returning({ id: certificados.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "emitir_certificado",
      entidad: "certificados",
      entidadId: created.id,
      payload: {
        tipo: "alumno_regular",
        matriculaId: parsed.data.matriculaId,
        finalidad: finalidadTexto,
        autoEmitido: true,
      },
      exitoso: true,
    });

    revalidatePath("/alumno/certificados");

    return {
      ok: true,
      code: "certificado_emitido",
      certificadoId: created.id,
      codigoUnico,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "alumno_certificado_emitir_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "certificado_emitir_failed",
      message: "No fue posible emitir el certificado. Intenta nuevamente.",
    };
  }
}

export async function invalidarCertificadoFormAction(formData: FormData): Promise<void> {
  const page = parsePageField(getStringField(formData, "page"));
  const filterTipo = getStringField(formData, "filterTipo");

  const result = await invalidarCertificadoAction({
    id: getStringField(formData, "id"),
  });

  revalidatePath("/admin/certificados");
  const pageQuery = page ? `&page=${page}` : "";
  const tipoQuery = filterTipo ? `&tipo=${encodeURIComponent(filterTipo)}` : "";

  redirect(`/admin/certificados?state=${result.ok ? result.code : "error"}${tipoQuery}${pageQuery}`);
}
