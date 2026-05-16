"use server";

import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { asignaturas, clases, matriculas, periodosAcademicos } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";

import { requireActionActor, type MutationResult } from "./_security";

export type PeriodoAdminRow = {
  id: string;
  codigo: string;
  nombre: string;
  estado: "planificado" | "activo" | "cerrado";
  fechaInicio: string;
  fechaFin: string;
  totalAsignaturas: number;
  totalMatriculasActivas: number;
  totalClases: number;
  protegido: boolean;
};

export async function listarPeriodosAdmin(): Promise<PeriodoAdminRow[]> {
  const actorResult = await requireActionActor("admin_periodo_list", ["admin"]);
  if (!actorResult.ok) return [];

  const db = getDb();

  const rows = await db
    .select({
      id: periodosAcademicos.id,
      codigo: periodosAcademicos.codigo,
      nombre: periodosAcademicos.nombre,
      estado: periodosAcademicos.estado,
      fechaInicio: periodosAcademicos.fechaInicio,
      fechaFin: periodosAcademicos.fechaFin,
      totalAsignaturas: sql<number>`(
        SELECT COUNT(*) FROM ${asignaturas}
        WHERE ${asignaturas.periodoId} = ${periodosAcademicos.id}
        AND ${asignaturas.eliminadoAt} IS NULL
      )`,
      totalMatriculasActivas: sql<number>`(
        SELECT COUNT(*) FROM ${matriculas} m
        INNER JOIN ${asignaturas} a ON a.id = m.asignatura_id
        WHERE a.periodo_id = ${periodosAcademicos.id}
        AND m.eliminado_at IS NULL AND a.eliminado_at IS NULL
      )`,
      totalClases: sql<number>`(
        SELECT COUNT(*) FROM ${clases} c
        INNER JOIN ${asignaturas} a ON a.id = c.asignatura_id
        WHERE a.periodo_id = ${periodosAcademicos.id}
        AND c.eliminado_at IS NULL AND a.eliminado_at IS NULL
      )`,
    })
    .from(periodosAcademicos)
    .where(isNull(periodosAcademicos.eliminadoAt))
    .orderBy(desc(periodosAcademicos.fechaInicio), desc(periodosAcademicos.createdAt));

  return rows.map((r) => ({
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    estado: r.estado,
    fechaInicio: r.fechaInicio,
    fechaFin: r.fechaFin,
    totalAsignaturas: Number(r.totalAsignaturas ?? 0),
    totalMatriculasActivas: Number(r.totalMatriculasActivas ?? 0),
    totalClases: Number(r.totalClases ?? 0),
    protegido: PERIODOS_CODIGOS_PROTEGIDOS.has(r.codigo),
  }));
}

const PERIODOS_CODIGOS_PROTEGIDOS = new Set<string>(["2026-05"]);

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

export type EliminarPeriodoResult = MutationResult & {
  conteos?: {
    asignaturasEliminadas: number;
    matriculasEliminadas: number;
    clasesEliminadas: number;
  };
};

export async function eliminarPeriodoAcademicoAction(input: {
  id: string;
}): Promise<EliminarPeriodoResult> {
  const actorResult = await requireActionActor("admin_periodo_eliminar", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const db = getDb();

  try {
    const [periodo] = await db
      .select({
        id: periodosAcademicos.id,
        codigo: periodosAcademicos.codigo,
        nombre: periodosAcademicos.nombre,
        eliminadoAt: periodosAcademicos.eliminadoAt,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, input.id))
      .limit(1);

    if (!periodo) {
      return { ok: false, code: "periodo_not_found", message: "No se encontró el periodo." };
    }

    if (periodo.eliminadoAt) {
      return { ok: true, code: "already_deleted" };
    }

    if (PERIODOS_CODIGOS_PROTEGIDOS.has(periodo.codigo)) {
      return {
        ok: false,
        code: "periodo_protegido",
        message: `El periodo ${periodo.codigo} está protegido y no puede eliminarse.`,
      };
    }

    const eliminadoAt = new Date();
    const eliminadoPor = actorResult.actor.userId;

    const conteos = await db.transaction(async (tx) => {
      const asigRows = await tx
        .select({ id: asignaturas.id })
        .from(asignaturas)
        .where(
          and(eq(asignaturas.periodoId, input.id), isNull(asignaturas.eliminadoAt)),
        );
      const asigIds = asigRows.map((r) => r.id);

      let matriculasEliminadas = 0;
      let clasesEliminadas = 0;
      let asignaturasEliminadas = 0;

      if (asigIds.length > 0) {
        const matResult = await tx
          .update(matriculas)
          .set({ eliminadoAt, eliminadoPor })
          .where(
            and(inArray(matriculas.asignaturaId, asigIds), isNull(matriculas.eliminadoAt)),
          );
        matriculasEliminadas = matResult.rowCount ?? 0;

        const clasResult = await tx
          .update(clases)
          .set({ eliminadoAt, eliminadoPor })
          .where(and(inArray(clases.asignaturaId, asigIds), isNull(clases.eliminadoAt)));
        clasesEliminadas = clasResult.rowCount ?? 0;

        const asigResult = await tx
          .update(asignaturas)
          .set({ eliminadoAt, eliminadoPor, updatedAt: eliminadoAt })
          .where(
            and(eq(asignaturas.periodoId, input.id), isNull(asignaturas.eliminadoAt)),
          );
        asignaturasEliminadas = asigResult.rowCount ?? 0;
      }

      await tx
        .update(periodosAcademicos)
        .set({ eliminadoAt, eliminadoPor, updatedAt: eliminadoAt })
        .where(eq(periodosAcademicos.id, input.id));

      return { asignaturasEliminadas, matriculasEliminadas, clasesEliminadas };
    });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "periodos_academicos",
      entidadId: input.id,
      payload: {
        nombre: periodo.nombre,
        codigo: periodo.codigo,
        accion: "soft_delete_cascade",
        ...conteos,
      },
      exitoso: true,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/academico");
    revalidatePath("/admin/agenda");
    revalidatePath("/admin/asignaturas");
    revalidatePath("/admin/periodos");

    return { ok: true, code: "periodo_deleted", conteos };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_periodo_eliminar_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message, periodoId: input.id },
    });
    return { ok: false, code: "error", message: "No fue posible eliminar el periodo." };
  }
}

export async function eliminarPeriodoAcademicoFormAction(formData: FormData): Promise<void> {
  const id = getStringField(formData, "id");
  const result = await eliminarPeriodoAcademicoAction({ id });
  const state = result.ok ? result.code : `error_${result.code}`;
  redirect(`/admin/periodos?state=${encodeURIComponent(state)}`);
}
