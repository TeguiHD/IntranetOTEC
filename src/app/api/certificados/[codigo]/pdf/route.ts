import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db";
import { asignaturas, certificados, matriculas, usuarios } from "@/db/schema";
import { renderCertificadoPdf } from "@/lib/certificatePdf";
import {
  coerceCertificadoSnapshot,
  isCodigoCertificadoValido,
  sanitizeCertificadoText,
} from "@/lib/certificados";
import {
  attachCorrelationId,
  resolveCorrelationId,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { recordHttpMetric } from "@/lib/observability/metrics";
import { getRequestAuthContext } from "@/lib/requestAuth";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ codigo: string }> },
) {
  const startedAt = Date.now();
  const endpoint = request.nextUrl.pathname;
  const correlationId = resolveCorrelationId(request);

  const finalize = (
    response: NextResponse,
    result: "success" | "error" | "denied",
    action: string,
    details?: Record<string, string | number | boolean | null>,
    role?: string | null,
    userId?: string | null,
  ) => {
    const latencyMs = Date.now() - startedAt;

    recordHttpMetric({
      endpoint,
      statusCode: response.status,
      latencyMs,
      correlationId,
      authRelated: true,
    });

    logEvent({
      correlationId,
      action,
      result,
      endpoint,
      statusCode: response.status,
      latencyMs,
      role,
      userId,
      details,
    });

    return attachCorrelationId(response, correlationId);
  };

  const authContext = await getRequestAuthContext(request);

  if (!authContext) {
    return finalize(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      "denied",
      "certificado_pdf_auth_required",
    );
  }

  if (authContext.userRol !== "admin") {
    return finalize(
      NextResponse.json({ error: "forbidden" }, { status: 403 }),
      "denied",
      "certificado_pdf_forbidden",
      undefined,
      authContext.userRol,
      authContext.userId,
    );
  }

  const { codigo } = await context.params;
  const codigoRaw = sanitizeCertificadoText(codigo, 64);

  if (!codigoRaw || !isCodigoCertificadoValido(codigoRaw)) {
    return finalize(
      NextResponse.json({ error: "invalid_codigo" }, { status: 400 }),
      "denied",
      "certificado_pdf_invalid_codigo",
      { hasCodigo: Boolean(codigoRaw) },
      authContext.userRol,
      authContext.userId,
    );
  }

  const db = getDb();

  try {
    const [certificadoRow] = await db
      .select({
        id: certificados.id,
        codigoUnico: certificados.codigoUnico,
        tipo: certificados.tipo,
        valido: certificados.valido,
        fechaEmision: certificados.fechaEmision,
        datosSnapshot: certificados.datosSnapshot,
        alumnoNombreActual: usuarios.nombre,
        alumnoApellidoActual: usuarios.apellido,
        alumnoRutActual: usuarios.rut,
        asignaturaNombre: asignaturas.nombre,
      })
      .from(certificados)
      .innerJoin(matriculas, eq(certificados.matriculaId, matriculas.id))
      .innerJoin(usuarios, eq(matriculas.alumnoId, usuarios.id))
      .leftJoin(asignaturas, eq(matriculas.asignaturaId, asignaturas.id))
      .where(eq(certificados.codigoUnico, codigoRaw))
      .limit(1);

    if (!certificadoRow) {
      return finalize(
        NextResponse.json({ error: "not_found" }, { status: 404 }),
        "denied",
        "certificado_pdf_not_found",
        { codigo: codigoRaw },
        authContext.userRol,
        authContext.userId,
      );
    }

    const snapshot = coerceCertificadoSnapshot(certificadoRow.datosSnapshot);

    const verifyBase =
      sanitizeCertificadoText(process.env.NEXT_PUBLIC_BASE_URL, 200) ??
      sanitizeCertificadoText(request.nextUrl.origin, 200) ??
      "";
    const verifyOrigin = verifyBase.endsWith("/")
      ? verifyBase.slice(0, -1)
      : verifyBase;

    const pdfBuffer = await renderCertificadoPdf({
      codigoUnico: certificadoRow.codigoUnico,
      tipo: certificadoRow.tipo,
      valido: Boolean(certificadoRow.valido),
      alumnoNombre:
        snapshot.alumnoNombre ?? certificadoRow.alumnoNombreActual ?? "Alumno",
      alumnoApellido:
        snapshot.alumnoApellido ?? certificadoRow.alumnoApellidoActual ?? "",
      alumnoRut: snapshot.alumnoRut ?? certificadoRow.alumnoRutActual ?? null,
      cursoNombre: snapshot.nombreCurso ?? certificadoRow.asignaturaNombre ?? null,
      finalidad: snapshot.finalidad ?? null,
      fechaEmision:
        snapshot.fechaEmision ?? certificadoRow.fechaEmision ?? new Date().toISOString(),
      urlVerificacion: `${verifyOrigin}/verificar/${encodeURIComponent(certificadoRow.codigoUnico)}`,
    });

    const response = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"certificado-${certificadoRow.codigoUnico}.pdf\"`,
        "Cache-Control": "private, no-store",
      },
    });

    return finalize(
      response,
      "success",
      "certificado_pdf_download",
      {
        certificadoId: certificadoRow.id,
        valido: Boolean(certificadoRow.valido),
      },
      authContext.userRol,
      authContext.userId,
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_error";

    return finalize(
      NextResponse.json({ error: "pdf_failed" }, { status: 500 }),
      "error",
      "certificado_pdf_failed",
      { reason },
      authContext.userRol,
      authContext.userId,
    );
  }
}
