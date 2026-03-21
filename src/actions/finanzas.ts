"use server";

import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { finanzas } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { logEvent } from "@/lib/observability/logger";
import {
  crearFinanzaInputSchema,
  editarFinanzaInputSchema,
} from "@/lib/validations/admin";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

const parseMoneyField = (value: string): number | undefined => {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const formatMoneyForDb = (value: number | undefined): string | null => {
  if (value === undefined) {
    return null;
  }

  return value.toFixed(2);
};

const parsePageField = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
};

export async function listarFinanzasAdmin(
  pagination: PaginationInput = {},
  options?: { tipo?: "ingreso" | "gasto" },
) {
  const actorResult = await requireActionActor("admin_finanza_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);

  const conditions = [isNull(finanzas.eliminadoAt)];

  if (options?.tipo) {
    conditions.push(eq(finanzas.tipo, options.tipo));
  }

  return db
    .select({
      id: finanzas.id,
      tipo: finanzas.tipo,
      monto: finanzas.monto,
      descripcion: finanzas.descripcion,
      categoria: finanzas.categoria,
      asignaturaId: finanzas.asignaturaId,
      fecha: finanzas.fecha,
      comprobanteUrl: finanzas.comprobanteUrl,
      createdAt: finanzas.createdAt,
    })
    .from(finanzas)
    .where(and(...conditions))
    .orderBy(desc(finanzas.fecha), desc(finanzas.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countFinanzasAdmin(
  options?: { tipo?: "ingreso" | "gasto" },
): Promise<number> {
  const actorResult = await requireActionActor("admin_finanza_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();

  const conditions = [isNull(finanzas.eliminadoAt)];

  if (options?.tipo) {
    conditions.push(eq(finanzas.tipo, options.tipo));
  }

  const result = await db
    .select({ total: count() })
    .from(finanzas)
    .where(and(...conditions));

  return Number(result[0]?.total ?? 0);
}

export async function resumenFinanzasAdmin(): Promise<{
  totalIngresos: number;
  totalGastos: number;
  balance: number;
}> {
  const actorResult = await requireActionActor("admin_finanza_resumen", ["admin"]);

  if (!actorResult.ok) {
    return { totalIngresos: 0, totalGastos: 0, balance: 0 };
  }

  const db = getDb();

  const result = await db
    .select({
      tipo: finanzas.tipo,
      total: sql<string>`COALESCE(SUM(${finanzas.monto}), 0)`,
    })
    .from(finanzas)
    .where(isNull(finanzas.eliminadoAt))
    .groupBy(finanzas.tipo);

  let totalIngresos = 0;
  let totalGastos = 0;

  for (const row of result) {
    const amount = Number.parseFloat(row.total) || 0;

    if (row.tipo === "ingreso") {
      totalIngresos = amount;
    } else if (row.tipo === "gasto") {
      totalGastos = amount;
    }
  }

  return {
    totalIngresos,
    totalGastos,
    balance: totalIngresos - totalGastos,
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

  const parsed = crearFinanzaInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para el registro financiero.",
    };
  }

  const db = getDb();

  try {
    const [created] = await db
      .insert(finanzas)
      .values({
        tipo: parsed.data.tipo,
        monto: formatMoneyForDb(parsed.data.monto) ?? "0.00",
        descripcion: parsed.data.descripcion,
        categoria: parsed.data.categoria ?? null,
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
      payload: {
        tipo: parsed.data.tipo,
        monto: parsed.data.monto,
      },
      exitoso: true,
    });

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
      code: "finanza_create_failed",
      message: "No fue posible registrar el movimiento financiero.",
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
      message: "Datos inválidos para edición del registro financiero.",
    };
  }

  const db = getDb();

  try {
    const [row] = await db
      .select({ id: finanzas.id })
      .from(finanzas)
      .where(and(eq(finanzas.id, parsed.data.id), isNull(finanzas.eliminadoAt)))
      .limit(1);

    if (!row) {
      return {
        ok: false,
        code: "finanza_not_found",
        message: "Registro financiero no encontrado.",
      };
    }

    await db
      .update(finanzas)
      .set({
        tipo: parsed.data.tipo,
        monto: formatMoneyForDb(parsed.data.monto) ?? "0.00",
        descripcion: parsed.data.descripcion,
        categoria: parsed.data.categoria ?? null,
        asignaturaId: parsed.data.asignaturaId ?? null,
        fecha: parsed.data.fecha,
        comprobanteUrl: parsed.data.comprobanteUrl ?? null,
      })
      .where(eq(finanzas.id, row.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "editar",
      entidad: "finanzas",
      entidadId: row.id,
      payload: {
        tipo: parsed.data.tipo,
        monto: parsed.data.monto,
      },
      exitoso: true,
    });

    return { ok: true, code: "finanza_edited" };
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
      message: "No fue posible editar el registro financiero.",
    };
  }
}

export async function eliminarFinanzaAction(input: {
  id: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_finanza_delete", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  if (!input.id || typeof input.id !== "string") {
    return {
      ok: false,
      code: "invalid_input",
      message: "Registro financiero inválido.",
    };
  }

  const db = getDb();

  try {
    const [row] = await db
      .select({ id: finanzas.id, eliminadoAt: finanzas.eliminadoAt })
      .from(finanzas)
      .where(eq(finanzas.id, input.id))
      .limit(1);

    if (!row) {
      return {
        ok: false,
        code: "finanza_not_found",
        message: "Registro financiero no encontrado.",
      };
    }

    if (row.eliminadoAt) {
      return { ok: true, code: "already_deleted" };
    }

    await db
      .update(finanzas)
      .set({
        eliminadoAt: new Date(),
        eliminadoPor: actorResult.actor.userId,
      })
      .where(eq(finanzas.id, row.id));

    await registrarAudit({
      correlationId: actorResult.actor.correlationId,
      userId: actorResult.actor.userId,
      userRol: actorResult.actor.userRol,
      accion: "desactivar",
      entidad: "finanzas",
      entidadId: row.id,
      exitoso: true,
    });

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
      message: "No fue posible eliminar el registro financiero.",
    };
  }
}

export async function crearFinanzaFormAction(formData: FormData): Promise<void> {
  const page = parsePageField(getStringField(formData, "page"));
  const filterTipo = getStringField(formData, "filterTipo");

  const montoRaw = parseMoneyField(getStringField(formData, "monto"));

  const result = await crearFinanzaAction({
    tipo: getStringField(formData, "tipo") as "ingreso" | "gasto",
    monto: montoRaw ?? 0,
    descripcion: getStringField(formData, "descripcion"),
    categoria: getStringField(formData, "categoria") || undefined,
    asignaturaId: getStringField(formData, "asignaturaId") || undefined,
    fecha: getStringField(formData, "fecha"),
    comprobanteUrl: getStringField(formData, "comprobanteUrl") || undefined,
  });

  revalidatePath("/admin/finanzas");
  const pageQuery = page ? `&page=${page}` : "";
  const tipoQuery = filterTipo ? `&tipo=${encodeURIComponent(filterTipo)}` : "";

  redirect(`/admin/finanzas?state=${result.ok ? result.code : "error"}${tipoQuery}${pageQuery}`);
}

export async function editarFinanzaFormAction(formData: FormData): Promise<void> {
  const page = parsePageField(getStringField(formData, "page"));
  const filterTipo = getStringField(formData, "filterTipo");

  const montoRaw = parseMoneyField(getStringField(formData, "monto"));

  const result = await editarFinanzaAction({
    id: getStringField(formData, "id"),
    tipo: getStringField(formData, "tipo") as "ingreso" | "gasto",
    monto: montoRaw ?? 0,
    descripcion: getStringField(formData, "descripcion"),
    categoria: getStringField(formData, "categoria") || undefined,
    asignaturaId: getStringField(formData, "asignaturaId") || undefined,
    fecha: getStringField(formData, "fecha"),
    comprobanteUrl: getStringField(formData, "comprobanteUrl") || undefined,
  });

  revalidatePath("/admin/finanzas");
  const pageQuery = page ? `&page=${page}` : "";
  const tipoQuery = filterTipo ? `&tipo=${encodeURIComponent(filterTipo)}` : "";

  redirect(`/admin/finanzas?state=${result.ok ? result.code : "error"}${tipoQuery}${pageQuery}`);
}

export async function eliminarFinanzaFormAction(formData: FormData): Promise<void> {
  const page = parsePageField(getStringField(formData, "page"));
  const filterTipo = getStringField(formData, "filterTipo");

  const result = await eliminarFinanzaAction({
    id: getStringField(formData, "id"),
  });

  revalidatePath("/admin/finanzas");
  const pageQuery = page ? `&page=${page}` : "";
  const tipoQuery = filterTipo ? `&tipo=${encodeURIComponent(filterTipo)}` : "";

  redirect(`/admin/finanzas?state=${result.ok ? result.code : "error"}${tipoQuery}${pageQuery}`);
}
