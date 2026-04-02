"use client";

import { useRef, useState, useTransition } from "react";

import { FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

type ImportResult = {
  created: number;
  updated: number;
  errors: string[];
  total: number;
};

export default function AdminImportarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && isValidFile(dropped)) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error("Solo se aceptan archivos .xlsx o .csv");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && isValidFile(selected)) {
      setFile(selected);
      setResult(null);
    } else if (selected) {
      toast.error("Solo se aceptan archivos .xlsx o .csv");
    }
  };

  const isValidFile = (f: File) => {
    const name = f.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".csv") || name.endsWith(".xls");
  };

  const handleSubmit = () => {
    if (!file) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/internal/import-alumnos", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          toast.error(data.message ?? "Error al importar archivo.");
          return;
        }

        setResult(data);

        if (data.errors.length > 0) {
          toast.warning(`Importación completada con ${data.errors.length} error(es).`);
        } else {
          toast.success(`Importación exitosa: ${data.created} creados, ${data.updated} actualizados.`);
        }
      } catch {
        toast.error("Error de conexión. Intenta nuevamente.");
      }
    });
  };

  return (
    <section className="space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Importar Alumnos</h1>
        <p className="mt-1 text-sm text-white/80">
          Sube un archivo .xlsx o .csv para registrar alumnos y crear cursos masivamente.
        </p>
      </div>

      {/* Instructions */}
      <article className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white">
          Formato del Archivo
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="text-left text-text-secondary dark:text-gray-400">
                <th className="px-2 py-1 font-semibold">Columna</th>
                <th className="px-2 py-1 font-semibold">Obligatorio</th>
                <th className="px-2 py-1 font-semibold">Ejemplo</th>
              </tr>
            </thead>
            <tbody className="text-text-primary dark:text-gray-200">
              <tr><td className="px-2 py-1 font-medium">Curso</td><td className="px-2 py-1">Sí</td><td className="px-2 py-1">Computación Básica</td></tr>
              <tr><td className="px-2 py-1 font-medium">Dias/Hora</td><td className="px-2 py-1">No</td><td className="px-2 py-1">Lunes y Miércoles 18:00</td></tr>
              <tr><td className="px-2 py-1 font-medium">Nombre</td><td className="px-2 py-1">Sí</td><td className="px-2 py-1">Juan Pérez (nombre completo)</td></tr>
              <tr><td className="px-2 py-1 font-medium">Rut</td><td className="px-2 py-1">Sí</td><td className="px-2 py-1">12.345.678-5</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-text-secondary dark:text-gray-400">
          Los cursos se crean automáticamente si no existen (sin docente, listo para asignar). Los alumnos quedan matriculados en su curso. Si el RUT ya existe, se actualiza el nombre.
        </p>
      </article>

      {/* Upload */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Subir Archivo
        </h2>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="mt-4 flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-primary/40"
        >
          <FileSpreadsheet className="h-12 w-12 text-primary/50" strokeWidth={1.5} />

          {file ? (
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-text-primary dark:text-white">{file.name}</p>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="rounded-lg p-1 text-text-secondary hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Arrastra tu archivo aquí o
              </p>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/20 dark:border-primary/40 dark:bg-primary/20 dark:text-primary-light"
              >
                Seleccionar archivo
              </button>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {file && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Importar Alumnos
                </>
              )}
            </button>
          </div>
        )}
      </article>

      {/* Results */}
      {result && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Resultado de Importación
          </h2>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-success">{result.created}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Creados</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className="text-2xl font-bold text-primary">{result.updated}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Actualizados</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-center dark:border-gray-800 dark:bg-gray-800/50">
              <p className={`text-2xl font-bold ${result.errors.length > 0 ? "text-danger" : "text-success"}`}>
                {result.errors.length}
              </p>
              <p className="text-xs text-text-secondary dark:text-gray-400">Errores</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-danger/20 bg-danger/5 p-4 dark:border-danger/30 dark:bg-danger/10">
              <p className="text-sm font-semibold text-danger">Errores encontrados:</p>
              <ul className="mt-2 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-text-secondary dark:text-gray-400">
                    • {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
      )}
    </section>
  );
}
