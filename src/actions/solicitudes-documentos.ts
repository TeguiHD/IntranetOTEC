"use server";

import { and, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import {
  alumnoAccesosDocumentos,
  asignaturas,
  matriculas,
  periodosAcademicos,
  solicitudesDocumentos,
  usuarios,
} from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import {
  sendEmail,
  templateSolicitudCreada,
  templateSolicitudResuelta,
} from "@/lib/email";
import { solicitudDocumentoInputSchema } from "@/lib/validations/admin";

import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
};

export type ElegibilidadAlumnoRegular = {
  eligible: boolean;
  reasons: string[];
  matricula: {
    id: string;
    asignaturaNombre: string;
    asignaturaEstado: string | null;
    periodoNombre: string | null;
    periodoEstado: string | null;
    estadoPago: string | null;
  } | null;
};

const ESTADOS_PAGO_OK = new Set(["pagado", "becado"]);

/**
 * Evalua si un alumno puede recibir un certificado de "alumno regular"
 * automaticamente segun reglas del Word: matricula activa, periodo
 * activo, asignatura activa y pago al dia. Devuelve siempre la
 * matricula candidata (si existe) y motivos legibles tanto si cumple
 * como si no, para que la observacion de la solicitud sea util al
 * alumno y al admin.
 */
export async function evaluarElegibilidadAlumnoRegular(
  alumnoId: string,
): Promise<ElegibilidadAlumnoRegular> {
  const db = getDb();

  const filas = await db
    .select({
      matriculaId: matriculas.id,
      activa: matriculas.activa,
      eliminadoAt: matriculas.eliminadoAt,
      estadoPago: matriculas.estadoPago,
      asignaturaNombre: asignaturas.nombre,
      asignaturaEstado: asignaturas.estado,
      asignaturaEliminadoAt: asignaturas.eliminadoAt,
      periodoNombre: periodosAcademicos.nombre,
      periodoEstado: periodosAcademicos.estado,
    })
    .from(matriculas)
    .innerJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
    .innerJoin(periodosAcademicos, eq(asignaturas.periodoId, periodosAcademicos.id))
    .where(eq(matriculas.alumnoId, alumnoId))
    .orderBy(desc(matriculas.createdAt));

  if (filas.length === 0) {
    return {
      eligible: false,
      reasons: ["El alumno no tiene matriculas registradas."],
      matricula: null,
    };
  }

  const candidata =
    filas.find(
      (f) =>
        f.activa === true &&
        !f.eliminadoAt &&
        !f.asignaturaEliminadoAt &&
        f.asignaturaEstado === "activo" &&
        f.periodoEstado === "activo",
    ) ?? null;

  if (!candidata) {
    const reasons: string[] = [];
    const last = filas[0];
    if (last.eliminadoAt || last.activa === false) {
      reasons.push("La ultima matricula del alumno esta inactiva o eliminada.");
    }
    if (last.asignaturaEstado !== "activo") {
      reasons.push(
        `La asignatura "${last.asignaturaNombre}" esta en estado ${last.asignaturaEstado ?? "desconocido"}, no activa.`,
      );
    }
    if (last.periodoEstado !== "activo") {
      reasons.push(
        `El periodo "${last.periodoNombre ?? ""}" esta en estado ${last.periodoEstado ?? "desconocido"}, no activo.`,
      );
    }
    if (reasons.length === 0) {
      reasons.push(
        "No hay matriculas que cumplan las condiciones de alumno regular en periodo activo.",
      );
    }
    return {
      eligible: false,
      reasons,
      matricula: {
        id: last.matriculaId,
        asignaturaNombre: last.asignaturaNombre,
        asignaturaEstado: last.asignaturaEstado,
        periodoNombre: last.periodoNombre,
        periodoEstado: last.periodoEstado,
        estadoPago: last.estadoPago,
      },
    };
  }

  const pagoOk = candidata.estadoPago && ESTADOS_PAGO_OK.has(candidata.estadoPago);
  const reasons: string[] = [];

  if (!pagoOk) {
    reasons.push(
      `Estado de pago "${candidata.estadoPago ?? "sin registrar"}" requiere revision.`,
    );
  }

  return {
    eligible: Boolean(pagoOk),
    reasons:
      reasons.length === 0
        ? [
            `Cumple: matricula activa en ${candidata.asignaturaNombre}, periodo ${candidata.periodoNombre ?? ""} activo, pago ${candidata.estadoPago ?? ""}.`,
          ]
        : reasons,
    matricula: {
      id: candidata.matriculaId,
      asignaturaNombre: candidata.asignaturaNombre,
      asignaturaEstado: candidata.asignaturaEstado,
      periodoNombre: candidata.periodoNombre,
      periodoEstado: candidata.periodoEstado,
      estadoPago: candidata.estadoPago,
    },
  };
}

const formatTipoSolicitud = (
  tipo: "credencial" | "alumno_regular" | "tarjeta_beneficio",
): string => {
  switch (tipo) {
    case "alumno_regular":
      return "Alumno regular";
    case "tarjeta_beneficio":
      return "Tarjeta beneficio";
    default:
      return "Credencial";
  }
};

export async function obtenerPerfilAlumnoActual(): Promise<{
  id: string;
  nombre: string;
  apellido: string;
  rut: string | null;
} | null> {
  const actorResult = await requireActionActor("alumno_perfil", ["alumno"]);
  if (!actorResult.ok) return null;

  const db = getDb();
  const [row] = await db
    .select({ id: usuarios.id, nombre: usuarios.nombre, apellido: usuarios.apellido, rut: usuarios.rut })
    .from(usuarios)
    .where(eq(usuarios.id, actorResult.actor.userId))
    .limit(1);

  return row ?? null;
}

export async function listarSolicitudesDocumentosAlumno() {
  const actorResult = await requireActionActor("alumno_solicitudes_documentos_list", ["alumno"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();

  return db
    .select({
      id: solicitudesDocumentos.id,
      tipo: solicitudesDocumentos.tipo,
      estado: solicitudesDocumentos.estado,
      observacion: solicitudesDocumentos.observacion,
      createdAt: solicitudesDocumentos.createdAt,
      resueltoAt: solicitudesDocumentos.resueltoAt,
    })
    .from(solicitudesDocumentos)
    .where(eq(solicitudesDocumentos.alumnoId, actorResult.actor.userId))
    .orderBy(desc(solicitudesDocumentos.createdAt))
    .limit(50);
}

export async function solicitarDocumentoAlumnoAction(input: {
  tipo: "credencial" | "alumno_regular" | "tarjeta_beneficio";
  observacion?: string;
}): Promise<MutationResult & { solicitudId?: string }> {
  const actorResult = await requireActionActor("alumno_solicitudes_documentos_create", ["alumno"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = solicitudDocumentoInputSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "La solicitud contiene datos inválidos.",
    };
  }

  const db = getDb();

  if (parsed.data.tipo === "credencial" || parsed.data.tipo === "tarjeta_beneficio") {
    const [access] = await db
      .select({
        beneficioHabilitado: sql<boolean>`coalesce(${alumnoAccesosDocumentos.beneficioHabilitado}, true)`,
        credencialHabilitada: sql<boolean>`coalesce(${alumnoAccesosDocumentos.credencialHabilitada}, true)`,
      })
      .from(usuarios)
      .leftJoin(alumnoAccesosDocumentos, eq(alumnoAccesosDocumentos.alumnoId, usuarios.id))
      .where(eq(usuarios.id, actorResult.actor.userId))
      .limit(1);

    const isAllowed =
      parsed.data.tipo === "credencial"
        ? (access?.credencialHabilitada ?? true)
        : (access?.beneficioHabilitado ?? true);

    if (!isAllowed) {
      return {
        ok: false,
        code: "access_disabled",
        message: "Este documento no está habilitado para tu usuario o curso.",
      };
    }
  }

  const [existingPending] = await db
    .select({ id: solicitudesDocumentos.id })
    .from(solicitudesDocumentos)
    .where(
      and(
        eq(solicitudesDocumentos.alumnoId, actorResult.actor.userId),
        eq(solicitudesDocumentos.tipo, parsed.data.tipo),
        eq(solicitudesDocumentos.estado, "pendiente"),
      ),
    )
    .limit(1);

  if (existingPending) {
    return {
      ok: false,
      code: "already_pending",
      message: "Ya tienes una solicitud pendiente para este documento.",
    };
  }

  const now = new Date();

  let estadoInicial: "pendiente" | "aprobada" = "pendiente";
  let observacionInicial = parsed.data.observacion ?? null;

  if (parsed.data.tipo === "alumno_regular") {
    const elegibilidad = await evaluarElegibilidadAlumnoRegular(actorResult.actor.userId);
    const prefix = elegibilidad.eligible
      ? "Auto-evaluacion: cumple."
      : "Auto-evaluacion: requiere revision.";
    const detalle = elegibilidad.reasons.join(" ");
    const userNote = parsed.data.observacion?.trim();
    observacionInicial = [prefix, detalle, userNote ? `Nota del alumno: ${userNote}` : ""]
      .filter(Boolean)
      .join(" ")
      .slice(0, 500);

    if (elegibilidad.eligible) {
      estadoInicial = "aprobada";
    }
  }

  const [created] = await db
    .insert(solicitudesDocumentos)
    .values({
      alumnoId: actorResult.actor.userId,
      tipo: parsed.data.tipo,
      estado: estadoInicial,
      observacion: observacionInicial,
      resueltoPor: null,
      resueltoAt: estadoInicial === "aprobada" ? now : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: solicitudesDocumentos.id });

  if (!created) return { ok: false, code: "error" as const, message: "No se pudo crear la solicitud" };

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "crear",
    entidad: "solicitudes_documentos",
    entidadId: created.id,
    payload: {
      tipo: parsed.data.tipo,
      estadoInicial,
      autoEvaluacion: parsed.data.tipo === "alumno_regular" ? true : undefined,
    },
    exitoso: true,
  });

  const [alumno] = await db
    .select({
      nombre: usuarios.nombre,
      apellido: usuarios.apellido,
      email: usuarios.email,
    })
    .from(usuarios)
    .where(eq(usuarios.id, actorResult.actor.userId))
    .limit(1);

  if (alumno?.email) {
    const { subject, html } = templateSolicitudCreada({
      alumnoNombre: `${alumno.nombre} ${alumno.apellido}`.trim(),
      tipoSolicitud: formatTipoSolicitud(parsed.data.tipo),
    });
    sendEmail(alumno.email, subject, html).catch(() => {});
  }

  return {
    ok: true,
    code: estadoInicial === "aprobada" ? "request_auto_approved" : "request_created",
    solicitudId: created.id,
  };
}

export async function solicitarDocumentoAlumnoFormAction(formData: FormData): Promise<void> {
  const tipoRaw = getStringField(formData, "tipo");
  const tipo =
    tipoRaw === "credencial" ||
    tipoRaw === "alumno_regular" ||
    tipoRaw === "tarjeta_beneficio"
      ? tipoRaw
      : "credencial";

  const result = await solicitarDocumentoAlumnoAction({
    tipo,
    observacion: getStringField(formData, "observacion"),
  });

  revalidatePath("/alumno/solicitudes");
  revalidatePath("/alumno/solicitudes/credencial");
  revalidatePath("/alumno/solicitudes/tarjeta-beneficio");
  revalidatePath("/alumno/solicitudes/alumno-regular");

  redirect(`/alumno/solicitudes?state=${result.ok ? result.code : result.code}`);
}

export async function countSolicitudesPendientesAdmin(): Promise<number> {
  const actorResult = await requireActionActor("admin_solicitudes_list", ["admin"]);

  if (!actorResult.ok) {
    return 0;
  }

  const db = getDb();
  const [result] = await db
    .select({ total: count() })
    .from(solicitudesDocumentos)
    .where(eq(solicitudesDocumentos.estado, "pendiente"));

  return Number(result?.total ?? 0);
}

const SOLICITUDES_PAGE_SIZE_DEFAULT = 30;
const SOLICITUDES_PAGE_SIZE_MAX = 100;

const escapeLikeSolicitud = (s: string) =>
  s.replace(/%/g, "\\%").replace(/_/g, "\\_");

type SolicitudesFilters = {
  q?: string;
  tipo?: "credencial" | "alumno_regular" | "tarjeta_beneficio";
  estado?: "pendiente" | "aprobada" | "rechazada";
};

const buildSolicitudesFilters = (options?: SolicitudesFilters): SQL[] => {
  const conditions: SQL[] = [];

  if (options?.tipo) {
    conditions.push(eq(solicitudesDocumentos.tipo, options.tipo));
  }

  if (options?.estado) {
    conditions.push(eq(solicitudesDocumentos.estado, options.estado));
  }

  if (options?.q) {
    const term = `%${escapeLikeSolicitud(options.q)}%`;
    const ors = or(
      ilike(usuarios.nombre, term),
      ilike(usuarios.apellido, term),
      ilike(usuarios.rut, term),
      ilike(
        sql<string>`concat_ws(' ', ${usuarios.nombre}, ${usuarios.apellido})`,
        term,
      ),
    );
    if (ors) conditions.push(ors);
  }

  return conditions;
};

export async function listarSolicitudesDocumentosAdmin(
  options?: SolicitudesFilters & { limit?: number; offset?: number },
) {
  const actorResult = await requireActionActor("admin_solicitudes_list", ["admin"]);

  if (!actorResult.ok) {
    return [];
  }

  const db = getDb();
  const limit = Math.max(
    1,
    Math.min(options?.limit ?? SOLICITUDES_PAGE_SIZE_DEFAULT, SOLICITUDES_PAGE_SIZE_MAX),
  );
  const offset = Math.max(0, options?.offset ?? 0);
  const conditions = buildSolicitudesFilters(options);

  const baseQuery = db
    .select({
      id: solicitudesDocumentos.id,
      tipo: solicitudesDocumentos.tipo,
      estado: solicitudesDocumentos.estado,
      observacion: solicitudesDocumentos.observacion,
      createdAt: solicitudesDocumentos.createdAt,
      resueltoAt: solicitudesDocumentos.resueltoAt,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(solicitudesDocumentos)
    .innerJoin(usuarios, eq(solicitudesDocumentos.alumnoId, usuarios.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

  return filtered
    .orderBy(desc(solicitudesDocumentos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countSolicitudesDocumentosAdmin(
  options?: SolicitudesFilters,
): Promise<number> {
  const actorResult = await requireActionActor("admin_solicitudes_list", ["admin"]);
  if (!actorResult.ok) return 0;

  const db = getDb();
  const conditions = buildSolicitudesFilters(options);

  const baseQuery = db
    .select({ total: count(solicitudesDocumentos.id) })
    .from(solicitudesDocumentos)
    .innerJoin(usuarios, eq(solicitudesDocumentos.alumnoId, usuarios.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const [row] = await filtered;
  return Number(row?.total ?? 0);
}

export type ResumenSolicitudesAdmin = {
  total: number;
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
  autoEvaluadas: number;
};

export async function resumenSolicitudesAdmin(
  options?: SolicitudesFilters,
): Promise<ResumenSolicitudesAdmin> {
  const actorResult = await requireActionActor("admin_solicitudes_list", ["admin"]);
  if (!actorResult.ok) {
    return { total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0, autoEvaluadas: 0 };
  }

  const db = getDb();
  const conditions = buildSolicitudesFilters(options);

  const baseQuery = db
    .select({
      total: count(solicitudesDocumentos.id),
      pendientes: sql<number>`count(*) filter (where ${solicitudesDocumentos.estado} = 'pendiente')::int`,
      aprobadas: sql<number>`count(*) filter (where ${solicitudesDocumentos.estado} = 'aprobada')::int`,
      rechazadas: sql<number>`count(*) filter (where ${solicitudesDocumentos.estado} = 'rechazada')::int`,
      autoEvaluadas: sql<number>`count(*) filter (where ${solicitudesDocumentos.observacion} ilike 'Auto-evaluacion:%')::int`,
    })
    .from(solicitudesDocumentos)
    .innerJoin(usuarios, eq(solicitudesDocumentos.alumnoId, usuarios.id));

  const filtered = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;
  const [row] = await filtered;
  return {
    total: Number(row?.total ?? 0),
    pendientes: Number(row?.pendientes ?? 0),
    aprobadas: Number(row?.aprobadas ?? 0),
    rechazadas: Number(row?.rechazadas ?? 0),
    autoEvaluadas: Number(row?.autoEvaluadas ?? 0),
  };
}

const resolverSolicitudSchema = z.object({
  solicitudId: z.string().uuid(),
  estado: z.enum(["aprobada", "rechazada"]),
  observacion: z.string().max(300).optional(),
});

export async function resolverSolicitudAdminAction(input: {
  solicitudId: string;
  estado: "aprobada" | "rechazada";
  observacion?: string;
}): Promise<MutationResult> {
  const actorResult = await requireActionActor("admin_solicitudes_resolve", ["admin"]);

  if (!actorResult.ok) {
    return actorResult.result;
  }

  const parsed = resolverSolicitudSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid_input",
      message: "Datos inválidos para resolver la solicitud.",
    };
  }

  const db = getDb();
  const now = new Date();

  const [solicitud] = await db
    .select({
      id: solicitudesDocumentos.id,
      estado: solicitudesDocumentos.estado,
      tipo: solicitudesDocumentos.tipo,
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoEmail: usuarios.email,
    })
    .from(solicitudesDocumentos)
    .innerJoin(usuarios, eq(solicitudesDocumentos.alumnoId, usuarios.id))
    .where(eq(solicitudesDocumentos.id, parsed.data.solicitudId))
    .limit(1);

  if (!solicitud) {
    return {
      ok: false,
      code: "not_found",
      message: "Solicitud no encontrada.",
    };
  }

  if (solicitud.estado !== "pendiente") {
    return {
      ok: false,
      code: "already_resolved",
      message: "La solicitud ya fue resuelta.",
    };
  }

  await db
    .update(solicitudesDocumentos)
    .set({
      estado: parsed.data.estado,
      observacion: parsed.data.observacion ?? null,
      resueltoPor: actorResult.actor.userId,
      resueltoAt: now,
      updatedAt: now,
    })
    .where(eq(solicitudesDocumentos.id, parsed.data.solicitudId));

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "editar",
    entidad: "solicitudes_documentos",
    entidadId: parsed.data.solicitudId,
    payload: {
      nuevoEstado: parsed.data.estado,
    },
    exitoso: true,
  });

  if (solicitud.alumnoEmail) {
    const { subject, html } = templateSolicitudResuelta({
      alumnoNombre: `${solicitud.alumnoNombre} ${solicitud.alumnoApellido}`.trim(),
      tipoSolicitud: formatTipoSolicitud(solicitud.tipo),
      estado: parsed.data.estado,
      respuesta: parsed.data.observacion ?? null,
    });

    sendEmail(solicitud.alumnoEmail, subject, html).catch(() => {});
  }

  return {
    ok: true,
    code: `solicitud_${parsed.data.estado}`,
  };
}

export async function resolverSolicitudAdminFormAction(formData: FormData): Promise<void> {
  const estadoRaw = getStringField(formData, "estado");

  const result = await resolverSolicitudAdminAction({
    solicitudId: getStringField(formData, "solicitudId"),
    estado: estadoRaw === "rechazada" ? "rechazada" : "aprobada",
    observacion: getStringField(formData, "observacion") || undefined,
  });

  revalidatePath("/admin/solicitudes");
  revalidatePath("/alumno/solicitudes", "layout");
  redirect(`/admin/solicitudes?state=${result.code}`);
}

export async function eliminarSolicitudesResueltasAction(): Promise<void> {
  const actorResult = await requireActionActor("admin_solicitudes_delete_resolved", ["admin"]);

  if (!actorResult.ok) {
    revalidatePath("/admin/solicitudes");
    redirect("/admin/solicitudes?state=forbidden");
    return;
  }

  const db = getDb();

  const deleted = await db
    .delete(solicitudesDocumentos)
    .where(
      or(
        eq(solicitudesDocumentos.estado, "aprobada"),
        eq(solicitudesDocumentos.estado, "rechazada"),
      ),
    )
    .returning({ id: solicitudesDocumentos.id });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "desactivar",
    entidad: "solicitudes_documentos",
    payload: { action: "delete_resolved", count: deleted.length },
    exitoso: true,
  });

  revalidatePath("/admin/solicitudes");
  redirect(`/admin/solicitudes?state=solicitudes_limpiadas`);
}
