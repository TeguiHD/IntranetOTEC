"use server";

import { and, count, desc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { auditLogs, usuarios } from "@/db/schema";

import { resolvePagination, type PaginationInput } from "./_pagination";
import { requireActionActor } from "./_security";

type AuditFilterOptions = {
  accion?: string;
  userId?: string;
  desde?: string;
  hasta?: string;
};

function buildAuditFilters(options?: AuditFilterOptions) {
  const conditions = [];

  if (options?.accion) {
    conditions.push(eq(auditLogs.accion, options.accion as never));
  }

  if (options?.userId) {
    conditions.push(eq(auditLogs.userId, options.userId));
  }

  if (options?.desde) {
    conditions.push(gte(auditLogs.createdAt, new Date(options.desde)));
  }

  if (options?.hasta) {
    const hastaDate = new Date(options.hasta);
    hastaDate.setHours(23, 59, 59, 999);
    conditions.push(lte(auditLogs.createdAt, hastaDate));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listarAuditLogsAdmin(
  pagination: PaginationInput = {},
  options?: AuditFilterOptions,
) {
  const actorResult = await requireActionActor("admin_audit_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const { limit, offset } = resolvePagination(pagination);
  const whereClause = buildAuditFilters(options);

  return db
    .select({
      id: auditLogs.id,
      userId: auditLogs.userId,
      userRol: auditLogs.userRol,
      accion: auditLogs.accion,
      entidad: auditLogs.entidad,
      entidadId: auditLogs.entidadId,
      exitoso: auditLogs.exitoso,
      ip: auditLogs.ip,
      createdAt: auditLogs.createdAt,
      usuarioNombre: usuarios.nombre,
      usuarioApellido: usuarios.apellido,
    })
    .from(auditLogs)
    .leftJoin(usuarios, eq(auditLogs.userId, usuarios.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countAuditLogsAdmin(
  options?: AuditFilterOptions,
): Promise<number> {
  const actorResult = await requireActionActor("admin_audit_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();
  const whereClause = buildAuditFilters(options);

  const baseQuery = db.select({ total: count() }).from(auditLogs);

  const result = whereClause
    ? await baseQuery.where(whereClause)
    : await baseQuery;

  return Number(result[0]?.total ?? 0);
}
