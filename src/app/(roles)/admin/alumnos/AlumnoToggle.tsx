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
      <form action={desactivarAlumnoFormAction} className="inline sm:inline">
        <input type="hidden" name="userId" value={userId} />
        <button
          type="submit"
          className="h-10 w-full rounded-xl border border-danger/30 px-3.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 active:bg-danger/20 dark:text-red-400 sm:h-auto sm:w-auto sm:py-1.5 sm:text-xs"
        >
          Desactivar
        </button>
      </form>
    );
  }

  return (
    <form action={activarAlumnoFormAction} className="inline sm:inline">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="h-10 w-full rounded-xl border border-success/30 px-3.5 text-sm font-medium text-green-700 transition-colors hover:bg-success/10 active:bg-success/20 dark:text-green-400 sm:h-auto sm:w-auto sm:py-1.5 sm:text-xs"
      >
        Activar
      </button>
    </form>
  );
}
