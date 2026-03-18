"use client";

import {
  activarAlumnoFormAction,
  desactivarAlumnoFormAction,
} from "@/actions/usuarios";

type AlumnoToggleProps = {
  userId: string;
  activo: boolean;
};

export function AlumnoToggle({ userId, activo }: AlumnoToggleProps) {
  if (activo) {
    return (
      <form action={desactivarAlumnoFormAction} className="inline">
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger/50 dark:text-red-300 dark:hover:bg-red-950"
        >
          Desactivar
        </button>
      </form>
    );
  }

  return (
    <form action={activarAlumnoFormAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-lg border border-success/40 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success/50 dark:text-green-300 dark:hover:bg-green-950"
      >
        Activar
      </button>
    </form>
  );
}
