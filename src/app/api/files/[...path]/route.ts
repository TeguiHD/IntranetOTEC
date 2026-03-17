import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db";
import { material } from "@/db/schema";
import { autorizarOwnership } from "@/lib/authz";
import {
  attachCorrelationId,
  resolveCorrelationId,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { recordHttpMetric } from "@/lib/observability/metrics";
import { getRequestAuthContext } from "@/lib/requestAuth";
import { sanitizePath } from "@/lib/sanitizePath";
import { getPresignedUrl } from "@/lib/storage";

const ALLOWED_BUCKETS = new Set(["material", "entregas"]);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseStoragePath = (
  rawPath: string,
):
  | { ok: true; bucket: string; ownerId: string; objectPath: string; fullPath: string }
  | { ok: false; response: NextResponse } => {
  let safePath: string;

  try {
    safePath = sanitizePath(rawPath);
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_path" }, { status: 400 }),
    };
  }

  const [bucket, ownerId, ...rest] = safePath.split("/");

  if (!bucket || !ownerId || rest.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_path_structure" }, { status: 400 }),
    };
  }

  if (!UUID_REGEX.test(ownerId)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "invalid_owner_id" }, { status: 400 }),
    };
  }

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden_bucket" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    bucket,
    ownerId,
    objectPath: [ownerId, ...rest].join("/"),
    fullPath: safePath,
  };
};

const verificarAccesoArchivo = async (
  userId: string,
  userRol: "admin" | "docente" | "alumno",
  bucket: string,
  ownerId: string,
  fullPath: string,
): Promise<boolean> => {
  const ownership = autorizarOwnership(
    { userId, userRol },
    ownerId,
    { adminOverride: true },
  );

  if (!ownership.permitido) {
    return false;
  }

  if (bucket === "entregas" || userRol === "admin") {
    return true;
  }

  const db = getDb();

  const [record] = await db
    .select({ id: material.id })
    .from(material)
    .where(
      and(eq(material.storagePath, fullPath), eq(material.subidoPor, userId), isNull(material.eliminadoAt)),
    )
    .limit(1);

  return Boolean(record);
};

export async function GET(
  request: NextRequest,
  context: { params: { path: string[] } },
) {
  const startedAt = Date.now();
  const correlationId = resolveCorrelationId(request);
  const endpoint = request.nextUrl.pathname;

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
      "files_auth_required",
    );
  }

  const rawPath = context.params.path.join("/");
  const parsedPath = parseStoragePath(rawPath);

  if (!parsedPath.ok) {
    return finalize(
      parsedPath.response,
      "denied",
      "files_path_invalid",
      undefined,
      authContext.userRol,
      authContext.userId,
    );
  }

  const accesoPermitido = await verificarAccesoArchivo(
    authContext.userId,
    authContext.userRol,
    parsedPath.bucket,
    parsedPath.ownerId,
    parsedPath.fullPath,
  );

  if (!accesoPermitido) {
    return finalize(
      NextResponse.json({ error: "forbidden" }, { status: 403 }),
      "denied",
      "files_access_denied",
      { bucket: parsedPath.bucket },
      authContext.userRol,
      authContext.userId,
    );
  }

  const signedUrl = await getPresignedUrl(parsedPath.bucket, parsedPath.objectPath);

  return finalize(
    NextResponse.redirect(signedUrl),
    "success",
    "files_signed_url_issued",
    { bucket: parsedPath.bucket },
    authContext.userRol,
    authContext.userId,
  );
}
