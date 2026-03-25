import assert from "node:assert/strict";
import test from "node:test";

import {
  coerceScaleQuestionOptions,
  getTemplateScaleOptions,
  parseScaleAnswer,
} from "../src/lib/surveyTemplates";

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
