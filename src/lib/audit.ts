import { getDb } from "@/db";
import { auditLogs, type AuditAccion, type Rol } from "@/db/schema";
import { logEvent } from "@/lib/observability/logger";

type AuditParams = {
  correlationId?: string;
  userId: string | null;
  userRol: Rol | null;
  accion: AuditAccion;
  entidad?: string;
  entidadId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  exitoso?: boolean;
};

export async function registrarAudit(params: AuditParams): Promise<void> {
  try {
    const db = getDb();

    await db.insert(auditLogs).values({
      userId: params.userId,
      userRol: params.userRol,
      accion: params.accion,
      entidad: params.entidad,
      entidadId: params.entidadId,
      payload: params.payload,
      ip: params.ip,
      userAgent: params.userAgent,
      exitoso: params.exitoso ?? true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown_audit_error";

    logEvent({
      correlationId: params.correlationId ?? "audit-no-correlation",
      action: "audit_insert_failed",
      result: "error",
      userId: params.userId,
      role: params.userRol,
      details: {
        error: errorMessage,
      },
    });
  }
}
