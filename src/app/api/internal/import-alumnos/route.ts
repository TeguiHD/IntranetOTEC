import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { asignaturas, cursos, matriculas, periodosAcademicos, usuarios } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { parseAppRole } from "@/lib/authz";
import {
  buildCourseStrictKey,
  createCourseNameNormalizer,
  normalizeLookupKey,
  normalizeWhitespace,
} from "@/lib/import-course-normalization";
import {
  derivarPinPredeterminado,
  esRutExtranjero,
  formatearRut,
  normalizarRut,
  validarRut,
} from "@/lib/rut";
import { parseSpreadsheetRowsFromBuffer } from "@/lib/spreadsheet";

type SpreadsheetRow = Record<string, unknown>;

type ParsedImportRow = {
  lineNumber: number;
  codigoCurso: string;
  codigoCursoKey: string;
  curso: string;
  cursoKey: string;
  cursoCanonico: string;
  cursoIdentityKey: string;
  personKey: string;
  diasHora: string;
  fechaExplicita: string | null;
  fechaInicio: string;
  nombreCompleto: string;
  rutRaw: string;
  telefono: string | null;
};

type CourseTemplateRef = {
  id: string;
  codigo: string;
};

type Turno = "manana" | "tarde" | "vespertino";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 10_000;
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const sanitizeName = (value: string): string =>
  value.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();

const toCourseIdentityNameKey = (cursoKey: string): string => `curso:${cursoKey}`;

const normalizeImportCourseCode = (rawValue: string): string =>
  normalizeWhitespace(rawValue)
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "")
    .slice(0, 24);

const buildUniqueImportCourseCode = (preferredRawValue: string, usedCodes: Set<string>): string => {
  const preferredCode = normalizeImportCourseCode(preferredRawValue);

  if (preferredCode && !usedCodes.has(preferredCode)) {
    usedCodes.add(preferredCode);
    return preferredCode;
  }

  let candidate = `IMP-${randomUUID().slice(0, 8).toUpperCase()}`;
  while (usedCodes.has(candidate)) {
    candidate = `IMP-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  usedCodes.add(candidate);
  return candidate;
};

const CURSO_KEYS = new Set(["curso", "asignatura", "materia"]);
const CODIGO_KEYS = new Set(["codigo", "codigocurso", "codcurso", "cod"]);
const DIAS_HORA_KEYS = new Set(["diashora", "diasyhora", "horario", "diahora"]);
const NOMBRE_KEYS = new Set([
  "nombre",
  "nombres",
  "nombrecompleto",
  "nombrescompletos",
  "alumno",
  "estudiante",
  "primernombre",
]);
const APELLIDO_KEYS = new Set([
  "apellido",
  "apellidos",
  "primerapellido",
  "apellidopaterno",
]);
const RUT_KEYS = new Set(["rut", "identificador", "credencial", "rutcredencial"]);
const TELEFONO_KEYS = new Set([
  "numero",
  "numerocelular",
  "celular",
  "telefono",
  "fono",
  "movil",
]);
const FECHA_KEYS = new Set([
  "fecha",
  "fechainicio",
  "fecha_inicio",
  "fechadeinicio",
  "inicio",
  "iniciofecha",
]);

const getRowField = (row: SpreadsheetRow, aliases: Set<string>): string => {
  for (const [key, value] of Object.entries(row)) {
    if (!aliases.has(normalizeLookupKey(key))) {
      continue;
    }

    const normalizedValue = normalizeWhitespace(String(value ?? ""));
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
};

const splitNombreCompleto = (raw: string): { nombre: string; apellido: string } => {
  const parts = normalizeWhitespace(raw).split(" ");

  if (parts.length === 1) {
    return { nombre: parts[0] ?? "", apellido: "-" };
  }

  if (parts.length === 2) {
    return { nombre: parts[0] ?? "", apellido: parts[1] ?? "-" };
  }

  const apellido = parts.slice(-2).join(" ");
  const nombre = parts.slice(0, -2).join(" ");
  return { nombre, apellido };
};

const pad2 = (value: number): string => String(value).padStart(2, "0");

const toDateString = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const toValidDateString = (year: number, month: number, day: number): string | null => {
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
};

const parseDateValue = (rawValue: string): string | null => {
  const value = normalizeWhitespace(rawValue);

  if (!value) {
    return null;
  }

  const isoCandidate = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoCandidate)) {
    const year = Number.parseInt(isoCandidate.slice(0, 4), 10);
    const month = Number.parseInt(isoCandidate.slice(5, 7), 10);
    const day = Number.parseInt(isoCandidate.slice(8, 10), 10);
    return toValidDateString(year, month, day);
  }

  const ymdMatch = value.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = Number.parseInt(ymdMatch[1] ?? "", 10);
    const month = Number.parseInt(ymdMatch[2] ?? "", 10);
    const day = Number.parseInt(ymdMatch[3] ?? "", 10);
    return toValidDateString(year, month, day);
  }

  const dmyMatch = value.match(/^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{2,4})$/);
  if (dmyMatch) {
    const day = Number.parseInt(dmyMatch[1] ?? "", 10);
    const month = Number.parseInt(dmyMatch[2] ?? "", 10);
    const rawYear = Number.parseInt(dmyMatch[3] ?? "", 10);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    return toValidDateString(year, month, day);
  }

  return null;
};

const normalizeTextForTokenLookup = (value: string): string =>
  normalizeWhitespace(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const FILE_MONTH_TOKENS = new Map<string, number>([
  ["enero", 1],
  ["ene", 1],
  ["febrero", 2],
  ["feb", 2],
  ["marzo", 3],
  ["mar", 3],
  ["abril", 4],
  ["abr", 4],
  ["mayo", 5],
  ["may", 5],
  ["junio", 6],
  ["jun", 6],
  ["julio", 7],
  ["jul", 7],
  ["agosto", 8],
  ["ago", 8],
  ["septiembre", 9],
  ["setiembre", 9],
  ["sep", 9],
  ["set", 9],
  ["octubre", 10],
  ["oct", 10],
  ["noviembre", 11],
  ["nov", 11],
  ["diciembre", 12],
  ["dic", 12],
]);

const inferReferenceDateFromFileName = (fileName: string, fallbackDate: Date): Date => {
  const baseName = fileName.replace(/\.[^./\\]+$/, "");
  const tokens = normalizeTextForTokenLookup(baseName)
    .split(" ")
    .filter((token) => token.length > 0);

  const inferredMonth = tokens
    .map((token) => FILE_MONTH_TOKENS.get(token))
    .find((month): month is number => typeof month === "number");

  if (!inferredMonth) {
    return fallbackDate;
  }

  const inferredYearToken = tokens.find((token) => /^\d{4}$/.test(token));
  const parsedYear = inferredYearToken ? Number.parseInt(inferredYearToken, 10) : NaN;
  const safeYear = Number.isFinite(parsedYear) && parsedYear >= 2000 && parsedYear <= 2100
    ? parsedYear
    : fallbackDate.getFullYear();

  const referenceDate = new Date(fallbackDate);
  referenceDate.setHours(0, 0, 0, 0);
  referenceDate.setFullYear(safeYear, inferredMonth - 1, 1);
  return referenceDate;
};

const WEEKDAY_TOKENS: Array<[token: string, day: number]> = [
  ["lunes", 1],
  ["martes", 2],
  ["miercoles", 3],
  ["jueves", 4],
  ["viernes", 5],
  ["sabado", 6],
  ["domingo", 0],
];

const inferDateFromDiasHora = (rawValue: string, today: Date): string | null => {
  const normalized = normalizeLookupKey(rawValue);

  if (!normalized) {
    return null;
  }

  const matched = WEEKDAY_TOKENS.find(([token]) => normalized.includes(token));
  if (!matched) {
    return null;
  }

  const targetDay = matched[1];
  const candidate = new Date(today);
  candidate.setHours(0, 0, 0, 0);
  const delta = (targetDay - candidate.getDay() + 7) % 7;
  candidate.setDate(candidate.getDate() + delta);

  return toDateString(candidate);
};

const normalizePhone = (rawValue: string): string | null => {
  const digits = rawValue.replace(/\D/g, "");

  if (!digits || digits.length < 8) {
    return null;
  }

  if (digits.startsWith("56")) {
    return `+${digits}`;
  }

  if (digits.length === 9 && digits.startsWith("9")) {
    return `+56${digits}`;
  }

  if (digits.length === 8) {
    return `+56${digits}`;
  }

  return `+${digits}`;
};

const normalizePhoneDigits = (value: string | null): string =>
  value ? value.replace(/\D/g, "") : "";

const buildPersonKey = (nombreCompleto: string, telefono: string | null): string => {
  const normalizedName = normalizeLookupKey(nombreCompleto);

  if (!normalizedName) {
    return "";
  }

  return `${normalizedName}|${normalizePhoneDigits(telefono)}`;
};

const buildAutoIdentifier = (sequence: number): string =>
  `EXT-AUTO-${String(sequence).padStart(6, "0")}`;

const buildCourseDescription = (diasHora: string, fechaExplicita: string | null): string | null => {
  const parts: string[] = [];

  if (diasHora) {
    parts.push(`Horario: ${diasHora}`);
  }

  if (fechaExplicita) {
    parts.push(`Fecha: ${fechaExplicita}`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
};

const buildScheduleVariantKey = (fechaInicio: string, diasHora: string): string =>
  `${fechaInicio}|${normalizeLookupKey(diasHora)}`;

const buildCourseTemplateIdentityKey = (
  cursoKey: string,
  fechaInicio: string,
  diasHora: string,
): string => `${toCourseIdentityNameKey(cursoKey)}|${buildScheduleVariantKey(fechaInicio, diasHora)}`;

const extractScheduleFromDescription = (description: string | null): string => {
  if (!description) {
    return "";
  }

  const segments = description
    .split("|")
    .map((segment) => normalizeWhitespace(segment));

  const horarioSegment = segments.find((segment) =>
    segment.toLowerCase().startsWith("horario:"),
  );

  if (!horarioSegment) {
    return "";
  }

  return normalizeWhitespace(horarioSegment.slice("horario:".length));
};

const inferTurnoFromDiasHora = (rawValue: string): Turno => {
  const normalized = rawValue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("vespertino") || normalized.includes("noche")) {
    return "vespertino";
  }

  if (normalized.includes("tarde")) {
    return "tarde";
  }

  if (normalized.includes("manana")) {
    return "manana";
  }

  const hourMatch = normalized.match(/(\d{1,2})(?::\d{2})?/);
  if (!hourMatch) return "manana";

  const hour = Number.parseInt(hourMatch[1] ?? "", 10);
  if (!Number.isFinite(hour)) return "manana";

  if (hour < 12) return "manana";
  if (hour < 18) return "tarde";
  return "vespertino";
};

const buildSectionCode = (
  cursoCodigo: string,
  periodoCodigo: string,
  turno: Turno,
): string => {
  const turnoCode = turno === "manana" ? "M" : turno === "tarde" ? "T" : "V";
  const cursoPart = cursoCodigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8) || "CURSO";
  const periodoPart = periodoCodigo.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 10) || "PERIODO";
  return `${cursoPart}-${periodoPart}-${turnoCode}`.slice(0, 24);
};

export async function POST(request: Request) {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);
  if (!role || role !== "admin") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const periodoIdRaw = formData.get("periodoId");
    const replaceActiveEnrollments = formData.get("replaceActiveEnrollments") === "true";
    const file = formData.get("file");

    if (typeof periodoIdRaw !== "string" || !periodoIdRaw.trim()) {
      return NextResponse.json(
        { message: "Debes seleccionar un periodo academico antes de confirmar la importacion." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [selectedPeriod] = await db
      .select({
        id: periodosAcademicos.id,
        codigo: periodosAcademicos.codigo,
        nombre: periodosAcademicos.nombre,
        estado: periodosAcademicos.estado,
        fechaInicio: periodosAcademicos.fechaInicio,
        fechaFin: periodosAcademicos.fechaFin,
      })
      .from(periodosAcademicos)
      .where(eq(periodosAcademicos.id, periodoIdRaw.trim()))
      .limit(1);

    if (!selectedPeriod) {
      return NextResponse.json(
        { message: "El periodo academico seleccionado no existe o ya no esta disponible." },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "No se proporcionó un archivo válido." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: "El archivo excede el tamaño máximo permitido (5MB)." }, { status: 400 });
    }

    const mimeType = file.type.trim().toLowerCase();
    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json({ message: "Tipo de archivo no permitido." }, { status: 400 });
    }

    const fileName = file.name.trim();
    if (!/\.xlsx$/i.test(fileName)) {
      return NextResponse.json(
        { message: "Solo se permiten archivos Excel .xlsx para esta importacion." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseSpreadsheetRowsFromBuffer(buffer, fileName);

    if (rows.length === 0) {
      return NextResponse.json({ message: "El archivo está vacío." }, { status: 400 });
    }
    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        { message: `El archivo supera el máximo permitido de ${MAX_IMPORT_ROWS} filas.` },
        { status: 400 },
      );
    }

    const adminId = session?.user?.id ?? null;
    const today = new Date();
    const referenceDate = inferReferenceDateFromFileName(fileName, today);
    const fallbackDateString = toDateString(referenceDate);

    const parsedRows: ParsedImportRow[] = rows.map((rawRow, index) => {
      const row = rawRow as SpreadsheetRow;
      const codigoCurso = getRowField(row, CODIGO_KEYS);
      const curso = getRowField(row, CURSO_KEYS);
      const diasHora = getRowField(row, DIAS_HORA_KEYS);
      const nombreField = getRowField(row, NOMBRE_KEYS);
      const apellidoField = getRowField(row, APELLIDO_KEYS);
      const nombreCompleto = apellidoField
        ? `${nombreField} ${apellidoField}`.trim()
        : nombreField;
      const rutRaw = getRowField(row, RUT_KEYS);
      const telefonoRaw = getRowField(row, TELEFONO_KEYS);
      const fechaRaw = getRowField(row, FECHA_KEYS);
      const telefono = normalizePhone(telefonoRaw);

      const fechaExplicita = parseDateValue(fechaRaw);
      const fechaInicio =
        fechaExplicita
        ?? inferDateFromDiasHora(diasHora, referenceDate)
        ?? fallbackDateString;

      return {
        lineNumber: index + 2,
        codigoCurso,
        codigoCursoKey: normalizeLookupKey(codigoCurso),
        curso,
        cursoKey: "",
        cursoCanonico: "",
        cursoIdentityKey: "",
        personKey: buildPersonKey(nombreCompleto, telefono),
        diasHora,
        fechaExplicita,
        fechaInicio,
        nombreCompleto,
        rutRaw,
        telefono,
      };
    });

    const courseNormalizer = createCourseNameNormalizer(
      parsedRows.map((row) => row.curso),
    );

    for (const row of parsedRows) {
      const resolvedCourse = row.curso
        ? courseNormalizer.resolveCourseName(row.curso)
        : null;

      if (!resolvedCourse || !row.curso) {
        row.cursoKey = "";
        row.cursoCanonico = "";
        row.cursoIdentityKey = "";
        continue;
      }

      if (resolvedCourse.matchType === "fuzzy") {
        row.cursoKey = resolvedCourse.strictKey;
        row.cursoCanonico = normalizeWhitespace(row.curso);
      } else {
        row.cursoKey = resolvedCourse.canonicalKey;
        row.cursoCanonico = resolvedCourse.canonicalLabel;
      }

      row.cursoIdentityKey = buildCourseTemplateIdentityKey(
        row.cursoKey,
        row.fechaInicio,
        row.diasHora,
      );
    }

    const [
      existingCourseTemplates,
      existingSections,
      existingCourseCodes,
      existingSectionCodes,
    ] = await Promise.all([
      db
        .select({ id: cursos.id, codigo: cursos.codigo })
        .from(cursos)
        .where(isNull(cursos.eliminadoAt)),
      db
        .select({
          id: asignaturas.id,
          cursoId: asignaturas.cursoId,
          periodoId: asignaturas.periodoId,
          turno: asignaturas.turno,
          fechaInicio: asignaturas.fechaInicio,
          descripcion: asignaturas.descripcion,
          cursoNombre: cursos.nombre,
          cursoCodigo: cursos.codigo,
        })
        .from(asignaturas)
        .innerJoin(cursos, eq(asignaturas.cursoId, cursos.id))
        .where(
          and(
            eq(asignaturas.periodoId, selectedPeriod.id),
            isNull(asignaturas.eliminadoAt),
            isNull(cursos.eliminadoAt),
          ),
        ),
      db
        .select({ codigo: cursos.codigo })
        .from(cursos),
      db
        .select({ codigo: asignaturas.codigo })
        .from(asignaturas),
    ]);

    const cursoTemplateMap = new Map<string, CourseTemplateRef>();
    const courseCodeSet = new Set<string>();

    for (const course of existingCourseCodes) {
      courseCodeSet.add(course.codigo);
    }

    const sectionMap = new Map<string, string>();
    for (const section of existingSections) {
      const normalizedCourseName = buildCourseStrictKey(section.cursoNombre);
      if (normalizedCourseName) {
        const identityKey = buildCourseTemplateIdentityKey(
          normalizedCourseName,
          section.fechaInicio,
          extractScheduleFromDescription(section.descripcion),
        );

        if (!cursoTemplateMap.has(identityKey)) {
          cursoTemplateMap.set(identityKey, {
            id: section.cursoId,
            codigo: section.cursoCodigo,
          });
        }
      }

      const key = `${section.cursoId}|${section.periodoId}|${section.turno}`;
      if (!sectionMap.has(key)) {
        sectionMap.set(key, section.id);
      }
    }

    const sectionCodeSet = new Set(
      existingSectionCodes
        .map((item) => item.codigo)
        .filter((code): code is string => typeof code === "string" && code.length > 0),
    );

    let coursesCreated = 0;
    let sectionsCreated = 0;
    const warnings: string[] = [];

    const exactVariantGroups = courseNormalizer.variantGroups;
    for (const group of exactVariantGroups.slice(0, 12)) {
      const examples = group.variants.slice(0, 4).join(" | ");
      warnings.push(
        `Se consolidaron variantes del curso "${group.canonicalLabel}" por normalizacion de mayusculas/tildes/espacios (${examples}).`,
      );
    }

    if (exactVariantGroups.length > 12) {
      warnings.push(
        `Se detectaron ${exactVariantGroups.length - 12} grupos adicionales de variantes de nombre y tambien fueron consolidados.`,
      );
    }

    const fuzzyGroups = courseNormalizer.fuzzyGroups;
    for (const group of fuzzyGroups.slice(0, 8)) {
      const examples = group.mergedLabels.slice(0, 4).join(" | ");
      warnings.push(
        `Se consolidaron posibles tipeos bajo "${group.canonicalLabel}" (${examples}).`,
      );
    }

    if (fuzzyGroups.length > 8) {
      warnings.push(
        `Se detectaron ${fuzzyGroups.length - 8} grupos adicionales de posible typo y tambien fueron consolidados.`,
      );
    }

    const createdCourseIds: string[] = [];
    const createdSectionIds: string[] = [];
    const createdUserIds: string[] = [];
    const createdEnrollmentIds: string[] = [];
    let created = 0;
    let updated = 0;
    let enrollmentsCreated = 0;
    let enrollmentsReactivated = 0;
    let enrollmentsClosed = 0;
    let studentsRetired = 0;
    let autoCredentialsCreated = 0;
    const errors: string[] = [];
    const importedStudentsBySection = new Map<string, Set<string>>();

    await db.transaction(async (tx) => {
    for (const row of parsedRows) {
      if (!row.curso || !row.cursoKey) {
        continue;
      }

      let template =
        (row.cursoIdentityKey ? cursoTemplateMap.get(row.cursoIdentityKey) : undefined)
        ?? undefined;

      if (!template) {
        const cursoId = randomUUID();
        const codigoCurso = buildUniqueImportCourseCode(
          row.codigoCurso || row.curso,
          courseCodeSet,
        );

        await tx.insert(cursos).values({
          id: cursoId,
          nombre: row.cursoCanonico || row.curso,
          codigo: codigoCurso,
          descripcion: buildCourseDescription(row.diasHora, row.fechaExplicita),
          horasTeoricas: 0,
          horasPracticas: 0,
          activo: true,
          createdBy: adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        template = { id: cursoId, codigo: codigoCurso };
        coursesCreated += 1;
        createdCourseIds.push(cursoId);
      }

      if (row.cursoIdentityKey) {
        cursoTemplateMap.set(row.cursoIdentityKey, template);
      }

      const turno = inferTurnoFromDiasHora(row.diasHora);
      const sectionKey = `${template.id}|${selectedPeriod.id}|${turno}`;

      if (sectionMap.has(sectionKey)) {
        continue;
      }

      const asignaturaId = randomUUID();
      let sectionCode = buildSectionCode(template.codigo, selectedPeriod.codigo, turno);
      let suffix = 2;
      while (sectionCodeSet.has(sectionCode)) {
        const suffixText = `-${String(suffix).padStart(2, "0")}`;
        sectionCode = `${sectionCode.slice(0, 24 - suffixText.length)}${suffixText}`;
        suffix += 1;
      }

      await tx.insert(asignaturas).values({
        id: asignaturaId,
        nombre: row.cursoCanonico || row.curso,
        descripcion: buildCourseDescription(row.diasHora, row.fechaExplicita),
        codigo: sectionCode,
        cursoId: template.id,
        turno,
        periodoId: selectedPeriod.id,
        fechaInicio: row.fechaInicio,
        fechaFin: row.fechaInicio,
        duracionMeses: 6,
        estado: "borrador",
        docenteId: null,
        createdBy: adminId,
      });

      sectionMap.set(sectionKey, asignaturaId);
      sectionCodeSet.add(sectionCode);
      sectionsCreated += 1;
      createdSectionIds.push(asignaturaId);
    }

    const personIdentifierMap = new Map<string, string>();
    for (const row of parsedRows) {
      if (!row.personKey || !row.rutRaw) {
        continue;
      }

      const normalizedRut = normalizarRut(row.rutRaw);
      if (normalizedRut && validarRut(normalizedRut)) {
        personIdentifierMap.set(row.personKey, normalizedRut);
      }
    }

    const autoIdentifierMap = new Map<string, string>();
    let autoIdentifierSequence = 0;

    for (const row of parsedRows) {
      const lineNum = row.lineNumber;

      if (!row.curso || !row.cursoKey) {
        errors.push(`Fila ${lineNum}: Curso vacío.`);
        continue;
      }

      if (!row.nombreCompleto) {
        errors.push(`Fila ${lineNum}: Nombre vacío.`);
        continue;
      }

      const { nombre: rawNombre, apellido: rawApellido } = splitNombreCompleto(row.nombreCompleto);
      const nombre = sanitizeName(rawNombre);
      const apellido = sanitizeName(rawApellido) || "-";

      if (nombre.length < 2) {
        errors.push(`Fila ${lineNum}: Nombre muy corto.`);
        continue;
      }

      const template =
        (row.cursoIdentityKey ? cursoTemplateMap.get(row.cursoIdentityKey) : undefined)
        ?? null;
      const turno = inferTurnoFromDiasHora(row.diasHora);
      const asignaturaId = template
        ? sectionMap.get(`${template.id}|${selectedPeriod.id}|${turno}`) ?? null
        : null;

      if (!asignaturaId) {
        errors.push(`Fila ${lineNum}: No se pudo resolver el curso (${row.curso}).`);
        continue;
      }

      const rutNormalizado = normalizarRut(row.rutRaw);
      const rutValido = Boolean(rutNormalizado && validarRut(rutNormalizado));

      let loginIdentifier = "";

      if (rutValido && rutNormalizado) {
        loginIdentifier = rutNormalizado;

        if (row.personKey) {
          personIdentifierMap.set(row.personKey, loginIdentifier);
        }
      } else if (row.personKey && personIdentifierMap.has(row.personKey)) {
        loginIdentifier = personIdentifierMap.get(row.personKey) ?? "";
        warnings.push(
          `Fila ${lineNum}: RUT ${row.rutRaw ? `inválido (${row.rutRaw})` : "vacío"}; se reutilizó identificador existente (${loginIdentifier}).`,
        );
      } else {
        const reusedAutoIdentifier = Boolean(row.personKey && autoIdentifierMap.has(row.personKey));

        if (reusedAutoIdentifier) {
          loginIdentifier = autoIdentifierMap.get(row.personKey) ?? "";
        } else {
          autoIdentifierSequence += 1;
          loginIdentifier = buildAutoIdentifier(autoIdentifierSequence);

          if (row.personKey) {
            autoIdentifierMap.set(row.personKey, loginIdentifier);
          }

          autoCredentialsCreated += 1;
        }

        const warningMessage = reusedAutoIdentifier
          ? `Fila ${lineNum}: RUT ${row.rutRaw ? `inválido (${row.rutRaw})` : "vacío"}; se reutilizó credencial temporal (${loginIdentifier}).`
          : `Fila ${lineNum}: RUT ${row.rutRaw ? `inválido (${row.rutRaw})` : "vacío"}; se asignó credencial temporal (${loginIdentifier}).`;
        warnings.push(warningMessage);
      }

      if (!loginIdentifier) {
        errors.push(`Fila ${lineNum}: No se pudo determinar un identificador para el alumno.`);
        continue;
      }

      const loginIsForeign = esRutExtranjero(loginIdentifier);
      const loginFormatted = loginIsForeign ? loginIdentifier : formatearRut(loginIdentifier);

      try {
        const [existing] = await tx
          .select({ id: usuarios.id })
          .from(usuarios)
          .where(
            and(
              eq(usuarios.rol, "alumno"),
              loginIsForeign
                ? eq(usuarios.rut, loginIdentifier)
                : or(eq(usuarios.rut, loginIdentifier), eq(usuarios.rut, loginFormatted)),
            ),
          )
          .limit(1);

        const now = new Date();
        let alumnoId: string;

        if (existing) {
          alumnoId = existing.id;

          const updateValues: {
            nombre: string;
            apellido: string;
            activo: boolean;
            estadoAlumno: "activo";
            eliminadoAt: null;
            eliminadoPor: null;
            updatedAt: Date;
            telefono?: string;
          } = {
            nombre,
            apellido,
            activo: true,
            estadoAlumno: "activo",
            eliminadoAt: null,
            eliminadoPor: null,
            updatedAt: now,
          };

          if (row.telefono) {
            updateValues.telefono = row.telefono;
          }

          await tx.update(usuarios).set(updateValues).where(eq(usuarios.id, existing.id));
          updated++;
        } else {
          alumnoId = randomUUID();
          const pin = derivarPinPredeterminado(loginIdentifier);
          const passwordHash = await bcrypt.hash(pin, 10);

          await tx.insert(usuarios).values({
            id: alumnoId,
            nombre,
            apellido,
            rut: loginIdentifier,
            telefono: row.telefono,
            email: null,
            password: passwordHash,
            pinCambiado: false,
            rol: "alumno",
            estadoAlumno: "activo",
            activo: true,
            createdAt: now,
            updatedAt: now,
          });

          created++;
          createdUserIds.push(alumnoId);
        }

        if (asignaturaId) {
          const [existingEnrollment] = await tx
            .select({
              id: matriculas.id,
              activa: matriculas.activa,
              eliminadoAt: matriculas.eliminadoAt,
            })
            .from(matriculas)
            .where(and(eq(matriculas.alumnoId, alumnoId), eq(matriculas.asignaturaId, asignaturaId)))
            .limit(1);

          if (existingEnrollment) {
            if (!existingEnrollment.activa || existingEnrollment.eliminadoAt) {
              await tx
                .update(matriculas)
                .set({
                  activa: true,
                  eliminadoAt: null,
                  eliminadoPor: null,
                })
                .where(eq(matriculas.id, existingEnrollment.id));
              enrollmentsReactivated += 1;
            }
          } else {
            const insertedEnrollment = await tx
              .insert(matriculas)
              .values({
                id: randomUUID(),
                alumnoId,
                asignaturaId,
                activa: true,
                createdAt: now,
              })
              .returning({ id: matriculas.id });

            enrollmentsCreated += 1;
            createdEnrollmentIds.push(insertedEnrollment[0].id);
          }

          const sectionStudents = importedStudentsBySection.get(asignaturaId) ?? new Set<string>();
          sectionStudents.add(alumnoId);
          importedStudentsBySection.set(asignaturaId, sectionStudents);
        }
      } catch (rowError) {
        const msg = rowError instanceof Error ? rowError.message : "unknown";
        if (msg.includes("duplicate key") || msg.includes("unique")) {
          errors.push(`Fila ${lineNum}: Conflicto de datos (${loginFormatted}).`);
        } else {
          errors.push(`Fila ${lineNum}: Error inesperado.`);
          throw rowError;
        }
      }
    }

    if (replaceActiveEnrollments && importedStudentsBySection.size > 0) {
      const now = new Date();
      const importedSectionIds = Array.from(importedStudentsBySection.keys());
      const activeRows = await tx
        .select({
          id: matriculas.id,
          alumnoId: matriculas.alumnoId,
          asignaturaId: matriculas.asignaturaId,
        })
        .from(matriculas)
        .where(
          and(
            inArray(matriculas.asignaturaId, importedSectionIds),
            eq(matriculas.activa, true),
            isNull(matriculas.eliminadoAt),
          ),
        );

      const enrollmentIdsToClose = activeRows
        .filter((row) => !importedStudentsBySection.get(row.asignaturaId)?.has(row.alumnoId))
        .map((row) => row.id);
      const removedStudentIds = Array.from(
        new Set(
          activeRows
            .filter((row) => !importedStudentsBySection.get(row.asignaturaId)?.has(row.alumnoId))
            .map((row) => row.alumnoId),
        ),
      );

      if (enrollmentIdsToClose.length > 0) {
        await tx
          .update(matriculas)
          .set({
            activa: false,
            eliminadoAt: now,
            eliminadoPor: adminId,
          })
          .where(inArray(matriculas.id, enrollmentIdsToClose));
        enrollmentsClosed = enrollmentIdsToClose.length;
      }

      if (removedStudentIds.length > 0) {
        const studentsWithActiveEnrollments = await tx
          .select({ alumnoId: matriculas.alumnoId })
          .from(matriculas)
          .where(
            and(
              inArray(matriculas.alumnoId, removedStudentIds),
              eq(matriculas.activa, true),
              isNull(matriculas.eliminadoAt),
            ),
          );
        const stillActive = new Set(studentsWithActiveEnrollments.map((row) => row.alumnoId));
        const studentsToRetire = removedStudentIds.filter((id) => !stillActive.has(id));

        if (studentsToRetire.length > 0) {
          await tx
            .update(usuarios)
            .set({
              activo: false,
              estadoAlumno: "retirado",
              eliminadoAt: now,
              eliminadoPor: adminId,
              updatedAt: now,
            })
            .where(and(inArray(usuarios.id, studentsToRetire), eq(usuarios.rol, "alumno")));
          studentsRetired = studentsToRetire.length;
        }
      }
    }
    });

    const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();
    await registrarAudit({
      correlationId,
      userId: session?.user?.id ?? "unknown",
      userRol: "admin",
      accion: "crear",
      entidad: "usuarios",
      payload: {
        action: "importar_excel",
        fileName: file instanceof File ? file.name : "upload.csv",
        periodId: selectedPeriod.id,
        periodCode: selectedPeriod.codigo,
        created,
        updated,
        coursesCreated,
        sectionsCreated,
        enrollmentsCreated,
        enrollmentsReactivated,
        enrollmentsClosed,
        studentsRetired,
        autoCredentialsCreated,
        replaceActiveEnrollments,
        erroresCount: errors.length,
        warningsCount: warnings.length,
        total: parsedRows.length,
        createdUserIds,
        createdCourseIds,
        createdSectionIds,
        createdEnrollmentIds,
      },
      exitoso: true,
    });

    return NextResponse.json({
      created,
      updated,
      coursesCreated,
      sectionsCreated,
      period: selectedPeriod,
      enrollmentsCreated,
      enrollmentsReactivated,
      enrollmentsClosed,
      studentsRetired,
      autoCredentialsCreated,
      errors,
      warnings,
      total: parsedRows.length,
      createdUserIds,
      createdCourseIds,
      createdSectionIds,
      createdEnrollmentIds,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ message: `Error al procesar archivo: ${msg}` }, { status: 500 });
  }
}
