"use server";

import crypto from "node:crypto";

import { and, eq, gt, isNull } from "drizzle-orm";
import QRCode from "qrcode";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, asistencia, clases, matriculas, qrAsistenciaTokens } from "@/db/schema";
import { requireActionActor } from "@/actions/_security";

const QR_TTL_MINUTES = 30;
const APP_URL = process.env.AUTH_URL ?? "http://localhost:3000";

// ──────────────────────────────────────────────────────────
// Docente: genera o renueva un token QR para una clase
// ──────────────────────────────────────────────────────────
export async function generarQrAsistenciaAction(claseId: string): Promise<{
  ok: boolean;
  svgDataUrl?: string;
  expiresAt?: string;
  error?: string;
}> {
  const authResult = await requireActionActor("qr_generar", ["docente", "admin"]);
  if (!authResult.ok) return { ok: false, error: "No autorizado" };
  const { actor } = authResult;

  const db = getDb();

  // Verificar que el docente sea dueño de la clase
  if (actor.userRol === "docente") {
    const [clase] = await db
      .select({ docenteId: asignaturas.docenteId })
      .from(clases)
      .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
      .where(eq(clases.id, claseId))
      .limit(1);
    if (!clase || clase.docenteId !== actor.userId)
      return { ok: false, error: "No autorizado para esta clase" };
  }

  // Crear token único (64 hex chars)
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + QR_TTL_MINUTES * 60 * 1000);

  // Reemplazar tokens anteriores de esta clase, insertar nuevo
  await db.delete(qrAsistenciaTokens).where(eq(qrAsistenciaTokens.claseId, claseId));
  await db.insert(qrAsistenciaTokens).values({
    claseId,
    token,
    createdBy: actor.userId,
    expiresAt,
  });

  // Generar QR como data URL SVG
  const url = `${APP_URL}/alumno/asistencia/qr/${token}`;
  const svgString = await QRCode.toString(url, { type: "svg", width: 256, margin: 2 });
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  return { ok: true, svgDataUrl, expiresAt: expiresAt.toISOString() };
}

// ──────────────────────────────────────────────────────────
// Alumno: registra asistencia escaneando el QR
// ──────────────────────────────────────────────────────────
export async function registrarAsistenciaQrAction(token: string): Promise<{
  ok: boolean;
  message: string;
  asignaturaNombre?: string;
}> {
  const session = await auth();
  const alumnoId = session?.user?.id;
  if (!alumnoId) return { ok: false, message: "Debes iniciar sesión" };

  const db = getDb();

  // Buscar token válido (no expirado)
  const now = new Date();
  const [qrToken] = await db
    .select()
    .from(qrAsistenciaTokens)
    .where(
      and(
        eq(qrAsistenciaTokens.token, token),
        gt(qrAsistenciaTokens.expiresAt, now),
      ),
    )
    .limit(1);

  if (!qrToken) return { ok: false, message: "El código QR no es válido o ha expirado" };

  // Buscar datos de la clase y su asignatura
  const [claseData] = await db
    .select({
      asignaturaId: clases.asignaturaId,
      asignaturaNombre: asignaturas.nombre,
    })
    .from(clases)
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(eq(clases.id, qrToken.claseId))
    .limit(1);

  if (!claseData) return { ok: false, message: "Clase no encontrada" };

  // Verificar matrícula activa del alumno
  const [matricula] = await db
    .select({ id: matriculas.id })
    .from(matriculas)
    .where(
      and(
        eq(matriculas.alumnoId, alumnoId),
        eq(matriculas.asignaturaId, claseData.asignaturaId),
        eq(matriculas.activa, true),
        isNull(matriculas.eliminadoAt),
      ),
    )
    .limit(1);

  if (!matricula)
    return { ok: false, message: "No estás matriculado en este curso" };

  // Insertar o actualizar asistencia
  const [existing] = await db
    .select({ id: asistencia.id })
    .from(asistencia)
    .where(
      and(
        eq(asistencia.claseId, qrToken.claseId),
        eq(asistencia.matriculaId, matricula.id),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(asistencia)
      .set({ estado: "presente", registradoPor: alumnoId })
      .where(eq(asistencia.id, existing.id));
  } else {
    await db.insert(asistencia).values({
      claseId: qrToken.claseId,
      matriculaId: matricula.id,
      estado: "presente",
      registradoPor: alumnoId,
    });
  }

  return {
    ok: true,
    message: "¡Asistencia registrada correctamente!",
    asignaturaNombre: claseData.asignaturaNombre,
  };
}
