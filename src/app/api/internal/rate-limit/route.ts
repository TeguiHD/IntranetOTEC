import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import {
  attachCorrelationId,
  resolveCorrelationId,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { recordHttpMetric } from "@/lib/observability/metrics";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const payloadSchema = z.object({
  ip: z.string().min(3).max(120),
  endpoint: z.string().min(1).max(255),
});

const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  retryAfterMs?: number,
) => {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (retryAfterMs) {
    headers.set("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
  }

  return new NextResponse(JSON.stringify(body), { status, headers });
};

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const correlationId = resolveCorrelationId(request);
  const endpoint = request.nextUrl.pathname;

  const finalize = (
    response: NextResponse,
    result: "success" | "error" | "denied",
    action: string,
    details?: Record<string, string | number | boolean | null>,
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
      details,
    });

    return attachCorrelationId(response, correlationId);
  };

  const secret = process.env.AUTH_SECRET;
  const headerSecret = request.headers.get("x-rate-limit-internal");

  if (!secret || headerSecret !== secret) {
    return finalize(
      jsonResponse({ error: "forbidden" }, 403),
      "denied",
      "rate_limit_internal_forbidden",
    );
  }

  const parsedBody = payloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return finalize(
      jsonResponse({ error: "invalid_payload" }, 400),
      "error",
      "rate_limit_invalid_payload",
    );
  }

  let result: Awaited<ReturnType<typeof checkRateLimit>>;

  try {
    result = await checkRateLimit(parsedBody.data.ip, parsedBody.data.endpoint);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown_rate_limit_error";

    return finalize(
      jsonResponse({ permitido: true, degraded: true }, 200),
      "error",
      "rate_limit_degraded_allow",
      {
        targetEndpoint: parsedBody.data.endpoint,
        reason,
      },
    );
  }

  if (!result.permitido) {
    return finalize(
      jsonResponse(
        { permitido: false, retryAfterMs: result.retryAfterMs },
        429,
        result.retryAfterMs,
      ),
      "denied",
      "rate_limit_blocked",
      {
        targetEndpoint: parsedBody.data.endpoint,
        retryAfterMs: result.retryAfterMs ?? 0,
      },
    );
  }

  return finalize(
    jsonResponse({ permitido: true }, 200),
    "success",
    "rate_limit_allowed",
    { targetEndpoint: parsedBody.data.endpoint },
  );
}
