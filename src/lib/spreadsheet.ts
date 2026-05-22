import ExcelJS from "exceljs";

const CONTROL_CHARS_REGEX = /[\u0000-\u001f\u007f]/g;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

type SpreadsheetRow = Record<string, unknown>;

const sanitizeToken = (value: string): string =>
  value
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeHeader = (value: string, index: number): string => {
  const cleaned = sanitizeToken(value);

  if (!cleaned || RESERVED_KEYS.has(cleaned)) {
    return `col_${index}`;
  }

  return cleaned;
};

const isTimeOnlyFormat = (numFmt: string | undefined): boolean => {
  const normalized = String(numFmt ?? "").toLowerCase();
  if (!normalized) {
    return false;
  }

  const withoutQuotedText = normalized.replace(/"[^"]*"/g, "");
  return /h{1,2}/.test(withoutQuotedText) && !/[dy]/.test(withoutQuotedText);
};

const formatTimeOnlyDate = (value: Date): string => {
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const normalizeCellValue = (value: unknown, numFmt?: string): string => {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    if (isTimeOnlyFormat(numFmt)) {
      return formatTimeOnlyDate(value);
    }

    return value.toISOString();
  }

  if (typeof value === "object") {
    const candidate = value as {
      text?: unknown;
      result?: unknown;
      richText?: Array<{ text?: unknown }>;
      hyperlink?: unknown;
    };

    if (Array.isArray(candidate.richText)) {
      return candidate.richText
        .map((chunk) => (typeof chunk.text === "string" ? chunk.text : ""))
        .join("");
    }

    if (typeof candidate.text === "string") {
      return candidate.text;
    }

    if (candidate.result !== undefined && candidate.result !== null) {
      return String(candidate.result);
    }

    if (typeof candidate.hyperlink === "string") {
      return candidate.hyperlink;
    }
  }

  return String(value);
};

const parseDelimited = (content: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows;
};

const rowsToObjects = (rows: string[][]): SpreadsheetRow[] => {
  if (rows.length === 0) {
    return [];
  }

  const headerRow = rows[0] ?? [];
  const headers = headerRow.map((value, index) => sanitizeHeader(value, index + 1));
  const parsed: SpreadsheetRow[] = [];

  for (const rawRow of rows.slice(1)) {
    const rowObject: Record<string, unknown> = Object.create(null);
    let hasData = false;

    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index] ?? `col_${index + 1}`;
      const value = sanitizeToken(rawRow[index] ?? "");

      if (value.length > 0) {
        hasData = true;
      }

      rowObject[header] = value;
    }

    if (hasData) {
      parsed.push(rowObject);
    }
  }

  return parsed;
};

const parseXlsxBuffer = async (buffer: Buffer): Promise<SpreadsheetRow[]> => {
  const workbook = new ExcelJS.Workbook();
  const excelJsBuffer = buffer as unknown as Parameters<ExcelJS.Workbook["xlsx"]["load"]>[0];
  await workbook.xlsx.load(excelJsBuffer);

  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    return [];
  }

  const headerValues = worksheet.getRow(1).values as unknown[];
  const headers: string[] = [];
  const totalColumns = Math.max(headerValues.length - 1, worksheet.columnCount);

  for (let index = 1; index <= totalColumns; index += 1) {
    const headerRaw = normalizeCellValue(headerValues[index]);
    headers[index] = sanitizeHeader(headerRaw, index);
  }

  const parsed: SpreadsheetRow[] = [];

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const rowObject: Record<string, unknown> = Object.create(null);
    let hasData = false;

    for (let col = 1; col <= totalColumns; col += 1) {
      const header = headers[col] ?? `col_${col}`;
      const cell = row.getCell(col);
      const value = sanitizeToken(normalizeCellValue(cell.value, cell.numFmt));

      if (value.length > 0) {
        hasData = true;
      }

      rowObject[header] = value;
    }

    if (hasData) {
      parsed.push(rowObject);
    }
  });

  return parsed;
};

const parseCsvBuffer = (buffer: Buffer): SpreadsheetRow[] => {
  const content = buffer.toString("utf8").replace(/^\uFEFF/, "");

  const firstNonEmptyLine =
    content
      .split(/\r?\n/u)
      .find((line) => line.trim().length > 0) ?? "";

  const delimiter = firstNonEmptyLine.includes("\t")
    ? "\t"
    : firstNonEmptyLine.includes(";")
      ? ";"
      : ",";

  const rows = parseDelimited(content, delimiter);
  return rowsToObjects(rows);
};

export const parseSpreadsheetRowsFromBuffer = async (
  buffer: Buffer,
  fileName: string,
): Promise<SpreadsheetRow[]> => {
  const normalizedName = fileName.trim().toLowerCase();

  if (normalizedName.endsWith(".csv")) {
    return parseCsvBuffer(buffer);
  }

  if (normalizedName.endsWith(".txt") || normalizedName.endsWith(".tsv")) {
    return parseCsvBuffer(buffer);
  }

  if (normalizedName.endsWith(".xlsx")) {
    return parseXlsxBuffer(buffer);
  }

  throw new Error("unsupported_spreadsheet_type");
};

export type SpreadsheetExportColumn = {
  key: string;
  header: string;
  width?: number;
};

export const buildSpreadsheetBuffer = async (
  sheetName: string,
  columns: SpreadsheetExportColumn[],
  rows: Array<Record<string, unknown>>,
): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31));
  worksheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width ?? Math.max(12, column.header.length + 2),
  }));

  for (const row of rows) {
    const sanitized: Record<string, unknown> = Object.create(null);
    for (const column of columns) {
      const value = row[column.key];
      if (value instanceof Date) {
        sanitized[column.key] = value.toISOString();
      } else if (value === undefined) {
        sanitized[column.key] = "";
      } else {
        sanitized[column.key] = value;
      }
    }
    worksheet.addRow(sanitized);
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output as ArrayBuffer);
};
