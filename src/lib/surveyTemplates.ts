export const SURVEY_TEMPLATE_KEYS = ["docente_otec", "estilos_aprendizaje"] as const;

export type SurveyTemplateKey = (typeof SURVEY_TEMPLATE_KEYS)[number];

export type ScaleQuestionOptions = {
  opciones: string[];
  escalaMin: number;
  escalaMax: number;
  modo: "likert";
  etiquetaMin?: string;
  etiquetaMax?: string;
  correcta?: number;
};

type SurveyTemplateDefinition = {
  title: string;
  intro: string;
  scale: {
    min: number;
    max: number;
    minLabel: string;
    maxLabel: string;
  };
  attemptsMax: number;
  questions: string[];
};

const buildScaleOptions = (
  min: number,
  max: number,
  minLabel: string,
  maxLabel: string,
): ScaleQuestionOptions => ({
  opciones: Array.from({ length: max - min + 1 }, (_, index) => String(min + index)),
  escalaMin: min,
  escalaMax: max,
  modo: "likert",
  etiquetaMin: minLabel,
  etiquetaMax: maxLabel,
});

export const SURVEY_TEMPLATE_DEFINITIONS: Record<SurveyTemplateKey, SurveyTemplateDefinition> = {
  docente_otec: {
    title: "Evaluacion Docente y OTEC",
    intro:
      "Marca un numero por cada afirmacion usando la escala de 1 a 7, donde 1 es totalmente en desacuerdo y 7 es totalmente de acuerdo.",
    scale: {
      min: 1,
      max: 7,
      minLabel: "Totalmente en desacuerdo",
      maxLabel: "Totalmente de acuerdo",
    },
    attemptsMax: 2,
    questions: [
      "El docente demostro dominio del contenido impartido.",
      "Las explicaciones del docente fueron claras y ordenadas.",
      "El docente resolvio dudas de manera oportuna.",
      "Las actividades realizadas facilitaron mi aprendizaje.",
      "El material compartido fue pertinente para los objetivos del curso.",
      "La evaluacion del curso fue coherente con lo trabajado en clases.",
      "La coordinacion administrativa de la OTEC fue clara y oportuna.",
      "Los recursos de la plataforma facilitaron el seguimiento del curso.",
      "Recomendaria este curso a otras personas.",
      "Mi evaluacion global del docente y de la OTEC es positiva.",
    ],
  },
  estilos_aprendizaje: {
    title: "Test de Estilos de Aprendizaje",
    intro:
      "Responde cada afirmacion con una escala de 1 a 5, donde 1 es nunca y 5 es siempre.",
    scale: {
      min: 1,
      max: 5,
      minLabel: "Nunca",
      maxLabel: "Siempre",
    },
    attemptsMax: 2,
    questions: [
      "[Visual] Recuerdo mejor cuando uso esquemas, mapas o imagenes.",
      "[Visual] Me ayuda subrayar con colores para comprender ideas.",
      "[Visual] Prefiero ver una demostracion antes de practicar.",
      "[Auditivo] Aprendo mejor cuando escucho explicaciones detalladas.",
      "[Auditivo] Recordar en voz alta mejora mi comprension.",
      "[Auditivo] Prefiero participar en conversaciones para estudiar.",
      "[Kinestesico] Comprendo mejor cuando practico con ejercicios.",
      "[Kinestesico] Necesito aplicar lo aprendido para retenerlo.",
      "[Kinestesico] Prefiero actividades con ejemplos reales y accion.",
      "[Lectura/Escritura] Aprendo mejor cuando leo instrucciones paso a paso.",
      "[Lectura/Escritura] Tomar apuntes mejora mi concentracion.",
      "[Lectura/Escritura] Prefiero trabajar con guias y documentos escritos.",
    ],
  },
};

export const MANDATORY_SURVEY_TITLES = Object.values(SURVEY_TEMPLATE_DEFINITIONS).map(
  (definition) => definition.title,
) as readonly string[];

const mandatorySurveyTitleSet = new Set(
  MANDATORY_SURVEY_TITLES.map((title) => title.trim().toLowerCase()),
);

export const isMandatorySurveyTitle = (title: string | null | undefined): boolean => {
  if (!title) {
    return false;
  }

  return mandatorySurveyTitleSet.has(title.trim().toLowerCase());
};

export const isSurveyTemplateKey = (value: string): value is SurveyTemplateKey =>
  (SURVEY_TEMPLATE_KEYS as readonly string[]).includes(value);

export const getTemplateScaleOptions = (template: SurveyTemplateKey): ScaleQuestionOptions => {
  const definition = SURVEY_TEMPLATE_DEFINITIONS[template];
  return buildScaleOptions(
    definition.scale.min,
    definition.scale.max,
    definition.scale.minLabel,
    definition.scale.maxLabel,
  );
};

const toInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
};

export const coerceScaleQuestionOptions = (payload: unknown): ScaleQuestionOptions | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (Object.getPrototypeOf(payload) !== Object.prototype) {
    return null;
  }

  const source = payload as Record<string, unknown>;
  if (source.modo !== "likert") {
    return null;
  }

  if (!Array.isArray(source.opciones) || source.opciones.length === 0) {
    return null;
  }

  const options = source.opciones
    .map((option) => (typeof option === "string" ? option.trim() : ""))
    .filter(Boolean);
  if (options.length === 0) {
    return null;
  }

  const min = toInteger(source.escalaMin);
  const max = toInteger(source.escalaMax);
  if (min === null || max === null || min >= max) {
    return null;
  }

  const hasOnlyIntegers = options.every((option) => /^-?\d+$/.test(option));
  if (!hasOnlyIntegers) {
    return null;
  }

  const numeric = options.map((option) => Number.parseInt(option, 10));
  const expectedCount = max - min + 1;
  const expected = Array.from({ length: expectedCount }, (_, index) => min + index);

  if (numeric.length !== expected.length) {
    return null;
  }

  if (!numeric.every((value, index) => value === expected[index])) {
    return null;
  }

  const correcta = toInteger(source.correcta);

  return {
    opciones: options,
    escalaMin: min,
    escalaMax: max,
    modo: "likert",
    etiquetaMin: typeof source.etiquetaMin === "string" ? source.etiquetaMin : undefined,
    etiquetaMax: typeof source.etiquetaMax === "string" ? source.etiquetaMax : undefined,
    correcta: correcta === null ? undefined : correcta,
  };
};

export const parseScaleAnswer = (
  rawAnswer: string,
  options: ScaleQuestionOptions,
): number | null => {
  const answer = rawAnswer.trim();
  if (!/^-?\d+$/.test(answer)) {
    return null;
  }

  const value = Number.parseInt(answer, 10);
  if (!Number.isInteger(value)) {
    return null;
  }

  if (value < options.escalaMin || value > options.escalaMax) {
    return null;
  }

  if (!options.opciones.includes(String(value))) {
    return null;
  }

  return value;
};
