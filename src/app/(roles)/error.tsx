"use client";

export default function RolesError({ reset }: { reset: () => void }) {
  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-xl font-bold text-text-primary dark:text-white">
        Ocurrió un error inesperado
      </h1>
      <p className="max-w-md text-sm text-text-secondary dark:text-gray-400">
        No fue posible cargar esta sección. Intenta nuevamente o contacta al administrador si el problema persiste.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-primary/10 px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/20 dark:text-primary-light"
      >
        Reintentar
      </button>
    </section>
  );
}
