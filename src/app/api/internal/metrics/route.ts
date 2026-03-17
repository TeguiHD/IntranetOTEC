import { NextRequest, NextResponse } from "next/server";

import {
  attachCorrelationId,
  resolveCorrelationId,
} from "@/lib/observability/correlation";
import { logEvent } from "@/lib/observability/logger";
import { getMetricsSnapshot, recordHttpMetric } from "@/lib/observability/metrics";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
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
  const internalSecret = request.headers.get("x-observability-internal");

  if (!secret || internalSecret !== secret) {
    return finalize(
      NextResponse.json({ error: "forbidden" }, { status: 403 }),
      "denied",
      "internal_metrics_denied",
    );
  }

  const snapshot = getMetricsSnapshot();

  return finalize(
    NextResponse.json(snapshot, { status: 200 }),
    "success",
    "internal_metrics_snapshot",
    {
      alerts: snapshot.alerts.length,
      endpoints: snapshot.endpoints.length,
    },
  );
}
