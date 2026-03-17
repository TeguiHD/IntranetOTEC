export default function AlumnoDashboardPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-white">Dashboard Alumno</h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Vista inicial con resumen académico y accesos a tus cursos.
        </p>
      </header>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-white">Bienvenido</h2>
        <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
          Aquí verás tu progreso, asistencia y evaluaciones disponibles.
        </p>
      </article>
    </section>
  );
}