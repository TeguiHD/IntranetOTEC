import { and, eq, isNull } from "drizzle-orm";
import { lookup } from "mime-types";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

import { getDb } from "@/db";
import { asignaturas, clases, material, matriculas } from "@/db/schema";
import {
  attachCorrelationId,
  resolveCorrelationId,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { recordHttpMetric } from "@/lib/observability/metrics";
import { getRequestAuthContext } from "@/lib/requestAuth";
import { getFileSize, getFileStream } from "@/lib/storage";

/**
 * GET /api/files/download/{materialId}
 * Streams file from local storage with auth + enrollment check.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const startedAt = Date.now();
  const correlationId = resolveCorrelationId(request);
  const endpoint = request.nextUrl.pathname;

  const finalize = (
    response: NextResponse | Response,
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

    if (response instanceof NextResponse) {
      return attachCorrelationId(response, correlationId);
    }

    return response;
  };

  const authContext = await getRequestAuthContext(request);

  if (!authContext) {
    return finalize(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
      "denied",
      "files_auth_required",
    );
  }

  const { path: segments } = await context.params;

  // Route: /api/files/download/{materialId}
  if (segments[0] !== "download" || !segments[1]) {
    return finalize(
      NextResponse.json({ error: "invalid_path" }, { status: 400 }),
      "denied",
      "files_path_invalid",
      undefined,
      authContext.userRol,
      authContext.userId,
    );
  }

  const materialId = segments[1];
  const db = getDb();

  // Fetch material + related info in one query
  const [record] = await db
    .select({
      id: material.id,
      nombre: material.nombre,
      storagePath: material.storagePath,
      tamanioBytes: material.tamanioBytes,
      subidoPor: material.subidoPor,
      habilitado: material.habilitado,
      docenteId: asignaturas.docenteId,
      asignaturaId: clases.asignaturaId,
    })
    .from(material)
    .innerJoin(clases, eq(material.claseId, clases.id))
    .innerJoin(asignaturas, eq(clases.asignaturaId, asignaturas.id))
    .where(and(eq(material.id, materialId), isNull(material.eliminadoAt)))
    .limit(1);

  if (!record) {
    return finalize(
      NextResponse.json({ error: "not_found" }, { status: 404 }),
      "denied",
      "files_not_found",
      undefined,
      authContext.userRol,
      authContext.userId,
    );
  }

  // Authorization
  let allowed = false;

  if (authContext.userRol === "admin") {
    allowed = true;
  } else if (authContext.userRol === "docente") {
    allowed = record.docenteId === authContext.userId;
  } else if (authContext.userRol === "alumno") {
    if (!record.habilitado) {
      return finalize(
        NextResponse.json({ error: "material_disabled" }, { status: 404 }),
        "denied",
        "files_material_disabled",
        { materialId },
        authContext.userRol,
        authContext.userId,
      );
    }

    // Check enrollment
    const [enrollment] = await db
      .select({ id: matriculas.id })
      .from(matriculas)
      .where(
        and(
          eq(matriculas.asignaturaId, record.asignaturaId),
          eq(matriculas.alumnoId, authContext.userId),
          eq(matriculas.activa, true),
          isNull(matriculas.eliminadoAt),
        ),
      )
      .limit(1);

    allowed = Boolean(enrollment);
  }

  if (!allowed) {
    return finalize(
      NextResponse.json({ error: "forbidden" }, { status: 403 }),
      "denied",
      "files_access_denied",
      { materialId },
      authContext.userRol,
      authContext.userId,
    );
  }

  // Resolve storage path: "material/userId/claseId-filename"
  const [bucket, ...pathParts] = record.storagePath.split("/");

  if (!bucket || pathParts.length === 0) {
    return finalize(
      NextResponse.json({ error: "storage_error" }, { status: 500 }),
      "error",
      "files_storage_path_invalid",
      { storagePath: record.storagePath },
      authContext.userRol,
      authContext.userId,
    );
  }

  const objectPath = pathParts.join("/");
  const fileResult = getFileStream(bucket, objectPath);

  if (!fileResult) {
    return finalize(
      NextResponse.json({ error: "file_missing" }, { status: 404 }),
      "error",
      "files_physical_missing",
      { storagePath: record.storagePath },
      authContext.userRol,
      authContext.userId,
    );
  }

  const contentType = lookup(record.nombre) || "application/octet-stream";
  const fileSize = record.tamanioBytes ?? (await getFileSize(bucket, objectPath)) ?? 0;

  // Convert Node.js ReadStream to Web ReadableStream
  const webStream = Readable.toWeb(fileResult.stream) as ReadableStream;

  const response = new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(record.nombre)}"`,
      "Content-Length": String(fileSize),
      "Cache-Control": "private, max-age=3600",
      "X-Correlation-Id": correlationId,
    },
  });

  return finalize(
    response,
    "success",
    "files_download",
    { materialId, bucket, size: fileSize },
    authContext.userRol,
    authContext.userId,
  );
}
