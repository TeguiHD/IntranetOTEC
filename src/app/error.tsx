"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-950">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl font-bold text-text-primary dark:text-white">
          Algo salio mal
        </h1>
        <p className="max-w-md text-sm text-text-secondary dark:text-gray-400">
          Ocurrio un error inesperado. Intenta recargar la pagina o vuelve a intentarlo.
        </p>
        {error.digest && (
          <p className="text-xs text-text-secondary/60 dark:text-gray-500">
            Codigo: {error.digest}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-primary-dark"
      >
        <RotateCcw className="h-4 w-4" />
        Reintentar
      </button>
    </section>
  );
}
