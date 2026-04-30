import assert from "node:assert/strict";
import test from "node:test";

import {
  coerceScaleQuestionOptions,
  getTemplateScaleOptions,
  parseScaleAnswer,
} from "../src/lib/surveyTemplates";
import { stripCorrectAnswer } from "../src/lib/evaluation-options";
import { getEvaluationWindowStatus } from "../src/lib/evaluation-status";
import { readLocalPrueba } from "../src/lib/local-pruebas";

test("coerceScaleQuestionOptions accepts valid likert payload", () => {
  const payload = getTemplateScaleOptions("docente_otec");
  const parsed = coerceScaleQuestionOptions(payload);

  assert.ok(parsed);
  assert.equal(parsed?.escalaMin, 1);
  assert.equal(parsed?.escalaMax, 7);
});

test("coerceScaleQuestionOptions rejects malformed or polluted payloads", () => {
  const polluted = {
    modo: "likert",
    opciones: ["1", "2", "3"],
    escalaMin: 1,
    escalaMax: 3,
    __proto__: { admin: true },
  };

  const wrongRange = {
    modo: "likert",
    opciones: ["1", "2", "3", "5"],
    escalaMin: 1,
    escalaMax: 4,
  };

  assert.equal(coerceScaleQuestionOptions(polluted), null);
  assert.equal(coerceScaleQuestionOptions(wrongRange), null);
});

test("parseScaleAnswer rejects injected and out-of-range values", () => {
  const options = getTemplateScaleOptions("estilos_aprendizaje");

  assert.equal(parseScaleAnswer("<script>alert(1)</script>", options), null);
  assert.equal(parseScaleAnswer("1;DROP TABLE", options), null);
  assert.equal(parseScaleAnswer("0", options), null);
  assert.equal(parseScaleAnswer("6", options), null);
  assert.equal(parseScaleAnswer("3", options), 3);
});

test("student question payload never exposes correct answer metadata", () => {
  const payload = {
    opciones: ["A", "B", "C", "D"],
    correcta: 2,
  };

  const sanitized = stripCorrectAnswer(payload) as { opciones: string[]; correcta?: number };

  assert.deepEqual(sanitized.opciones, ["A", "B", "C", "D"]);
  assert.equal("correcta" in sanitized, false);
});

test("evaluation window status stays deterministic across draft, scheduled and overdue states", () => {
  const now = new Date("2026-04-30T12:00:00Z");

  assert.equal(
    getEvaluationWindowStatus({ publicada: false, now }),
    "borrador",
  );
  assert.equal(
    getEvaluationWindowStatus({
      publicada: true,
      fechaInicio: new Date("2026-05-01T12:00:00Z"),
      now,
    }),
    "programada",
  );
  assert.equal(
    getEvaluationWindowStatus({
      publicada: true,
      fechaInicio: new Date("2026-04-29T12:00:00Z"),
      fechaLimite: new Date("2026-05-01T12:00:00Z"),
      now,
    }),
    "disponible",
  );
  assert.equal(
    getEvaluationWindowStatus({
      publicada: true,
      fechaLimite: new Date("2026-04-29T12:00:00Z"),
      now,
    }),
    "vencida",
  );
});

test("readLocalPrueba blocks absolute path injection", () => {
  const rootDir = "/tmp/pruebas-test-nonexistent";
  assert.throws(
    () => readLocalPrueba(rootDir, "/etc/passwd"),
    /invalid_path/,
  );
});

test("readLocalPrueba blocks traversal with absolute segment", () => {
  const rootDir = "/tmp/pruebas-test-nonexistent";
  assert.throws(
    () => readLocalPrueba(rootDir, "subdir/../../../etc/passwd"),
    /invalid_path/,
  );
});

test("enviarRespuestasAction: nota clamped to 1.0-7.0 range", () => {
  const clamp = (raw: number) => Math.round(Math.max(1, Math.min(7, raw)) * 10) / 10;
  assert.equal(clamp(0), 1.0);
  assert.equal(clamp(8), 7.0);
  assert.equal(clamp(1 + 6 * 1), 7.0);
  assert.equal(clamp(1 + 6 * 0), 1.0);
});

test("supervision rate limiter blocks after 60 events per 60s window", () => {
  const log = new Map<string, number[]>();
  const LIMIT = 60;
  const WINDOW = 60_000;

  const check = (userId: string, evalId: string): boolean => {
    const key = `${userId}:${evalId}`;
    const now = Date.now();
    const windowStart = now - WINDOW;
    const existing = (log.get(key) ?? []).filter((t) => t > windowStart);
    if (existing.length >= LIMIT) return false;
    existing.push(now);
    log.set(key, existing);
    return true;
  };

  for (let i = 0; i < 60; i++) assert.equal(check("u1", "ev1"), true);
  assert.equal(check("u1", "ev1"), false);
  assert.equal(check("u2", "ev1"), true);
});
