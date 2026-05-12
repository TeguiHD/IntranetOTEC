"use client";

import { eliminarMaterialFormAction } from "@/actions/material";

type Props = {
  materialId: string;
  asignaturaId: string;
  nombre: string;
};

export function EliminarMaterialButton({ materialId, asignaturaId, nombre }: Props) {
  return (
    <form action={eliminarMaterialFormAction}>
      <input type="hidden" name="asignaturaId" value={asignaturaId} />
      <input type="hidden" name="redirectTo" value="/docente/materiales" />
      <input type="hidden" name="materialId" value={materialId} />
      <button
        type="submit"
        title="Eliminar archivo"
        onClick={(e) => {
          if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
            e.preventDefault();
          }
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>
    </form>
  );
}
