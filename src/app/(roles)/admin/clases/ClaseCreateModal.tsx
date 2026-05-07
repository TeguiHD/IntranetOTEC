"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { crearClaseFormAction } from "@/actions/clases";
import { Modal } from "@/components/shared/Modal";

const inputClass =
  "h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary-light/20";

type ClaseCreateModalProps = {
  asignaturaId: string | undefined;
  currentPage: number;
  periodoId?: string;
  searchQuery?: string;
  disabled?: boolean;
};

export function ClaseCreateModal({ asignaturaId, currentPage, periodoId, searchQuery, disabled = false }: ClaseCreateModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setOpen(true);
          }
        }}
        disabled={disabled}
        title={disabled ? "Selecciona una seccion para crear clases" : undefined}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        <Plus className="h-4 w-4" />
        Nueva Clase
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Crear Clase"
        description="Programa una nueva sesión para la asignatura seleccionada."
        size="max-w-xl"
      >
        <form action={crearClaseFormAction} className="space-y-4">
          <input type="hidden" name="asignaturaId" value={asignaturaId ?? ""} />
          <input type="hidden" name="periodoId" value={periodoId ?? ""} />
          <input type="hidden" name="page" value={String(currentPage)} />
          <input type="hidden" name="q" value={searchQuery ?? ""} />

          <div className="space-y-1.5">
            <label htmlFor="modal-clase-titulo" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Título <span className="text-danger">*</span>
            </label>
            <input
              id="modal-clase-titulo"
              name="titulo"
              type="text"
              required
              minLength={3}
              maxLength={140}
              placeholder="Ej: Introducción al módulo 1"
              className={inputClass}
              autoFocus inputMode="text"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="modal-clase-descripcion" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              Descripción (opcional)
            </label>
            <textarea
              id="modal-clase-descripcion"
              name="descripcion"
              rows={2}
              maxLength={600}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-clase-fecha" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Fecha <span className="text-danger">*</span>
              </label>
              <input
                id="modal-clase-fecha"
                name="fecha"
                type="date"
                required
                className={inputClass} inputMode="text"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-clase-hora" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Hora inicio (opcional)
              </label>
              <input
                id="modal-clase-hora"
                name="horaInicio"
                type="time"
                className={inputClass} inputMode="text"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="modal-clase-sesion" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                N° sesión (opcional)
              </label>
              <input
                id="modal-clase-sesion"
                name="numeroSesion"
                type="number"
                min={1}
                max={1000}
                className={inputClass} inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="modal-clase-tipo-url" className="block text-sm font-medium text-text-primary dark:text-gray-200">
                Tipo URL (opcional)
              </label>
              <select
                id="modal-clase-tipo-url"
                name="tipoUrl"
                className={inputClass}
              >
                <option value="">Sin grabación</option>
                <option value="youtube">YouTube</option>
                <option value="vimeo">Vimeo</option>
                <option value="drive">Drive</option>
                <option value="directo">Directo</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="modal-clase-url" className="block text-sm font-medium text-text-primary dark:text-gray-200">
              URL grabación (opcional)
            </label>
            <input
              id="modal-clase-url"
              name="urlGrabacion"
              type="url"
              maxLength={500}
              placeholder="https://www.youtube-nocookie.com/..."
              className={inputClass} inputMode="url"
            />
          </div>

          <label className="inline-flex items-center gap-2.5 text-sm text-text-primary dark:text-gray-200">
            <input
              type="checkbox"
              name="publicada"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" inputMode="text"
            />
            Publicar inmediatamente
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-xl border border-gray-200 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
            >
              Crear Clase
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
