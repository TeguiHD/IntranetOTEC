type MetricSample = {
  timestamp: number;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  correlationId: string;
  authRelated: boolean;
};

type AlertType = "5xx_spike" | "auth_anomaly" | "latency_anomaly" | "critical_cve";

type AlertSeverity = "warning" | "critical";

type ObservabilityAlert = {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string;
};

type EndpointMetrics = {
  endpoint: string;
  requests: number;
  errors: number;
  errorRate: number;
  throughputPerMin: number;
  latency: {
    p50: number;
    p95: number;
    p99: number;
  };
  statusCodes: Record<string, number>;
};

type MetricsSnapshot = {
  generatedAt: string;
  windowMs: number;
  totals: {
    requests: number;
    errors: number;
    errorRate: number;
    throughputPerMin: number;
    authAnomalies: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  endpoints: EndpointMetrics[];
  alerts: ObservabilityAlert[];
};

const WINDOW_MS = 15 * 60_000;
const ALERT_WINDOW_MS = 5 * 60_000;
const MAX_SAMPLES = 20_000;

const AUTH_ANOMALY_CODES = new Set([401, 403, 429]);

type GlobalWithMetrics = typeof globalThis & {
  __otecMetricSamples?: MetricSample[];
};

const getStore = (): MetricSample[] => {
  const globalMetrics = globalThis as GlobalWithMetrics;

  if (!globalMetrics.__otecMetricSamples) {
    globalMetrics.__otecMetricSamples = [];
  }

  return globalMetrics.__otecMetricSamples;
};

const quantile = (values: number[], percentile: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1);

  return Number(sorted[index].toFixed(2));
};

const toRatePerMinute = (count: number, windowMs: number): number =>
  Number((count / (windowMs / 60_000)).toFixed(3));

const toErrorRate = (errors: number, requests: number): number => {
  if (requests === 0) {
    return 0;
  }

  return Number((errors / requests).toFixed(4));
};

const pruneSamples = (samples: MetricSample[], nowMs: number): MetricSample[] => {
  const lowerBound = nowMs - WINDOW_MS;
  const recent = samples.filter((sample) => sample.timestamp >= lowerBound);

  if (recent.length <= MAX_SAMPLES) {
    return recent;
  }

  return recent.slice(recent.length - MAX_SAMPLES);
};

export const recordHttpMetric = (sample: Omit<MetricSample, "timestamp">): void => {
  const nowMs = Date.now();
  const samples = getStore();

  samples.push({ ...sample, timestamp: nowMs });

  const pruned = pruneSamples(samples, nowMs);
  const globalMetrics = globalThis as GlobalWithMetrics;
  globalMetrics.__otecMetricSamples = pruned;
};

const buildEndpointMetrics = (endpoint: string, samples: MetricSample[]): EndpointMetrics => {
  const requests = samples.length;
  const errors = samples.filter((sample) => sample.statusCode >= 500).length;
  const latencies = samples.map((sample) => sample.latencyMs);
  const statusCodes: Record<string, number> = {};

  for (const sample of samples) {
    const key = String(sample.statusCode);
    statusCodes[key] = (statusCodes[key] ?? 0) + 1;
  }

  return {
    endpoint,
    requests,
    errors,
    errorRate: toErrorRate(errors, requests),
    throughputPerMin: toRatePerMinute(requests, WINDOW_MS),
    latency: {
      p50: quantile(latencies, 50),
      p95: quantile(latencies, 95),
      p99: quantile(latencies, 99),
    },
    statusCodes,
  };
};

const buildAlerts = (
  samples: MetricSample[],
  endpointMetrics: EndpointMetrics[],
): ObservabilityAlert[] => {
  const alerts: ObservabilityAlert[] = [];
  const nowMs = Date.now();
  const lowerBound = nowMs - ALERT_WINDOW_MS;
  const recent = samples.filter((sample) => sample.timestamp >= lowerBound);

  const fiveXxCount = recent.filter((sample) => sample.statusCode >= 500).length;

  if (recent.length >= 20 && fiveXxCount / recent.length >= 0.1) {
    alerts.push({
      id: "5xx-spike",
      type: "5xx_spike",
      severity: "critical",
      message: `Spike de 5xx detectado en ventana de 5 min (${fiveXxCount}/${recent.length}).`,
      triggeredAt: new Date(nowMs).toISOString(),
    });
  }

  const authAnomalyCount = recent.filter(
    (sample) => sample.authRelated && AUTH_ANOMALY_CODES.has(sample.statusCode),
  ).length;

  if (recent.length >= 20 && authAnomalyCount >= 15) {
    alerts.push({
      id: "auth-anomaly",
      type: "auth_anomaly",
      severity: "warning",
      message: `Anomalía de autenticación detectada (${authAnomalyCount} eventos 401/403/429 en 5 min).`,
      triggeredAt: new Date(nowMs).toISOString(),
    });
  }

  const latencyAnomalies = endpointMetrics.filter(
    (endpoint) => endpoint.latency.p95 > 1200 || endpoint.latency.p99 > 2500,
  );

  if (latencyAnomalies.length > 0) {
    alerts.push({
      id: "latency-anomaly",
      type: "latency_anomaly",
      severity: "warning",
      message: `Latencia anómala en ${latencyAnomalies.length} endpoint(s).`,
      triggeredAt: new Date(nowMs).toISOString(),
    });
  }

  const criticalCveCount = Number.parseInt(process.env.CRITICAL_CVE_COUNT ?? "0", 10);

  if (Number.isFinite(criticalCveCount) && criticalCveCount > 0) {
    alerts.push({
      id: "critical-cve",
      type: "critical_cve",
      severity: "critical",
      message: `Dependencias con CVE crítica detectadas (${criticalCveCount}).`,
      triggeredAt: new Date(nowMs).toISOString(),
    });
  }

  return alerts;
};

export const getMetricsSnapshot = (): MetricsSnapshot => {
  const nowMs = Date.now();
  const samples = pruneSamples(getStore(), nowMs);
  const globalMetrics = globalThis as GlobalWithMetrics;
  globalMetrics.__otecMetricSamples = samples;

  const byEndpoint = new Map<string, MetricSample[]>();

  for (const sample of samples) {
    const bucket = byEndpoint.get(sample.endpoint) ?? [];
    bucket.push(sample);
    byEndpoint.set(sample.endpoint, bucket);
  }

  const endpoints = Array.from(byEndpoint.entries())
    .map(([endpoint, endpointSamples]) => buildEndpointMetrics(endpoint, endpointSamples))
    .sort((a, b) => b.requests - a.requests);

  const totalRequests = samples.length;
  const totalErrors = samples.filter((sample) => sample.statusCode >= 500).length;
  const latencies = samples.map((sample) => sample.latencyMs);
  const authAnomalies = samples.filter(
    (sample) => sample.authRelated && AUTH_ANOMALY_CODES.has(sample.statusCode),
  ).length;

  return {
    generatedAt: new Date(nowMs).toISOString(),
    windowMs: WINDOW_MS,
    totals: {
      requests: totalRequests,
      errors: totalErrors,
      errorRate: toErrorRate(totalErrors, totalRequests),
      throughputPerMin: toRatePerMinute(totalRequests, WINDOW_MS),
      authAnomalies,
      latency: {
        p50: quantile(latencies, 50),
        p95: quantile(latencies, 95),
        p99: quantile(latencies, 99),
      },
    },
    endpoints,
    alerts: buildAlerts(samples, endpoints),
  };
};
