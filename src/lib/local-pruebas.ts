import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";

export type LocalPruebaQuestion = {
  enunciado: string;
  tipo: "opcion_multiple" | "verdadero_falso" | "desarrollo";
  opciones?: string[];
  puntaje: string;
  orden: number;
};

export type LocalPruebaParsed = {
  id: string;
  titulo: string;
  archivo: string;
  puntajeTotal: number | null;
  preguntas: LocalPruebaQuestion[];
  resumen: {
    opcionMultiple: number;
    verdaderoFalso: number;
    desarrollo: number;
  };
};

const SECTION_SCORE_RE = /\((\d+(?:[.,]\d+)?)\s*(?:pts?|puntos?)\s*c\/u/i;
const POINTS_LINE_RE = /^\((\d+(?:[.,]\d+)?)\s*(?:pts?|puntos?)\)$/i;
const OPTION_RE = /^([a-dA-D])\)\s*(.+)$/;
const QUESTION_NUMBER_RE = /^\d+[.)]\s*/;
const IGNORED_PREFIX_RE =
  /^(nombre(?:\s+del)?\s+alumno|fecha|puntaje\s+(?:total|obtenido)|exigencia|instrucciones|formato|total):/i;
const SECTION_RE = /^[^\p{L}\p{N}]?\s*(?:[IVXLCDM]+|\d+)\.\s+/iu;

const normalizeSpaces = (value: string) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const stripDecorations = (value: string) =>
  normalizeSpaces(value)
    .replace(/^[^\p{L}\p{N}*]+/u, "")
    .replace(/\*+/g, "")
    .trim();

const toScore = (value: string | null | undefined, fallback = 1): string => {
  if (!value) return String(fallback);
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? String(parsed) : String(fallback);
};

const makeId = (archivo: string) =>
  Buffer.from(archivo, "utf8").toString("base64url");

const parseTitle = (lines: string[], fallbackFile: string): string => {
  const firstMeaningful = lines.find((line) => {
    const clean = stripDecorations(line);
    return clean && !IGNORED_PREFIX_RE.test(clean);
  });
  const fallback = basename(fallbackFile, ".txt").replace(/^\*|\*$/g, "").trim();
  const raw = firstMeaningful ?? fallback;
  return stripDecorations(raw)
    .replace(/^PRUEBA\s*(?:\d+)?\s*[-:–]\s*/i, "")
    .replace(/^PRUEBA\s*:\s*/i, "")
    .trim() || fallback;
};

const parseTotalScore = (text: string): number | null => {
  const match = text.match(/Puntaje\s*(?:Total)?\s*:?\s*(?:______\s*\/\s*)?(\d+(?:[.,]\d+)?)/i);
  if (!match?.[1]) return null;
  const parsed = Number.parseFloat(match[1].replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export function parseLocalPrueba(archivo: string, content: string): LocalPruebaParsed {
  const lines = content
    .replace(/\r/g, "")
    .split("\n")
    .map(normalizeSpaces)
    .filter(Boolean);

  const preguntas: LocalPruebaQuestion[] = [];
  let sectionScore = "1";
  let index = 0;
  let order = 1;

  const pushQuestion = (question: Omit<LocalPruebaQuestion, "orden">) => {
    const enunciado = stripDecorations(question.enunciado);
    if (!enunciado || IGNORED_PREFIX_RE.test(enunciado)) return;
    preguntas.push({ ...question, enunciado, orden: order++ });
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const clean = stripDecorations(line);
    const sectionScoreMatch = clean.match(SECTION_SCORE_RE);
    if (sectionScoreMatch?.[1]) {
      sectionScore = toScore(sectionScoreMatch[1]);
      index += 1;
      continue;
    }

    if (!clean || IGNORED_PREFIX_RE.test(clean) || /^encierra|^lee |^seleccione|^responde/i.test(clean)) {
      index += 1;
      continue;
    }

    if (SECTION_RE.test(line)) {
      index += 1;
      continue;
    }

    if (/^___\s*/.test(line)) {
      pushQuestion({
        enunciado: line.replace(/^___\s*/, ""),
        tipo: "verdadero_falso",
        puntaje: sectionScore,
      });
      index += 1;
      continue;
    }

    const nextOptions: string[] = [];
    let lookAhead = index + 1;
    while (lookAhead < lines.length) {
      const optionMatch = (lines[lookAhead] ?? "").match(OPTION_RE);
      if (!optionMatch) break;
      nextOptions.push(stripDecorations(optionMatch[2] ?? ""));
      lookAhead += 1;
    }

    if (nextOptions.length >= 2) {
      pushQuestion({
        enunciado: clean.replace(QUESTION_NUMBER_RE, ""),
        tipo: "opcion_multiple",
        opciones: nextOptions,
        puntaje: sectionScore,
      });
      index = lookAhead;
      continue;
    }

    const pointsMatch = (lines[index + 1] ?? "").match(POINTS_LINE_RE);
    if (pointsMatch?.[1]) {
      pushQuestion({
        enunciado: clean.replace(QUESTION_NUMBER_RE, ""),
        tipo: "desarrollo",
        puntaje: toScore(pointsMatch[1], Number(sectionScore)),
      });
      index += 2;
      continue;
    }

    index += 1;
  }

  const resumen = preguntas.reduce(
    (acc, pregunta) => {
      if (pregunta.tipo === "opcion_multiple") acc.opcionMultiple += 1;
      if (pregunta.tipo === "verdadero_falso") acc.verdaderoFalso += 1;
      if (pregunta.tipo === "desarrollo") acc.desarrollo += 1;
      return acc;
    },
    { opcionMultiple: 0, verdaderoFalso: 0, desarrollo: 0 },
  );

  return {
    id: makeId(archivo),
    titulo: parseTitle(lines, archivo),
    archivo,
    puntajeTotal: parseTotalScore(content),
    preguntas,
    resumen,
  };
}

export function listLocalPruebaFiles(rootDir: string): string[] {
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile() && entry.toLowerCase().endsWith(".txt")) {
        results.push(relative(rootDir, fullPath));
      }
    }
  };
  walk(rootDir);
  return results.sort((a, b) => a.localeCompare(b, "es"));
}

export function readLocalPrueba(rootDir: string, archivo: string): LocalPruebaParsed {
  if (archivo.includes("..")) {
    throw new Error("invalid_path");
  }
  const fullPath = join(rootDir, archivo);
  return parseLocalPrueba(archivo, readFileSync(fullPath, "utf8"));
}
