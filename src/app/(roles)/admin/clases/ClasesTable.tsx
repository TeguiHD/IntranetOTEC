"use client";

import { useState } from "react";

import { editarClaseFormAction } from "@/actions/clases";

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

export function ClasesTable({
  clases,
  selectedAsignaturaId,
  currentPage,
}: ClasesTableProps) {
  const [editingClase, setEditingClase] = useState<Clase | null>(null);

  if (clases.length === 0) {
    return (
      <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
        No hay clases registradas para esta asignatura.
      </p>
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
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                  </svg>
                </button>
              </div>
            </div>
            {clase.urlGrabacion && (
              <p className="mt-2 text-xs text-text-secondary dark:text-gray-500">
                {clase.tipoUrl ?? "URL"}: grabación disponible
              </p>
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
              <tr
                key={clase.id}
                className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5"
              >
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
                  {clase.urlGrabacion ? (clase.tipoUrl ?? "URL") : "Sin URL"}
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

      {/* Modal de edición */}
      {editingClase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-clase-title"
        >
          {/* Overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingClase(null)}
            aria-label="Cerrar edición de clase"
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200/80 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <h3
                id="edit-clase-title"
                className="text-base font-semibold text-text-primary dark:text-white"
              >
                Editar Sesión {editingClase.numeroSesion}
              </h3>
              <button
                type="button"
                onClick={() => setEditingClase(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-gray-100 hover:text-text-primary dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form action={editarClaseFormAction} className="space-y-4 px-6 py-5">
              <input type="hidden" name="id" value={editingClase.id} />
              <input type="hidden" name="asignaturaId" value={selectedAsignaturaId ?? ""} />
              <input type="hidden" name="page" value={String(currentPage)} />

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                  Título <span className="text-danger">*</span>
                </label>
                <input
                  name="titulo"
                  type="text"
                  inputMode="text"
                  required
                  minLength={3}
                  maxLength={140}
                  defaultValue={editingClase.titulo}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                  Descripción (opcional)
                </label>
                <textarea
                  name="descripcion"
                  rows={3}
                  maxLength={600}
                  defaultValue={editingClase.descripcion ?? ""}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                    Fecha <span className="text-danger">*</span>
                  </label>
                  <input
                    name="fecha"
                    type="date"
                    inputMode="numeric"
                    required
                    defaultValue={editingClase.fecha ?? ""}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                    Hora inicio (opcional)
                  </label>
                  <input
                    name="horaInicio"
                    type="time"
                    inputMode="numeric"
                    defaultValue={editingClase.horaInicio ?? ""}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                    Tipo URL (opcional)
                  </label>
                  <select
                    name="tipoUrl"
                    defaultValue={editingClase.tipoUrl ?? ""}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">Sin grabación</option>
                    <option value="youtube">YouTube</option>
                    <option value="vimeo">Vimeo</option>
                    <option value="drive">Drive</option>
                    <option value="directo">Directo</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary dark:text-gray-200">
                    URL grabación (opcional)
                  </label>
                  <input
                    name="urlGrabacion"
                    type="url"
                    inputMode="url"
                    maxLength={500}
                    defaultValue={editingClase.urlGrabacion ?? ""}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2.5 text-sm text-text-primary dark:text-gray-200">
                <input
                  type="checkbox"
                  inputMode="text"
                  name="publicada"
                  defaultChecked={editingClase.publicada ?? false}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                Publicar clase
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClase(null)}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-text-primary hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary-dark py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:shadow-md active:scale-[0.98]"
                >
                  Guardar cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
