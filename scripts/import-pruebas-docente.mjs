import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import process from "node:process";

import pg from "pg";

const { Client } = pg;

const OPTION_RE = /^([A-D])\)\s*(.+)$/i;
const TEST_RE = /^PRUEBA\s*(?:N°|Nº|N)?\s*([0-9]+)\s*[–-]\s*(.+)$/i;
const COURSE_ALIASES = [
  {
    heading: /PELUQUER[IÍ]A CANINA/i,
    dbMatch: ["peluqueria canina", "peluquería canina"],
  },
  {
    heading: /PODOLOG[IÍ]A/i,
    dbMatch: ["podologia", "podología"],
  },
];

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const clean = (value) =>
  value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();

const parseArgs = () => {
  const file = process.argv[2];
  if (!file) {
    throw new Error("Uso: node scripts/import-pruebas-docente.mjs <archivo.txt> [--publish]");
  }
  return {
    file: resolve(file),
    publish: process.argv.includes("--publish"),
    dryRun: process.argv.includes("--dry-run"),
  };
};

const detectCourse = (line) => {
  const normalized = normalize(line);
  return (
    COURSE_ALIASES.find((item) =>
      item.dbMatch.some((alias) => normalized === normalize(alias)),
    ) ?? null
  );
};

const parseQuestions = (lines) => {
  const questions = [];
  let i = 0;
  let order = 1;

  while (i < lines.length) {
    const line = clean(lines[i] ?? "");
    if (!line || /^[IVXLCDM]+\./i.test(line) || /^40 preguntas/i.test(line)) {
      i += 1;
      continue;
    }

    const options = [];
    let lookAhead = i + 1;
    while (lookAhead < lines.length) {
      const match = clean(lines[lookAhead] ?? "").match(OPTION_RE);
      if (!match) break;
      options.push(clean(match[2] ?? ""));
      lookAhead += 1;
    }

    if (options.length >= 2) {
      questions.push({
        enunciado: line.replace(/^\d+[.)]\s*/, ""),
        tipo: "opcion_multiple",
        opciones: options,
        puntaje: "1",
        orden: order++,
      });
      i = lookAhead;
      continue;
    }

    const vfLine = clean(lines[i + 1] ?? "");
    if (/^V\s*\/\s*F$/i.test(vfLine)) {
      questions.push({
        enunciado: line.replace(/^\d+[.)]\s*/, ""),
        tipo: "verdadero_falso",
        opciones: null,
        puntaje: "1",
        orden: order++,
      });
      i += 2;
      continue;
    }

    i += 1;
  }

  return questions;
};

const parseFile = (file) => {
  const text = readFileSync(file, "utf8").replace(/\r/g, "");
  const lines = text.split("\n").map(clean).filter(Boolean);
  const tests = [];
  let currentCourse = null;
  let currentTest = null;

  const flush = () => {
    if (!currentCourse || !currentTest) return;
    const questions = parseQuestions(currentTest.lines);
    if (questions.length === 0) return;
    tests.push({
      course: currentCourse,
      title: currentTest.title,
      questions,
    });
  };

  for (const line of lines) {
    const course = detectCourse(line);
    const testMatch = line.match(TEST_RE);

    if (course && !testMatch) {
      flush();
      currentCourse = course;
      currentTest = null;
      continue;
    }

    if (testMatch) {
      flush();
      const number = testMatch[1];
      const topic = clean(testMatch[2] ?? "");
      currentTest = {
        title: `Prueba ${number} - ${topic}`,
        lines: [],
      };
      continue;
    }

    if (currentTest) currentTest.lines.push(line);
  }
  flush();

  return tests;
};

const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const envFile of [".env.local", ".env"]) {
    try {
      const content = readFileSync(envFile, "utf8");
      const match = content.match(/^DATABASE_URL=(.*)$/m);
      if (match?.[1]) return match[1].replace(/^['"]|['"]$/g, "");
    } catch {
      // Continue.
    }
  }
  throw new Error("DATABASE_URL no esta configurado.");
};

const main = async () => {
  const args = parseArgs();
  const tests = parseFile(args.file);
  if (tests.length === 0) throw new Error(`No se reconocieron pruebas en ${basename(args.file)}.`);

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          source: basename(args.file),
          tests: tests.length,
          questions: tests.reduce((total, test) => total + test.questions.length, 0),
          byCourse: tests.reduce((acc, test) => {
            const key = test.course.dbMatch[0];
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {}),
          titles: tests.map((test) => ({
            course: test.course.dbMatch[0],
            title: test.title,
            questions: test.questions.length,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }

  const client = new Client({ connectionString: getDatabaseUrl() });
  await client.connect();

  const adminResult = await client.query(
    "select id from usuarios where rol = 'admin' and activo = true and eliminado_at is null order by created_at asc limit 1",
  );
  const adminId = adminResult.rows[0]?.id ?? null;

  let createdEvaluations = 0;
  let createdQuestions = 0;
  let skipped = 0;

  try {
    await client.query("begin");

    for (const test of tests) {
      const normalizedMatches = test.course.dbMatch.map(normalize);
      const sectionResult = await client.query(
        `select id, nombre
         from asignaturas
         where eliminado_at is null
           and estado in ('activo', 'borrador')
         order by nombre`,
      );
      const sections = sectionResult.rows.filter((section) => {
        const sectionName = normalize(section.nombre);
        return normalizedMatches.some((match) => sectionName.includes(match));
      });

      for (const section of sections) {
        const existing = await client.query(
          "select id from evaluaciones where asignatura_id = $1 and titulo = $2 and eliminado_at is null limit 1",
          [section.id, test.title],
        );
        if (existing.rowCount > 0) {
          skipped += 1;
          continue;
        }

        const evaluation = await client.query(
          `insert into evaluaciones
            (asignatura_id, titulo, tipo, instrucciones, intentos_max, duracion_minutos, publicada, creado_por, created_at)
           values ($1, $2, 'formulario', $3, 1, 60, $4, $5, now())
           returning id`,
          [
            section.id,
            test.title,
            "Prueba cargada desde archivo docente. El docente puede publicarla o deshabilitarla; las respuestas quedan archivadas para docente y administrador.",
            args.publish,
            adminId,
          ],
        );
        const evaluationId = evaluation.rows[0].id;
        createdEvaluations += 1;

        for (const question of test.questions) {
          await client.query(
            `insert into preguntas (evaluacion_id, enunciado, tipo, opciones, puntaje, orden)
             values ($1, $2, $3, $4::jsonb, $5, $6)`,
            [
              evaluationId,
              question.enunciado,
              question.tipo,
              question.opciones ? JSON.stringify({ opciones: question.opciones }) : null,
              question.puntaje,
              question.orden,
            ],
          );
          createdQuestions += 1;
        }
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    JSON.stringify(
      {
        source: basename(args.file),
        tests: tests.length,
        createdEvaluations,
        createdQuestions,
        skipped,
        published: args.publish,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
