"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/db";
import { solicitudesDocumentos } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { solicitudDocumentoInputSchema } from "@/lib/validations/admin";

import { requireActionActor, type MutationResult } from "./_security";

const getStringField = (formData: FormData, field: string): string => {
  const rawValue = formData.get(field);
  return typeof rawValue === "string" ? rawValue : "";
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
