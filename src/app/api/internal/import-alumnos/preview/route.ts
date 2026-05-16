import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getDb } from "@/db";
import { periodosAcademicos } from "@/db/schema";
import { registrarAudit } from "@/lib/audit";
import { parseAppRole } from "@/lib/authz";
import {
  createCourseNameNormalizer,
  normalizeLookupKey,
  normalizeWhitespace,
} from "@/lib/import-course-normalization";
import {
  formatearRut,
  normalizarRut,
  validarRut,
} from "@/lib/rut";
import { parseSpreadsheetRowsFromBuffer } from "@/lib/spreadsheet";

type SpreadsheetRow = Record<string, unknown>;

type ParsedPreviewRow = {
  lineNumber: number;
  codigoCurso: string;
  codigoCursoKey: string;
  curso: string;
  cursoKey: string;
  cursoCanonico: string;
  cursoIdentityKey: string;
  personKey: string;
  diasHora: string;
  fechaInicio: string;
  nombreCompleto: string;
  rutRaw: string;
  telefonoRaw: string;
  telefono: string | null;
};

type PreviewStatus = "ok" | "warning" | "error";

type PreviewRow = {
  lineNumber: number;
  curso: string;
  cursoCanonico: string | null;
  nombreCompleto: string;
  rutRaw: string;
  identifier: string | null;
  telefono: string | null;
  status: PreviewStatus;
  messages: string[];
};

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_ROWS = 10_000;
const MAX_PREVIEW_ROWS = 300;
const ALLOWED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const toCourseIdentityNameKey = (cursoKey: string): string => `curso:${cursoKey}`;

const buildScheduleVariantKey = (fechaInicio: string, diasHora: string): string =>
  `${fechaInicio}|${normalizeLookupKey(diasHora)}`;

const buildCourseTemplateIdentityKey = (
  cursoKey: string,
  fechaInicio: string,
  diasHora: string,
): string => `${toCourseIdentityNameKey(cursoKey)}|${buildScheduleVariantKey(fechaInicio, diasHora)}`;

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
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
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

export async function POST(request: Request) {
  const session = await auth();
  const role = parseAppRole(session?.user?.rol);

  if (!role || role !== "admin") {
    return NextResponse.json({ message: "No autorizado." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const periodoIdRaw = formData.get("periodoId");
    const file = formData.get("file");

    if (typeof periodoIdRaw !== "string" || !periodoIdRaw.trim()) {
      return NextResponse.json(
        { message: "Debes seleccionar un periodo academico antes de previsualizar." },
        { status: 400 },
      );
    }

    const db = getDb();
    const [period] = await db
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

    if (!period) {
      return NextResponse.json(
        { message: "El periodo academico seleccionado no existe o ya no esta disponible." },
        { status: 400 },
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ message: "No se proporcionó un archivo válido." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "El archivo excede el tamaño máximo permitido (5MB)." },
        { status: 400 },
      );
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

    const today = new Date();
    const referenceDate = inferReferenceDateFromFileName(fileName, today);
    const fallbackDateString = toDateString(referenceDate);

    const parsedRows: ParsedPreviewRow[] = rows.map((rawRow, index) => {
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
        fechaInicio,
        nombreCompleto,
        rutRaw,
        telefonoRaw,
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

      row.cursoKey = resolvedCourse.canonicalKey;
      row.cursoCanonico = resolvedCourse.canonicalLabel;

      row.cursoIdentityKey = buildCourseTemplateIdentityKey(
        row.cursoKey,
        row.fechaInicio,
        row.diasHora,
      );
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
    const uniqueCourses = new Set<string>();
    const previewRows: PreviewRow[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const exactVariantGroups = courseNormalizer.variantGroups;
    for (const group of exactVariantGroups.slice(0, 8)) {
      warnings.push(
        `Se consolidaron variantes del curso "${group.canonicalLabel}" por normalizacion de mayusculas/tildes/espacios (${group.variants.slice(0, 4).join(" | ")}).`,
      );
    }
    if (exactVariantGroups.length > 8) {
      warnings.push(
        `Se detectaron ${exactVariantGroups.length - 8} grupos adicionales de variantes y tambien fueron consolidados.`,
      );
    }

    const fuzzyGroups = courseNormalizer.fuzzyGroups;
    for (const group of fuzzyGroups.slice(0, 6)) {
      warnings.push(
        `Se detectaron posibles tipeos consolidados bajo "${group.canonicalLabel}" (${group.mergedLabels.slice(0, 4).join(" | ")}).`,
      );
    }
    if (fuzzyGroups.length > 6) {
      warnings.push(
        `Se detectaron ${fuzzyGroups.length - 6} grupos adicionales de posible typo y tambien fueron consolidados.`,
      );
    }

    let readyRows = 0;
    let warningRows = 0;
    let errorRows = 0;
    let autoCredentialsEstimated = 0;
    let autoIdentifierSequence = 0;

    for (const row of parsedRows) {
      const messages: string[] = [];
      let hasError = false;
      let hasWarning = false;
      let identifier: string | null = null;

      if (!row.curso || !row.cursoKey) {
        const message = `Fila ${row.lineNumber}: Curso vacío.`;
        messages.push(message);
        errors.push(message);
        hasError = true;
      } else {
        uniqueCourses.add(row.cursoIdentityKey || toCourseIdentityNameKey(row.cursoKey));
      }

      if (!row.nombreCompleto) {
        const message = `Fila ${row.lineNumber}: Nombre vacío.`;
        messages.push(message);
        errors.push(message);
        hasError = true;
      } else {
        const { nombre } = splitNombreCompleto(row.nombreCompleto);

        if (normalizeWhitespace(nombre).length < 2) {
          const message = `Fila ${row.lineNumber}: Nombre muy corto.`;
          messages.push(message);
          errors.push(message);
          hasError = true;
        }
      }

      if (!hasError) {
        const rutNormalizado = normalizarRut(row.rutRaw);
        const rutValido = Boolean(rutNormalizado && validarRut(rutNormalizado));

        if (rutValido && rutNormalizado) {
          identifier = rutNormalizado;

          if (row.personKey) {
            personIdentifierMap.set(row.personKey, identifier);
          }
        } else if (row.personKey && personIdentifierMap.has(row.personKey)) {
          identifier = personIdentifierMap.get(row.personKey) ?? null;

          const message = `Fila ${row.lineNumber}: RUT ${row.rutRaw ? `inválido (${row.rutRaw})` : "vacío"}; se reutiliza identificador existente.`;
          messages.push(message);
          warnings.push(message);
          hasWarning = true;
        } else {
          const reusedAutoIdentifier = Boolean(row.personKey && autoIdentifierMap.has(row.personKey));

          if (reusedAutoIdentifier) {
            identifier = autoIdentifierMap.get(row.personKey) ?? null;
          } else {
            autoIdentifierSequence += 1;
            identifier = buildAutoIdentifier(autoIdentifierSequence);

            if (row.personKey) {
              autoIdentifierMap.set(row.personKey, identifier);
            }

            autoCredentialsEstimated += 1;
          }

          const message = reusedAutoIdentifier
            ? `Fila ${row.lineNumber}: RUT ${row.rutRaw ? `inválido (${row.rutRaw})` : "vacío"}; se reutiliza credencial temporal proyectada (${identifier}).`
            : `Fila ${row.lineNumber}: RUT ${row.rutRaw ? `inválido (${row.rutRaw})` : "vacío"}; se proyecta credencial temporal (${identifier}).`;
          messages.push(message);
          warnings.push(message);
          hasWarning = true;
        }

        if (row.telefonoRaw && !row.telefono) {
          const message = `Fila ${row.lineNumber}: Teléfono con formato no válido; se ignorará.`;
          messages.push(message);
          warnings.push(message);
          hasWarning = true;
        }
      }

      const status: PreviewStatus = hasError
        ? "error"
        : hasWarning
          ? "warning"
          : "ok";

      if (status === "error") {
        errorRows += 1;
      } else {
        readyRows += 1;
      }

      if (status === "warning") {
        warningRows += 1;
      }

      previewRows.push({
        lineNumber: row.lineNumber,
        curso: row.curso,
        cursoCanonico:
          row.cursoCanonico && normalizeLookupKey(row.cursoCanonico) !== normalizeLookupKey(row.curso)
            ? row.cursoCanonico
            : null,
        nombreCompleto: row.nombreCompleto,
        rutRaw: row.rutRaw,
        identifier: identifier ? formatearRut(identifier) : null,
        telefono: row.telefono,
        status,
        messages,
      });
    }

    const correlationId = request.headers.get("x-correlation-id") ?? randomUUID();

    try {
      await registrarAudit({
        correlationId,
        userId: session?.user?.id ?? "unknown",
        userRol: "admin",
        accion: "editar",
        entidad: "importacion_alumnos",
        payload: {
          action: "preview_importar_excel",
          fileName,
          periodId: period.id,
          periodCode: period.codigo,
          total: parsedRows.length,
          readyRows,
          warningRows,
          errorRows,
          uniqueCourses: uniqueCourses.size,
          autoCredentialsEstimated,
        },
        exitoso: true,
      });
    } catch {
      // La preview no debe fallar por errores de auditoría.
    }

    return NextResponse.json({
      fileName,
      period,
      totalRows: parsedRows.length,
      readyRows,
      warningRows,
      errorRows,
      uniqueCourses: uniqueCourses.size,
      autoCredentialsEstimated,
      canImport: readyRows > 0,
      errors,
      warnings,
      rows: previewRows.slice(0, MAX_PREVIEW_ROWS),
      truncated: previewRows.length > MAX_PREVIEW_ROWS,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    return NextResponse.json({ message: `Error al previsualizar archivo: ${msg}` }, { status: 500 });
  }
}
