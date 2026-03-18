export default function DocenteDashboardPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">Panel Docente</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Vista inicial con acceso a tus asignaturas y clases.
        </p>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white">Bienvenido</h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
          Aquí se mostrarán tus próximas clases y evaluaciones pendientes.
        </p>
      </article>
    </section>
  );
}