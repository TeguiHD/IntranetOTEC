"use server";

import { randomUUID } from "node:crypto";

import { and, count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { certificados, matriculas, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";
import { emitirCertificadoInputSchema } from "@/lib/validations/admin";

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
