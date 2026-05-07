"use server";

import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { activo } from "@/db/filters";
import { finanzas, matriculas } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";
import { sanitizeText } from "@/lib/sanitize";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const escapeLike = (s: string) => s.replace(/%/g, "\\%").replace(/_/g, "\\_");

const finanzaInputSchema = z.object({
  tipo: z.enum(["ingreso", "gasto"]),
  monto: z
    .number()
    .positive("El monto debe ser positivo.")
    .max(9_999_999_999.99, "Monto demasiado grande."),
  descripcion: z.string().trim().min(3, "Descripción muy corta.").max(300, "Descripción demasiado larga."),
  categoria: z
    .string()
    .trim()
    .max(80, "Categoría demasiado larga.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  asignaturaId: z.string().uuid().optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida (YYYY-MM-DD)."),
  comprobanteUrl: z
    .union([z.string().url("URL de comprobante inválida.").max(500), z.literal(""), z.undefined()])
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

const editarFinanzaInputSchema = finanzaInputSchema.extend({
  id: z.string().uuid("ID de finanza inválido."),
});

export async function listarFinanzas(
  pagination: PaginationInput = {},
  options?: { tipo?: "ingreso" | "gasto" },
) {
  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  if (!options?.tipo) {
    return db
      .select()
      .from(finanzas)
      .where(activo(finanzas))
      .orderBy(desc(finanzas.fecha), desc(finanzas.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return db
    .select()
    .from(finanzas)
    .where(and(eq(finanzas.tipo, options.tipo), activo(finanzas)))
    .orderBy(desc(finanzas.fecha), desc(finanzas.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listarFinanzasAction(
  pagination: PaginationInput = {},
  options?: { tipo?: "ingreso" | "gasto"; search?: string },
) {
  const actorResult = await requireActionActor("admin_finanzas_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const conditions: ReturnType<typeof eq>[] = [isNull(finanzas.eliminadoAt)];

  if (options?.tipo) {
    conditions.push(eq(finanzas.tipo, options.tipo) as ReturnType<typeof eq>);
  }

  if (options?.search) {
    const term = `%${escapeLike(options.search)}%`;
    conditions.push(
      or(ilike(finanzas.descripcion, term), ilike(finanzas.categoria, term)) as ReturnType<typeof eq>,
    );
  }

  return db
    .select()
    .from(finanzas)
    .where(and(...conditions))
    .orderBy(desc(finanzas.fecha), desc(finanzas.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function resumenFinanzasAction(): Promise<{
  totalIngresos: number;
  totalGastos: number;
  balance: number;
}> {
  const actorResult = await requireActionActor("admin_finanzas_resumen", ["admin"]);

  if (!actorResult.ok) {
    return { totalIngresos: 0, totalGastos: 0, balance: 0 };
  }

  const db = getDb();

  const [result] = await db
    .select({
      totalIngresos: sql<string>`coalesce(sum(case when ${finanzas.tipo} = 'ingreso' then ${finanzas.monto}::numeric else 0 end), 0)`,
      totalGastos: sql<string>`coalesce(sum(case when ${finanzas.tipo} = 'gasto' then ${finanzas.monto}::numeric else 0 end), 0)`,
    })
    .from(finanzas)
    .where(isNull(finanzas.eliminadoAt));

  const totalIngresos = Number(result?.totalIngresos ?? 0);
  const totalGastos = Number(result?.totalGastos ?? 0);

  return {
    totalIngresos,
    totalGastos,
    balance: totalIngresos - totalGastos,
  };
}

export async function resumenIngresosMatriculasAction(): Promise<{
  totalAranceles: number;
  totalPagado: number;
  totalPendiente: number;
  totalMora: number;
  totalBecado: number;
  matriculasConMonto: number;
}> {
  const actorResult = await requireActionActor("admin_finanzas_matriculas_resumen", ["admin"]);

  if (!actorResult.ok) {
    return {
      totalAranceles: 0,
      totalPagado: 0,
      totalPendiente: 0,
      totalMora: 0,
      totalBecado: 0,
      matriculasConMonto: 0,
    };
  }

  const db = getDb();

  const [result] = await db
    .select({
      totalAranceles: sql<string>`coalesce(sum(${matriculas.montoArancel}::numeric), 0)`,
      totalPagado: sql<string>`coalesce(sum(case when ${matriculas.estadoPago} = 'pagado' then ${matriculas.montoArancel}::numeric else 0 end), 0)`,
      totalPendiente: sql<string>`coalesce(sum(case when ${matriculas.estadoPago} = 'pendiente' then ${matriculas.montoArancel}::numeric else 0 end), 0)`,
      totalMora: sql<string>`coalesce(sum(case when ${matriculas.estadoPago} = 'mora' then ${matriculas.montoArancel}::numeric else 0 end), 0)`,
      totalBecado: sql<string>`coalesce(sum(case when ${matriculas.estadoPago} = 'becado' then ${matriculas.montoArancel}::numeric else 0 end), 0)`,
      matriculasConMonto: sql<number>`count(*) filter (where ${matriculas.montoArancel} is not null)::int`,
    })
    .from(matriculas)
    .where(and(eq(matriculas.activa, true), isNull(matriculas.eliminadoAt)));

  return {
    totalAranceles: Number(result?.totalAranceles ?? 0),
    totalPagado: Number(result?.totalPagado ?? 0),
    totalPendiente: Number(result?.totalPendiente ?? 0),
    totalMora: Number(result?.totalMora ?? 0),
    totalBecado: Number(result?.totalBecado ?? 0),
    matriculasConMonto: Number(result?.matriculasConMonto ?? 0),
  };
}

export async function crearFinanzaAction(input: {
  tipo: "ingreso" | "gasto";
  monto: number;
  descripcion: string;
  categoria?: string;
  asignaturaId?: string;
  fecha: string;
  comprobanteUrl?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_finanza_create", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = finanzaInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos. Verifica los campos e intenta de nuevo.",
    };
  }

  const db = getDb();

  try {
    const [created] = await db
      .insert(finanzas)
      .values({
        tipo: parsed.data.tipo,
        monto: parsed.data.monto.toFixed(2),
        descripcion: sanitizeText(parsed.data.descripcion),
        categoria: parsed.data.categoria ? sanitizeText(parsed.data.categoria) : null,
        asignaturaId: parsed.data.asignaturaId ?? null,
        fecha: parsed.data.fecha,
        comprobanteUrl: parsed.data.comprobanteUrl ?? null,
        createdBy: actorResult.actor.userId,
        createdAt: new Date(),
      })
      .returning({ id: finanzas.id });

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "crear",
      entidad: "finanzas",
      entidadId: created.id,
      payload: { tipo: parsed.data.tipo, monto: parsed.data.monto },
      exitoso: true,
    });

    revalidatePath("/admin/finanzas");
    return { ok: true, code: "finanza_created" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_finanza_create_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "create_failed",
      message: "No fue posible registrar la transacción.",
    };
  }
}

export async function editarFinanzaAction(input: {
  id: string;
  tipo: "ingreso" | "gasto";
  monto: number;
  descripcion: string;
  categoria?: string;
  asignaturaId?: string;
  fecha: string;
  comprobanteUrl?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_finanza_edit", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = editarFinanzaInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos. Verifica los campos e intenta de nuevo.",
    };
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: finanzas.id })
      .from(finanzas)
      .where(and(eq(finanzas.id, parsed.data.id), isNull(finanzas.eliminadoAt)))
      .limit(1);

    if (!existing) {
      return {
        ok: false,
        code: "finanza_not_found",
        message: "Transacción no encontrada.",
      };
    }

    await db
      .update(finanzas)
      .set({
        tipo: parsed.data.tipo,
        monto: parsed.data.monto.toFixed(2),
        descripcion: sanitizeText(parsed.data.descripcion),
        categoria: parsed.data.categoria ? sanitizeText(parsed.data.categoria) : null,
        asignaturaId: parsed.data.asignaturaId ?? null,
        fecha: parsed.data.fecha,
        comprobanteUrl: parsed.data.comprobanteUrl ?? null,
      })
      .where(eq(finanzas.id, parsed.data.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "finanzas",
      entidadId: parsed.data.id,
      payload: { tipo: parsed.data.tipo, monto: parsed.data.monto },
      exitoso: true,
    });

    revalidatePath("/admin/finanzas");
    return { ok: true, code: "finanza_updated" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_finanza_edit_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "edit_failed",
      message: "No fue posible actualizar la transacción.",
    };
  }
}

export async function eliminarFinanzaAction(id: string): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_finanza_delete", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  if (!id || typeof id !== "string") {
    return { ok: false, code: "invalid_input", message: "ID inválido." };
  }

  const db = getDb();

  try {
    const [existing] = await db
      .select({ id: finanzas.id })
      .from(finanzas)
      .where(and(eq(finanzas.id, id), isNull(finanzas.eliminadoAt)))
      .limit(1);

    if (!existing) {
      return {
        ok: false,
        code: "finanza_not_found",
        message: "Transacción no encontrada.",
      };
    }

    await db
      .update(finanzas)
      .set({
        eliminadoAt: new Date(),
        eliminadoPor: actorResult.actor.userId,
      })
      .where(eq(finanzas.id, id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "archivar",
      entidad: "finanzas",
      entidadId: id,
      exitoso: true,
    });

    revalidatePath("/admin/finanzas");
    return { ok: true, code: "finanza_deleted" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId: actorResult.actor.correlationId,
      action: "admin_finanza_delete_failed",
      result: "error",
      userId: actorResult.actor.userId,
      role: actorResult.actor.userRol,
      details: { reason: message },
    });

    return {
      ok: false,
      code: "delete_failed",
      message: "No fue posible eliminar la transacción.",
    };
  }
}
