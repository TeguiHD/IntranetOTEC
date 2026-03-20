"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getDb } from "@/db";
import { solicitudesDocumentos, usuarios } from "@/db/schema";
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
}): Promise<MutationResult> {
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

  const [created] = await db
    .insert(solicitudesDocumentos)
    .values({
      alumnoId: actorResult.actor.userId,
      tipo: parsed.data.tipo,
      estado: "pendiente",
      observacion: parsed.data.observacion ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: solicitudesDocumentos.id });

  await registrarAudit({
    correlationId: actorResult.actor.correlationId,
    userId: actorResult.actor.userId,
    userRol: actorResult.actor.userRol,
    accion: "crear",
    entidad: "solicitudes_documentos",
    entidadId: created.id,
    payload: {
      tipo: parsed.data.tipo,
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
    code: "request_created",
  };
}

export async function solicitarDocumentoAlumnoFormAction(formData: FormData): Promise<void> {
  const tipoRaw = getStringField(formData, "tipo");

  const result = await solicitarDocumentoAlumnoAction({
    tipo:
      tipoRaw === "credencial" ||
      tipoRaw === "alumno_regular" ||
      tipoRaw === "tarjeta_beneficio"
        ? tipoRaw
        : "credencial",
    observacion: getStringField(formData, "observacion"),
  });

  revalidatePath("/alumno/solicitudes");
  redirect(`/alumno/solicitudes?state=${result.ok ? result.code : result.code}`);
}

export async function listarSolicitudesDocumentosAdmin() {
  const actorResult = await requireActionActor("admin_solicitudes_list", ["admin"]);

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
      alumnoNombre: usuarios.nombre,
      alumnoApellido: usuarios.apellido,
      alumnoRut: usuarios.rut,
    })
    .from(solicitudesDocumentos)
    .innerJoin(usuarios, eq(solicitudesDocumentos.alumnoId, usuarios.id))
    .orderBy(desc(solicitudesDocumentos.createdAt))
    .limit(100);
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
  redirect(`/admin/solicitudes?state=${result.code}`);
}
