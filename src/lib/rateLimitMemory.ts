type Entry = {
  count: number;
  windowStart: number;
  blockedUntil: number;
};

type Rule = {
  max: number;
  windowMs: number;
  blockMs: number;
};

const RULES: Record<string, Rule> = {
  "/api/auth/callback": { max: 5, windowMs: 60_000, blockMs: 900_000 },
  "/login": { max: 60, windowMs: 60_000, blockMs: 60_000 },
  "/api/files": { max: 30, windowMs: 60_000, blockMs: 300_000 },
  "/api/sse": { max: 10, windowMs: 60_000, blockMs: 60_000 },
  default: { max: 60, windowMs: 60_000, blockMs: 60_000 },
};

const store = new Map<string, Entry>();

let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (now - entry.windowStart > entry.blockedUntil + 120_000) {
      store.delete(key);
    }
  }
}

function resolveRule(endpoint: string): Rule {
  if (endpoint.startsWith("/api/auth/callback/")) return RULES["/api/auth/callback"];
  if (endpoint.startsWith("/login")) return RULES["/login"];
  if (endpoint.startsWith("/api/files")) return RULES["/api/files"];
  if (endpoint.startsWith("/api/sse")) return RULES["/api/sse"];
  return RULES.default;
}

export function checkRateLimitMemory(
  ip: string,
  endpoint: string,
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = Date.now();
  cleanup(now);

  const rule = resolveRule(endpoint);
  const key = `${ip}:${endpoint}`;
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
    return { allowed: true };
  }

  if (entry.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  if (now - entry.windowStart > rule.windowMs) {
    entry.count = 1;
    entry.windowStart = now;
    entry.blockedUntil = 0;
    return { allowed: true };
  }

  entry.count++;

  if (entry.count > rule.max) {
    entry.blockedUntil = now + rule.blockMs;
    return { allowed: false, retryAfterSeconds: Math.ceil(rule.blockMs / 1000) };
  }

  return { allowed: true };
}
