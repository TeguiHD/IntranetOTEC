import { NextRequest, NextResponse } from "next/server";

export const CORRELATION_ID_HEADER = "x-correlation-id";

const MAX_CORRELATION_ID_LENGTH = 128;

export const ensureCorrelationId = (candidate: string | null): string => {
  if (!candidate) {
    return crypto.randomUUID();
  }

  const trimmed = candidate.trim();

  if (trimmed.length === 0 || trimmed.length > MAX_CORRELATION_ID_LENGTH) {
    return crypto.randomUUID();
  }

  return trimmed;
};

export const resolveCorrelationId = (request: NextRequest): string =>
  ensureCorrelationId(request.headers.get(CORRELATION_ID_HEADER));

export const withCorrelationRequestHeaders = (
  headers: Headers,
  correlationId: string,
): Headers => {
  const nextHeaders = new Headers(headers);
  nextHeaders.set(CORRELATION_ID_HEADER, correlationId);
  return nextHeaders;
};

export const attachCorrelationId = (
  response: NextResponse,
  correlationId: string,
): NextResponse => {
  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
};
