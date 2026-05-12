"use client";

import { useEffect, useRef, useState } from "react";

import { Upload, X } from "lucide-react";

import { subirMaterialFormAction } from "@/actions/material";
import { normalizarTextoVisible } from "@/lib/displayText";
import type { ClaseParaUpload } from "@/actions/material";

type AsignaturaParaSheet = {
  id: string;
  nombre: string;
  clases: ClaseParaUpload[];
};

type Props = {
  asignaturas: AsignaturaParaSheet[];
  defaultAsignaturaId?: string;
};

function formatFechaCorta(fecha: string): string {
  const d = new Date(fecha + "T12:00:00");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export function SubirMaterialSheet({ asignaturas, defaultAsignaturaId }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedAsigId, setSelectedAsigId] = useState(
    defaultAsignaturaId ?? asignaturas[0]?.id ?? "",
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedAsig = asignaturas.find((a) => a.id === selectedAsigId);
  const clases = selectedAsig?.clases ?? [];

  // Reset file input when asignatura changes
  useEffect(() => {
    if (fileRef.current) fileRef.current.value = "";
  }, [selectedAsigId]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
      >
        <Upload className="h-4 w-4" />
        Subir archivo
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal
            aria-label="Subir material"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-gray-900"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Upload className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-sm font-bold text-text-primary dark:text-white">Subir material</p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">PDF, Word, Excel, imágenes · máx. 50 MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1.5 text-text-secondary hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {asignaturas.length === 0 ? (
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  No tienes asignaturas con clases. Inicia una clase primero desde Mis Asignaturas.
                </p>
              ) : (
                <form action={subirMaterialFormAction} encType="multipart/form-data" className="space-y-5">
                  <input type="hidden" name="redirectTo" value="/docente/materiales" />

                  {/* Curso */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Curso
                    </label>
                    <select
                      name="asignaturaId"
                      value={selectedAsigId}
                      onChange={(e) => setSelectedAsigId(e.target.value)}
                      className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      {asignaturas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {normalizarTextoVisible(a.nombre)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sesión */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Sesión
                    </label>
                    {clases.length === 0 ? (
                      <p className="mt-1.5 rounded-xl border border-dashed border-gray-300 px-3 py-3 text-xs text-text-secondary dark:border-gray-700 dark:text-gray-400">
                        Este curso no tiene sesiones. Inicia una clase desde Mis Asignaturas.
                      </p>
                    ) : (
                      <select
                        name="claseId"
                        required
                        className="mt-1.5 h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      >
                        {clases.map((c) => (
                          <option key={c.id} value={c.id}>
                            Sesión {c.numeroSesion} · {formatFechaCorta(c.fecha)} — {normalizarTextoVisible(c.titulo)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Archivo */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Archivo
                    </label>
                    <label
                      className={[
                        "mt-1.5 flex min-h-[6rem] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-center transition",
                        clases.length === 0
                          ? "cursor-not-allowed border-gray-200 opacity-50 dark:border-gray-700"
                          : "border-gray-300 hover:border-primary/60 hover:bg-primary/5 dark:border-gray-700 dark:hover:border-primary/60",
                      ].join(" ")}
                    >
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-text-secondary dark:text-gray-400">
                        Toca para seleccionar archivo
                      </span>
                      <input
                        ref={fileRef}
                        type="file"
                        name="archivo"
                        required
                        disabled={clases.length === 0}
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.mp4,.webm,.zip"
                        className="sr-only"
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={clases.length === 0}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" />
                    Subir a alumnos
                  </button>
                </form>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
