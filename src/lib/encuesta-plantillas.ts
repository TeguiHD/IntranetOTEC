export type PlantillaId =
  | "evaluacion_docente"
  | "satisfaccion_curso"
  | "condiciones_sence"
  | "estilos_aprendizaje"
  | "en_blanco";

export type PlantillaPregunta = {
  enunciado: string;
  tipo: "likert" | "si_no" | "texto_libre";
  escalaMin?: number;
  escalaMax?: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
};

export type Plantilla = {
  id: PlantillaId;
  nombre: string;
  descripcion: string;
  iconName: string;
  audienciaDefault: "alumnos" | "docentes" | "todos";
  preguntas: PlantillaPregunta[];
};

export const PLANTILLAS: Plantilla[] = [
  {
    id: "evaluacion_docente",
    nombre: "Evaluación Docente",
    descripcion: "Mide el desempeño del docente en el aula",
    iconName: "GraduationCap",
    audienciaDefault: "alumnos",
    preguntas: [
      {
        enunciado: "El/la docente dominaba los contenidos del curso",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "El/la docente explicaba los temas con claridad",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "El/la docente resolvía dudas de manera efectiva",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "El/la docente mantenía un buen clima de aprendizaje",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "Las metodologías utilizadas fueron adecuadas para el aprendizaje",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "Evaluación global del/la docente",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy deficiente",
        etiquetaMax: "Excelente",
      },
    ],
  },
  {
    id: "satisfaccion_curso",
    nombre: "Satisfacción del Curso",
    descripcion: "Evalúa la calidad y experiencia general del curso",
    iconName: "Star",
    audienciaDefault: "alumnos",
    preguntas: [
      {
        enunciado: "Los contenidos del curso respondieron a mis expectativas",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "El material didáctico fue útil y de calidad",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "La duración del curso fue adecuada para los contenidos",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "El curso cumplió con mis objetivos de aprendizaje",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy en desacuerdo",
        etiquetaMax: "Muy de acuerdo",
      },
      {
        enunciado: "¿Recomendarías este curso a otras personas?",
        tipo: "si_no",
      },
      {
        enunciado: "¿Qué mejorarías del curso?",
        tipo: "texto_libre",
      },
    ],
  },
  {
    id: "condiciones_sence",
    nombre: "Condiciones SENCE",
    descripcion: "Cumplimiento de condiciones para franquicia tributaria",
    iconName: "FileCheck",
    audienciaDefault: "alumnos",
    preguntas: [
      {
        enunciado: "El lugar donde se realizó el curso fue adecuado",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy inadecuado",
        etiquetaMax: "Muy adecuado",
      },
      {
        enunciado: "Los horarios del curso fueron convenientes",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy inconvenientes",
        etiquetaMax: "Muy convenientes",
      },
      {
        enunciado: "Recibí toda la información necesaria antes de iniciar el curso",
        tipo: "si_no",
      },
      {
        enunciado: "El proceso de inscripción fue sencillo y sin problemas",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "Muy difícil",
        etiquetaMax: "Muy sencillo",
      },
      {
        enunciado: "Observaciones o comentarios adicionales",
        tipo: "texto_libre",
      },
    ],
  },
  {
    id: "estilos_aprendizaje",
    nombre: "Estilos de Aprendizaje",
    descripcion: "Identifica cómo aprende mejor cada alumno",
    iconName: "Brain",
    audienciaDefault: "alumnos",
    preguntas: [
      {
        enunciado: "Aprendo mejor con imágenes, diagramas y gráficos visuales",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "No me identifica",
        etiquetaMax: "Me identifica totalmente",
      },
      {
        enunciado: "Aprendo mejor escuchando explicaciones orales del docente",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "No me identifica",
        etiquetaMax: "Me identifica totalmente",
      },
      {
        enunciado: "Aprendo mejor haciendo actividades prácticas y ejercicios",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "No me identifica",
        etiquetaMax: "Me identifica totalmente",
      },
      {
        enunciado: "Aprendo mejor leyendo textos y tomando notas escritas",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "No me identifica",
        etiquetaMax: "Me identifica totalmente",
      },
      {
        enunciado: "Prefiero trabajar en grupo al momento de aprender",
        tipo: "likert",
        escalaMin: 1,
        escalaMax: 5,
        etiquetaMin: "No me identifica",
        etiquetaMax: "Me identifica totalmente",
      },
      {
        enunciado: "¿Qué actividades de aprendizaje encuentras más útiles para ti?",
        tipo: "texto_libre",
      },
    ],
  },
  {
    id: "en_blanco",
    nombre: "En blanco",
    descripcion: "Empieza desde cero con tus propias preguntas",
    iconName: "PenLine",
    audienciaDefault: "alumnos",
    preguntas: [],
  },
];

export function getPlantilla(id: PlantillaId | string): Plantilla | undefined {
  return PLANTILLAS.find((p) => p.id === id);
}

export function buildOpcionesJson(p: PlantillaPregunta): unknown {
  if (p.tipo === "likert") {
    const min = p.escalaMin ?? 1;
    const max = p.escalaMax ?? 5;
    return {
      modo: "likert",
      escalaMin: min,
      escalaMax: max,
      opciones: Array.from({ length: max - min + 1 }, (_, i) => String(min + i)),
      etiquetaMin: p.etiquetaMin ?? "Totalmente en desacuerdo",
      etiquetaMax: p.etiquetaMax ?? "Totalmente de acuerdo",
    };
  }
  if (p.tipo === "si_no") return { opciones: ["Sí", "No"] };
  return null;
}
