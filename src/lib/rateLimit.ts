import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { rateLimitLog } from "@/db/schema";

type RateLimitRule = {
  max: number;
  ventanaMs: number;
  bloqueoMs: number;
};

const LIMITS: Record<string, RateLimitRule> = {
  "/api/auth/callback": { max: 5, ventanaMs: 60_000, bloqueoMs: 900_000 },
  "/login": { max: 60, ventanaMs: 60_000, bloqueoMs: 60_000 },
  "/api/files": { max: 30, ventanaMs: 60_000, bloqueoMs: 300_000 },
  "/api/internal/import-alumnos": { max: 6, ventanaMs: 300_000, bloqueoMs: 1_800_000 },
  "/api/sse": { max: 10, ventanaMs: 60_000, bloqueoMs: 60_000 },
  default: { max: 60, ventanaMs: 60_000, bloqueoMs: 60_000 },
};

const resolveRule = (endpoint: string): RateLimitRule => {
  if (endpoint.startsWith("/api/auth/callback/")) {
    return LIMITS["/api/auth/callback"];
  }

  if (endpoint.startsWith("/login")) {
    return LIMITS["/login"];
  }

  if (endpoint.startsWith("/api/files")) {
    return LIMITS["/api/files"];
  }

  if (endpoint.startsWith("/api/internal/import-alumnos")) {
    return LIMITS["/api/internal/import-alumnos"];
  }

  if (endpoint.startsWith("/api/sse")) {
    return LIMITS["/api/sse"];
  }

  return LIMITS.default;
};

export async function checkRateLimit(
  ip: string,
  endpoint: string,
): Promise<{ permitido: boolean; retryAfterMs?: number }> {
  const db = getDb();
  const now = new Date();
  const rule = resolveRule(endpoint);

  const [current] = await db
    .select()
    .from(rateLimitLog)
    .where(and(eq(rateLimitLog.ip, ip), eq(rateLimitLog.endpoint, endpoint)))
    .limit(1);

  if (!current) {
    await db.insert(rateLimitLog).values({
      ip,
      endpoint,
      intentos: 1,
      ventanaAt: now,
      bloqueadoAt: null,
    });

    return { permitido: true };
  }

  if (current.bloqueadoAt && current.bloqueadoAt.getTime() > now.getTime()) {
    return {
      permitido: false,
      retryAfterMs: current.bloqueadoAt.getTime() - now.getTime(),
    };
  }

  const lastWindow = current.ventanaAt ?? new Date(0);
  const elapsed = now.getTime() - lastWindow.getTime();

  if (elapsed > rule.ventanaMs) {
    await db
      .update(rateLimitLog)
      .set({
        intentos: 1,
        ventanaAt: now,
        bloqueadoAt: null,
      })
      .where(eq(rateLimitLog.id, current.id));

    return { permitido: true };
  }

  const nextAttempts = (current.intentos ?? 0) + 1;

  if (nextAttempts > rule.max) {
    const blockedUntil = new Date(now.getTime() + rule.bloqueoMs);

    await db
      .update(rateLimitLog)
      .set({
        intentos: nextAttempts,
        ventanaAt: now,
        bloqueadoAt: blockedUntil,
      })
      .where(eq(rateLimitLog.id, current.id));

    return {
      permitido: false,
      retryAfterMs: rule.bloqueoMs,
    };
  }

  await db
    .update(rateLimitLog)
    .set({
      intentos: nextAttempts,
      ventanaAt: now,
      bloqueadoAt: null,
    })
    .where(eq(rateLimitLog.id, current.id));

  return { permitido: true };
}
