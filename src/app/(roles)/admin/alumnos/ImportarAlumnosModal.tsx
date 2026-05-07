"use client";

import { useRef, useState, useTransition } from "react";

import { AlertCircle, CheckCircle2, Download, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { crearAlumnoAction } from "@/actions/usuarios";
import { Modal } from "@/components/shared/Modal";

type CsvRow = {
  nombre: string;
  apellido: string;
  rut: string;
  email: string;
  _line: number;
  _error?: string;
};

type ResultRow = CsvRow & { status: "ok" | "error"; message?: string };

// Simple CSV parser — handles quoted fields, comma or semicolon delimiter
function parseCsv(text: string): string[][] {
  const delimiter = text.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  const row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(current.trim());
      current = "";
      if (row.some((c) => c !== "")) rows.push([...row]);
      row.length = 0;
    } else {
      current += ch;
    }
  }
  if (current || row.length) {
    row.push(current.trim());
    if (row.some((c) => c !== "")) rows.push([...row]);
  }
  return rows;
}

const HEADER_ALIASES: Record<string, string> = {
  name: "nombre",
  first_name: "nombre",
  primer_nombre: "nombre",
  last_name: "apellido",
  surname: "apellido",
  apellidos: "apellido",
  rut_credencial: "rut",
  credencial: "rut",
  identificador: "rut",
  correo: "email",
  mail: "email",
  correo_electronico: "email",
};

function normalizeHeader(h: string): string {
  const clean = h.toLowerCase().trim().replace(/\s+/g, "_");
  return HEADER_ALIASES[clean] ?? clean;
}

function parseRows(text: string): CsvRow[] {
  const all = parseCsv(text);
  if (all.length < 2) return [];

  const rawHeaders = all[0].map(normalizeHeader);
  const idxOf = (key: string) => rawHeaders.indexOf(key);
  const nIdx = idxOf("nombre");
  const aIdx = idxOf("apellido");
  const rIdx = idxOf("rut");
  const eIdx = idxOf("email");

  return all.slice(1).map((row, i) => {
    const get = (idx: number) => (idx >= 0 ? (row[idx] ?? "").trim() : "");
    const nombre = get(nIdx);
    const apellido = get(aIdx);
    const rut = get(rIdx);
    const email = get(eIdx);

    let _error: string | undefined;
    if (!nombre) _error = "Nombre vacío";
    else if (!apellido) _error = "Apellido vacío";
    else if (!rut) _error = "RUT/Credencial vacío";

    return { nombre, apellido, rut, email, _line: i + 2, _error };
  });
}

const TEMPLATE_CSV =
  "nombre,apellido,rut,email\nJuan,Pérez,12345678-9,juan@ejemplo.cl\nMaría,López,EXT-A12345678,maria@ejemplo.cl\n";

export function ImportarAlumnosModal() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [parseError, setParseError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setParseError(null);
    setResults(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseRows(text);
      if (parsed.length === 0) {
        setParseError("No se encontraron filas válidas. Revisa el formato del archivo.");
        setRows([]);
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleImport = () => {
    const valid = rows.filter((r) => !r._error);
    if (!valid.length) return;

    startTransition(async () => {
      const out: ResultRow[] = [];
      for (const row of rows) {
        if (row._error) {
          out.push({ ...row, status: "error", message: row._error });
          continue;
        }
        const isExtranjera = row.rut.toUpperCase().startsWith("EXT-");
        const res = await crearAlumnoAction({
          nombre: row.nombre,
          apellido: row.apellido,
          credencialTipo: isExtranjera ? "extranjera" : "rut",
          rut: isExtranjera ? undefined : row.rut,
          credencialExtranjera: isExtranjera ? row.rut.replace(/^EXT-/i, "") : undefined,
          email: row.email || undefined,
        });
        out.push({ ...row, status: res.ok ? "ok" : "error", message: res.ok ? undefined : (res.message ?? res.code) });
      }
      setResults(out);
      const ok = out.filter((r) => r.status === "ok").length;
      const err = out.filter((r) => r.status === "error").length;
      if (ok > 0) toast.success(`${ok} alumno${ok !== 1 ? "s" : ""} importado${ok !== 1 ? "s" : ""} correctamente.`);
      if (err > 0) toast.error(`${err} fila${err !== 1 ? "s" : ""} con error.`);
    });
  };

  const handleClose = () => {
    if (isPending) return;
    setOpen(false);
    setRows([]);
    setResults(null);
    setParseError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_alumnos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows.filter((r) => !r._error);
  const errorRows = rows.filter((r) => r._error);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary-light dark:hover:text-primary-light"
      >
        <Upload className="h-4 w-4" />
        Importar CSV
      </button>

      <Modal open={open} onClose={handleClose} title="Importar Alumnos desde CSV" size="max-w-2xl">
        <div className="space-y-4">
          {/* Instructions */}
          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 dark:border-blue-900/30 dark:bg-blue-950/20">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-semibold">Columnas requeridas: <code>nombre, apellido, rut, email</code></p>
              <p className="mt-0.5">El campo <code>email</code> es opcional. El RUT puede ser chileno (12345678-9) o credencial extranjera (EXT-A12345678). El PIN inicial se deriva automáticamente del RUT.</p>
            </div>
          </div>

          {/* Template download */}
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline dark:text-primary-light"
          >
            <Download className="h-3.5 w-3.5" />
            Descargar plantilla CSV de ejemplo
          </button>

          {/* Drop zone */}
          {!results && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/60 px-6 py-8 text-center transition-colors hover:border-primary/40 dark:border-gray-700 dark:bg-gray-800/40 dark:hover:border-primary/30"
            >
              <Upload className="h-8 w-8 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-medium text-text-primary dark:text-gray-200">
                  Arrastra tu archivo CSV aquí
                </p>
                <p className="mt-0.5 text-xs text-text-muted dark:text-gray-500">
                  o selecciona desde tu computador
                </p>
              </div>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <Upload className="h-3.5 w-3.5" /> Seleccionar archivo
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt,.tsv"
                  className="sr-only"
                  inputMode="text" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
              </label>
            </div>
          )}

          {parseError && (
            <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger dark:bg-danger/10">
              {parseError}
            </p>
          )}

          {/* Preview (before import) */}
          {rows.length > 0 && !results && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                  Vista previa — {rows.length} filas
                  {errorRows.length > 0 && (
                    <span className="ml-2 text-danger"> ({errorRows.length} con error)</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => { setRows([]); if (fileRef.current) fileRef.current.value = ""; }}
                  className="text-xs text-text-muted hover:text-danger dark:text-gray-500"
                >
                  <X className="inline h-3.5 w-3.5" /> Limpiar
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left text-text-secondary dark:text-gray-400">
                      {["#", "Nombre", "Apellido", "RUT / Credencial", "Correo", "Estado"].map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {rows.map((r) => (
                      <tr key={r._line} className={r._error ? "bg-danger/5 dark:bg-danger/10" : ""}>
                        <td className="px-3 py-2 text-text-muted dark:text-gray-500">{r._line}</td>
                        <td className="px-3 py-2">{r.nombre || <span className="text-danger">—</span>}</td>
                        <td className="px-3 py-2">{r.apellido || <span className="text-danger">—</span>}</td>
                        <td className="px-3 py-2 font-mono">{r.rut || <span className="text-danger">—</span>}</td>
                        <td className="px-3 py-2 text-text-secondary">{r.email || "—"}</td>
                        <td className="px-3 py-2">
                          {r._error
                            ? <span className="text-danger">{r._error}</span>
                            : <span className="text-emerald-600 dark:text-emerald-400">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results (after import) */}
          {results && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-text-secondary dark:text-gray-400">
                Resultado de la importación
              </p>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="min-w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
                    <tr className="text-left text-text-secondary dark:text-gray-400">
                      {["#", "Nombre", "RUT / Credencial", "Estado"].map((h) => (
                        <th key={h} className="px-3 py-2 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {results.map((r) => (
                      <tr key={r._line}>
                        <td className="px-3 py-2 text-text-muted">{r._line}</td>
                        <td className="px-3 py-2">{r.nombre} {r.apellido}</td>
                        <td className="px-3 py-2 font-mono">{r.rut}</td>
                        <td className="px-3 py-2">
                          {r.status === "ok"
                            ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Importado</span>
                            : <span className="text-danger">{r.message ?? "Error"}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              {results ? "Cerrar" : "Cancelar"}
            </button>
            {!results && validRows.length > 0 && (
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
              >
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Importar {validRows.length} alumno{validRows.length !== 1 ? "s" : ""}</>
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
