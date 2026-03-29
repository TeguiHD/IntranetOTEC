// Desarrollado por Nicoholas Lopetegui — https://nicoholas.dev/
// Diseño y desarrollo web: Victor Salinas — NETLINKS (instagram.com/netlinks.cl)

import { NextRequest, NextResponse } from "next/server";

import { rolPermitidoEnRuta } from "@/lib/authz";
import {
  attachCorrelationId,
  resolveCorrelationId,
  withCorrelationRequestHeaders,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { recordHttpMetric } from "@/lib/observability/metrics";
import { checkRateLimitMemory } from "@/lib/rateLimitMemory";
import { getRequestAuthContext } from "@/lib/requestAuth";

const PUBLIC_ROUTES = ["/login", "/verificar", "/manifest.json", "/offline.html"];

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
  pathname.startsWith("/api/internal") ||
  pathname.startsWith("/api/auth");

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

const buildRedirectUrl = (request: NextRequest, path: string): URL =>
  new URL(path, resolvePublicOrigin(request));

const checkRateLimit = (
  request: NextRequest,
): { allowed: true } | { allowed: false; response: NextResponse } => {
  const result = checkRateLimitMemory(getClientIp(request), request.nextUrl.pathname);

  if (result.allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    response: new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    }),
  };
};

export async function middleware(request: NextRequest) {
  const startedAt = Date.now();
  const { pathname } = request.nextUrl;
  const correlationId = resolveCorrelationId(request);
  const forwardedHeaders = withCorrelationRequestHeaders(
    request.headers,
    correlationId,
  );

  // Fallback for misconfigured reverse proxies (e.g. Apache without ProxyPreserveHost)
  // Ensure NextAuth reads the correct original host
  const authUrl = process.env.AUTH_URL?.trim();
  if (authUrl) {
    try {
      const parsedUrl = new URL(authUrl);
      if (!forwardedHeaders.has("x-forwarded-host") || forwardedHeaders.get("host")?.includes("0.0.0.0")) {
        forwardedHeaders.set("x-forwarded-host", parsedUrl.host);
        forwardedHeaders.set("x-forwarded-proto", parsedUrl.protocol.replace(":", ""));
      }
    } catch {}
  }

  // Expose pathname to server components via header
  forwardedHeaders.set("x-pathname", pathname);

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
    isPublicApiRoute(pathname)
  ) {
    return finalize(
      NextResponse.next({ request: { headers: forwardedHeaders } }),
      "success",
      "middleware_public_api_bypass",
    );
  }

  const rateLimit = checkRateLimit(request);

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|css|js)$).*)"],
};
