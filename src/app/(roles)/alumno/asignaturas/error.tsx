"use client";

export default function AlumnoAsignaturasError({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
          Mis Cursos
        </h1>
      </header>
      <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
        <p className="text-sm font-medium text-danger">
          No fue posible cargar tus cursos en este momento.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-3 rounded-xl bg-danger/10 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/20"
        >
          Reintentar
        </button>
      </article>
    </section>
  );
}
