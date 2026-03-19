"use client";

import { useState } from "react";

import { Pencil } from "lucide-react";

import { editarMatriculaFormAction } from "@/actions/matriculas";
import { Modal } from "@/components/shared/Modal";

type EditMatriculaButtonProps = {
  matriculaId: string;
  alumnoNombre: string;
  estadoPago: string | null;
  montoArancel: string | null;
  asignaturaId: string;
  currentPage: number;
};

const ESTADO_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado", label: "Pagado" },
  { value: "mora", label: "Mora" },
  { value: "becado", label: "Becado" },
] as const;

export function EditMatriculaButton({
  matriculaId,
  alumnoNombre,
  estadoPago,
  montoArancel,
  asignaturaId,
  currentPage,
}: EditMatriculaButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary/40 dark:text-primary-light dark:hover:bg-primary/15"
        title="Editar matrícula"
      >
        <Pencil className="inline-block h-3.5 w-3.5" />
        <span className="ml-1">Editar</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar matrícula"
        description={alumnoNombre}
      >
        <form action={editarMatriculaFormAction} className="space-y-4">
          <input type="hidden" name="matriculaId" value={matriculaId} />
          <input type="hidden" name="asignaturaId" value={asignaturaId} />
          <input type="hidden" name="page" value={String(currentPage)} />

          <div className="space-y-1.5">
            <label
              htmlFor={`edit-estado-${matriculaId}`}
              className="text-sm font-medium text-text-primary dark:text-gray-200"
            >
              Estado de pago <span className="text-danger">*</span>
            </label>
            <select
              id={`edit-estado-${matriculaId}`}
              name="estadoPago"
              required
              defaultValue={estadoPago ?? "pendiente"}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              {ESTADO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor={`edit-monto-${matriculaId}`}
              className="text-sm font-medium text-text-primary dark:text-gray-200"
            >
              Monto arancel (opcional)
            </label>
            <input
              id={`edit-monto-${matriculaId}`}
              name="montoArancel"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              defaultValue={montoArancel ?? ""}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-xl border border-gray-200 text-sm font-medium text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-11 flex-1 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
