"use client";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold text-text-primary dark:text-white">Algo salió mal</h2>
      <p className="text-sm text-text-secondary dark:text-gray-400">Ocurrió un error inesperado. Por favor intenta de nuevo.</p>
      <button onClick={reset} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark">
        Intentar de nuevo
      </button>
    </div>
  );
}
