import { NextRequest, NextResponse } from "next/server";

import { rolPermitidoEnRuta } from "@/lib/authz";
import {
  attachCorrelationId,
  resolveCorrelationId,
  withCorrelationRequestHeaders,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { recordHttpMetric } from "@/lib/observability/metrics";
import { getRequestAuthContext } from "@/lib/requestAuth";

const PUBLIC_ROUTES = ["/login", "/verificar"];

const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

const isAuthCallbackRoute = (pathname: string): boolean =>
  pathname.startsWith("/api/auth/callback/");

const isPublicApiRoute = (pathname: string): boolean =>
  pathname.startsWith("/api/auth") && !isAuthCallbackRoute(pathname);

const getClientIp = (request: NextRequest): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "0.0.0.0";
};

const isAuthRelatedPath = (pathname: string): boolean =>
  pathname.startsWith("/login") ||
  pathname.startsWith("/admin") ||
  pathname.startsWith("/docente") ||
  pathname.startsWith("/alumno") ||
  pathname.startsWith("/api/internal");

const resolvePublicOrigin = (request: NextRequest): string => {
  const configuredOrigin =
    process.env.AUTH_URL?.trim() ?? process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (configuredOrigin) {
    try {
      return new URL(configuredOrigin).origin;
    } catch {
      logEvent({
        correlationId: resolveCorrelationId(request),
        action: "middleware_invalid_public_origin",
        result: "error",
        endpoint: request.nextUrl.pathname,
        details: {
          configuredOrigin,
        },
      });
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (forwardedHost) {
    const protocol = forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : "https";

    return `${protocol}://${forwardedHost}`;
  }

  return request.nextUrl.origin;
};

const normalizeForwardedHeaders = (
  request: NextRequest,
  headers: Headers,
): Headers => {
  const configuredOrigin =
    process.env.AUTH_URL?.trim() ?? process.env.NEXT_PUBLIC_BASE_URL?.trim();

  if (!configuredOrigin) {
    return headers;
  }

  let parsedOrigin: URL;

  try {
    parsedOrigin = new URL(configuredOrigin);
  } catch {
    return headers;
  }

  const currentHost = headers.get("host")?.split(",")[0]?.trim() ?? "";
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim() ?? "";
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "";
  const currentOrigin = headers.get("origin")?.trim() ?? "";
  const currentReferer = headers.get("referer")?.trim() ?? "";
  const invalidHost =
    currentHost.includes("0.0.0.0") ||
    forwardedHost.includes("0.0.0.0") ||
    currentHost.length === 0 ||
    forwardedHost.length === 0;

  if (!invalidHost) {
    return headers;
  }

  headers.set("host", parsedOrigin.host);
  headers.set("x-forwarded-host", parsedOrigin.host);
  headers.set("x-forwarded-proto", parsedOrigin.protocol.replace(":", ""));

  if (!currentOrigin || currentOrigin.includes("0.0.0.0")) {
    headers.set("origin", parsedOrigin.origin);
  }

  if (
    request.nextUrl.pathname.startsWith("/api/auth/") &&
    (!currentReferer || currentReferer.includes("0.0.0.0"))
  ) {
    headers.set("referer", parsedOrigin.origin);
  }

  if (!forwardedProto || forwardedProto === "http") {
    headers.set("x-forwarded-port", parsedOrigin.port || (parsedOrigin.protocol === "https:" ? "443" : "80"));
  }

  return headers;
};

const buildRedirectUrl = (request: NextRequest, path: string): URL =>
  new URL(path, resolvePublicOrigin(request));

const resolveRateLimitUrl = (request: NextRequest): URL => {
  const configuredBaseUrl = process.env.INTERNAL_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return new URL("/api/internal/rate-limit", configuredBaseUrl);
  }

  const internalUrl = new URL("/api/internal/rate-limit", request.url);

  if (
    internalUrl.protocol === "https:" &&
    (internalUrl.hostname === "127.0.0.1" || internalUrl.hostname === "localhost")
  ) {
    internalUrl.protocol = "http:";
  }

  return internalUrl;
};

const checkRateLimit = async (
  request: NextRequest,
  correlationId: string,
): Promise<{ allowed: true } | { allowed: false; response: NextResponse }> => {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return { allowed: true };
  }

  const rateLimitUrl = resolveRateLimitUrl(request);
  let response: Response;

  try {
    response = await fetch(rateLimitUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rate-limit-internal": secret,
        "x-correlation-id": correlationId,
      },
      body: JSON.stringify({
        ip: getClientIp(request),
        endpoint: request.nextUrl.pathname,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";

    logEvent({
      correlationId,
      action: "middleware_rate_limit_unavailable",
      result: "error",
      endpoint: request.nextUrl.pathname,
      statusCode: 503,
      details: {
        reason: message,
        rateLimitUrl: rateLimitUrl.toString(),
      },
    });

    return { allowed: true };
  }

  if (!response.ok && response.status !== 429) {
    logEvent({
      correlationId,
      action: "middleware_rate_limit_degraded",
      result: "error",
      endpoint: request.nextUrl.pathname,
      statusCode: response.status,
      details: {
        reason: "unexpected_status",
        rateLimitUrl: rateLimitUrl.toString(),
      },
    });

    return { allowed: true };
  }

  if (response.status !== 429) {
    return { allowed: true };
  }

  const retryAfter = response.headers.get("Retry-After") ?? "60";

  return {
    allowed: false,
    response: new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": retryAfter },
    }),
  };
};

export async function middleware(request: NextRequest) {
  const startedAt = Date.now();
  const { pathname } = request.nextUrl;
  const correlationId = resolveCorrelationId(request);
  const forwardedHeaders = normalizeForwardedHeaders(
    request,
    withCorrelationRequestHeaders(
      request.headers,
      correlationId,
    ),
  );

  const finalize = (
    response: NextResponse,
    result: "success" | "error" | "denied",
    action: string,
    details?: Record<string, string | number | boolean | null>,
    role?: string | null,
    userId?: string | null,
  ) => {
    const latencyMs = Date.now() - startedAt;
    const enriched = attachCorrelationId(response, correlationId);

    recordHttpMetric({
      endpoint: pathname,
      statusCode: enriched.status,
      latencyMs,
      correlationId,
      authRelated: isAuthRelatedPath(pathname),
    });

    logEvent({
      correlationId,
      action,
      result,
      endpoint: pathname,
      statusCode: enriched.status,
      latencyMs,
      role,
      userId,
      details,
    });

    return enriched;
  };

  if (
    pathname.startsWith("/api/internal/rate-limit") ||
    pathname.startsWith("/api/internal/metrics") ||
    pathname === "/api/health" ||
    isPublicApiRoute(pathname)
  ) {
    return finalize(
      NextResponse.next({ request: { headers: forwardedHeaders } }),
      "success",
      "middleware_public_api_bypass",
    );
  }

  const rateLimit = await checkRateLimit(request, correlationId);

  if (!rateLimit.allowed) {
    return finalize(
      rateLimit.response,
      "denied",
      "middleware_rate_limit_denied",
    );
  }

  if (isAuthCallbackRoute(pathname)) {
    return finalize(
      NextResponse.next({ request: { headers: forwardedHeaders } }),
      "success",
      "middleware_auth_callback_pass",
    );
  }

  if (isPublicRoute(pathname)) {
    return finalize(
      NextResponse.next({ request: { headers: forwardedHeaders } }),
      "success",
      "middleware_public_pass",
    );
  }

  const authContext = await getRequestAuthContext(request);

  if (!authContext) {
    return finalize(
      NextResponse.redirect(buildRedirectUrl(request, "/login")),
      "denied",
      "middleware_no_session",
    );
  }

  const permisoRuta = rolPermitidoEnRuta(pathname, authContext.userRol);

  if (!permisoRuta.permitido) {
    return finalize(
      NextResponse.redirect(buildRedirectUrl(request, `/${authContext.userRol}`)),
      "denied",
      "middleware_role_mismatch",
      { motivo: permisoRuta.motivo },
      authContext.userRol,
      authContext.userId,
    );
  }

  if (pathname === "/") {
    return finalize(
      NextResponse.redirect(buildRedirectUrl(request, `/${authContext.userRol}`)),
      "success",
      "middleware_root_redirect",
      undefined,
      authContext.userRol,
      authContext.userId,
    );
  }

  return finalize(
    NextResponse.next({ request: { headers: forwardedHeaders } }),
    "success",
    "middleware_allow",
    undefined,
    authContext.userRol,
    authContext.userId,
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
