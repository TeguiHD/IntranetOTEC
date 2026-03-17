export type ObservabilityResult = "success" | "error" | "denied";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type LogDetails = Record<string, JsonValue>;

export type ObservabilityLogEvent = {
  correlationId: string;
  action: string;
  result: ObservabilityResult;
  endpoint?: string;
  statusCode?: number;
  latencyMs?: number;
  userId?: string | null;
  role?: string | null;
  details?: LogDetails;
};

const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "secret",
  "token",
  "authorization",
  "cookie",
  "rut_salt",
  "database_url",
  "auth_secret",
  "minio_secret",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RUT_REGEX = /^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/;

const isSensitiveKey = (key: string): boolean => {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
};

const maskEmail = (value: string): string => {
  const [local, domain] = value.split("@");

  if (!local || !domain) {
    return "***";
  }

  const visibleLocal = local.slice(0, 2);
  return `${visibleLocal}***@${domain}`;
};

const maskRut = (value: string): string => `${value.slice(0, 2)}.***.***-*`;

const maskIdentifier = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value.length <= 8) {
    return "***";
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const redactString = (value: string, key?: string): string => {
  if (key && isSensitiveKey(key)) {
    return "***REDACTED***";
  }

  if (EMAIL_REGEX.test(value)) {
    return maskEmail(value);
  }

  if (RUT_REGEX.test(value)) {
    return maskRut(value);
  }

  return value;
};

const redactValue = (value: JsonValue, key?: string): JsonValue => {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return redactString(value, key);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }

  const output: { [key: string]: JsonValue } = {};

  for (const [childKey, childValue] of Object.entries(value)) {
    output[childKey] = redactValue(childValue, childKey);
  }

  return output;
};

const redactDetails = (details: LogDetails | undefined): LogDetails | undefined => {
  if (!details) {
    return undefined;
  }

  return redactValue(details) as LogDetails;
};

export function logEvent(event: ObservabilityLogEvent): void {
  const status = event.statusCode ?? 0;

  const level: "info" | "warn" | "error" =
    event.result === "error" || status >= 500
      ? "error"
      : event.result === "denied"
        ? "warn"
        : "info";

  const payload = {
    timestamp: new Date().toISOString(),
    correlationId: event.correlationId,
    action: event.action,
    result: event.result,
    endpoint: event.endpoint,
    statusCode: event.statusCode,
    latencyMs: event.latencyMs,
    userId: maskIdentifier(event.userId),
    role: event.role ?? null,
    details: redactDetails(event.details),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}
