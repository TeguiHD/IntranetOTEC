import assert from "node:assert/strict";
import test from "node:test";

import {
  MANDATORY_SURVEY_TITLES,
  SURVEY_TEMPLATE_DEFINITIONS,
  isMandatorySurveyTitle,
} from "../src/lib/surveyTemplates";

test("mandatory survey title whitelist only accepts known templates", () => {
  for (const definition of Object.values(SURVEY_TEMPLATE_DEFINITIONS)) {
    assert.equal(isMandatorySurveyTitle(definition.title), true);
    assert.equal(isMandatorySurveyTitle(`  ${definition.title.toUpperCase()}  `), true);
  }
});

test("mandatory survey title whitelist rejects manipulated payloads", () => {
  assert.equal(isMandatorySurveyTitle("Evaluacion Docente y OTEC<script>"), false);
  assert.equal(isMandatorySurveyTitle("Test de Estilos de Aprendizaje --"), false);
  assert.equal(isMandatorySurveyTitle("[OBLIGATORIA] Evaluacion Docente y OTEC"), false);
  assert.equal(isMandatorySurveyTitle(""), false);
  assert.equal(isMandatorySurveyTitle(null), false);
});

test("mandatory survey title registry remains strict and sanitized", () => {
  assert.equal(MANDATORY_SURVEY_TITLES.length, 2);
  assert.deepEqual(MANDATORY_SURVEY_TITLES, [
    "Evaluacion Docente y OTEC",
    "Test de Estilos de Aprendizaje",
  ]);

  for (const title of MANDATORY_SURVEY_TITLES) {
    assert.equal(/[<>]/.test(title), false);
  }
});
