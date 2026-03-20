"use client";

import { useState } from "react";

import { CalendarDays, ExternalLink, Pencil } from "lucide-react";

import { editarClaseFormAction } from "@/actions/clases";
import { Modal } from "@/components/shared/Modal";

type Clase = {
  id: string;
  titulo: string;
  descripcion: string | null;
  numeroSesion: number | null;
  fecha: string | null;
  horaInicio: string | null;
  urlGrabacion: string | null;
  tipoUrl: "youtube" | "vimeo" | "drive" | "directo" | null;
  publicada: boolean | null;
};

type ClasesTableProps = {
  clases: Clase[];
  selectedAsignaturaId: string | undefined;
  currentPage: number;
};

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500";

export function ClasesTable({
  clases,
  selectedAsignaturaId,
  currentPage,
}: ClasesTableProps) {
  const [editingClase, setEditingClase] = useState<Clase | null>(null);

  if (clases.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-6 py-10 text-center dark:border-gray-700">
        <CalendarDays className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="mt-3 text-sm text-text-secondary dark:text-gray-400">
          No hay clases registradas para esta asignatura.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: cards */}
      <div className="mt-4 space-y-3 sm:hidden">
        {clases.map((clase) => (
          <div
            key={clase.id}
            className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-text-primary dark:text-white">
                  Sesión {clase.numeroSesion}
                </p>
                <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                  {clase.titulo}
                </p>
                {clase.fecha && (
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-500">
                    {clase.fecha}
                    {clase.horaInicio ? ` · ${clase.horaInicio}` : ""}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                    clase.publicada
                      ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  }`}
                >
                  {clase.publicada ? "Publicada" : "Borrador"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditingClase(clase)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-text-secondary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                  aria-label={`Editar sesión ${clase.numeroSesion}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
            {clase.urlGrabacion && (
              <div className="mt-2">
                <a
                  href={clase.urlGrabacion}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                >
                  <ExternalLink className="h-3 w-3" />
                  {clase.tipoUrl ?? "URL"} - Ver grabación
                </a>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="mt-4 hidden overflow-x-auto sm:block">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
              <th className="px-3 py-2.5">Sesión</th>
              <th className="px-3 py-2.5">Fecha</th>
              <th className="px-3 py-2.5">Grabación</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5 text-right">Editar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {clases.map((clase) => (
              <tr key={clase.id} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                <td className="px-3 py-3">
                  <p className="font-medium text-text-primary dark:text-gray-100">
                    Sesión {clase.numeroSesion}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">{clase.titulo}</p>
                </td>
                <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                  {clase.fecha ?? "—"}
                  {clase.horaInicio ? ` ${clase.horaInicio}` : ""}
                </td>
                <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                  {clase.urlGrabacion ? (
                    <a
                      href={clase.urlGrabacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {clase.tipoUrl ?? "URL"}
                    </a>
                  ) : (
                    <span className="text-xs text-text-muted dark:text-gray-500">Sin URL</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      clase.publicada
                        ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                    }`}
                  >
                    {clase.publicada ? "Publicada" : "Borrador"}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setEditingClase(clase)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-text-secondary transition-colors hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
                    aria-label={`Editar sesión ${clase.numeroSesion}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal using shared Modal component */}
      <Modal
        open={editingClase !== null}
        onClose={() => setEditingClase(null)}
        title={editingClase ? `Editar Sesión ${editingClase.numeroSesion}` : ""}
        size="max-w-lg"
      >
        {editingClase && (
          <form action={editarClaseFormAction} className="space-y-4">
            <input type="hidden" name="id" value={editingClase.id} />
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId ?? ""} />
            <input type="hidden" name="page" value={String(currentPage)} />

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Título <span className="text-danger">*</span>
              </label>
              <input name="titulo" type="text" required minLength={3} maxLength={140} defaultValue={editingClase.titulo} className={inputClass} />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Descripción (opcional)
              </label>
              <textarea name="descripcion" rows={2} maxLength={600} defaultValue={editingClase.descripcion ?? ""} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">Fecha <span className="text-danger">*</span></label>
                <input name="fecha" type="date" required defaultValue={editingClase.fecha ?? ""} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">Hora inicio</label>
                <input name="horaInicio" type="time" defaultValue={editingClase.horaInicio ?? ""} className={inputClass} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">Tipo URL</label>
                <select name="tipoUrl" defaultValue={editingClase.tipoUrl ?? ""} className={inputClass}>
                  <option value="">Sin grabación</option>
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="drive">Drive</option>
                  <option value="directo">Directo</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-text-primary dark:text-gray-200">URL grabación</label>
                <input name="urlGrabacion" type="url" maxLength={500} defaultValue={editingClase.urlGrabacion ?? ""} placeholder="https://..." className={inputClass} />
              </div>
            </div>

            <label className="inline-flex items-center gap-2.5 text-sm text-text-primary dark:text-gray-200">
              <input type="checkbox" name="publicada" defaultChecked={editingClase.publicada ?? false} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
              Publicar clase
            </label>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <button type="button" onClick={() => setEditingClase(null)} className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                Cancelar
              </button>
              <button type="submit" className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]">
                Guardar cambios
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
