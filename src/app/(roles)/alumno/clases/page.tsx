import { listarClasesPorAlumno } from "@/actions/alumno-clases";

function formatFecha(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value + "T12:00:00");
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default async function AlumnoClasesPage() {
  let asignaturas;

  try {
    asignaturas = await listarClasesPorAlumno();
  } catch {
    return (
      <section className="space-y-5">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Clases
          </h1>
        </header>
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            No fue posible cargar las clases. Intenta recargar la página.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Clases
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Revisa las clases programadas de tus cursos. Toca un curso para ver el temario y detalle de cada sesión.
        </p>
      </header>

      {asignaturas.length === 0 ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="1.2"
            className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              stroke="currentColor"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-text-primary dark:text-white">
            Sin Clases Disponibles
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Cuando te matriculen en un curso con clases programadas, las verás aquí.
          </p>
        </article>
      ) : (
        <div className="space-y-6">
          {asignaturas.map((asig) => (
            <article
              key={asig.asignaturaId}
              className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              {/* Course header */}
              <div className="border-b border-gray-100 p-5 dark:border-gray-800 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                      {asig.asignaturaNombre}
                    </h2>
                    {asig.asignaturaCodigo && (
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        Código: {asig.asignaturaCodigo}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                    {asig.clases.length} {asig.clases.length === 1 ? "clase" : "clases"}
                  </span>
                </div>

                {/* Temario / Descripción */}
                {asig.asignaturaDescripcion && (
                  <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                      Temario del Curso
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-sm text-text-secondary dark:text-gray-300">
                      {asig.asignaturaDescripcion}
                    </p>
                  </div>
                )}
              </div>

              {/* Classes list */}
              {asig.clases.length === 0 ? (
                <div className="p-5 sm:p-6">
                  <p className="text-sm text-text-secondary dark:text-gray-400">
                    Aún no hay clases publicadas para este curso.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {asig.clases.map((clase) => (
                    <details
                      key={clase.claseId}
                      className="group"
                    >
                      <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5 sm:px-6">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                              {clase.numeroSesion}
                            </span>
                            <p className="truncate font-medium text-text-primary dark:text-white">
                              {clase.titulo}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="text-sm text-text-secondary dark:text-gray-400">
                            {formatFecha(clase.fecha)}
                          </span>
                          <svg
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </summary>
                      <div className="border-t border-gray-100 bg-gray-50/30 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/20 sm:px-6">
                        {clase.descripcion ? (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-text-primary dark:text-gray-200">
                              Descripción de la Sesión
                            </h4>
                            <p className="whitespace-pre-line text-sm text-text-secondary dark:text-gray-400">
                              {clase.descripcion}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm italic text-text-secondary dark:text-gray-400">
                            Sin descripción disponible para esta sesión.
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary dark:text-gray-400">
                          <span>
                            📅 {formatFecha(clase.fecha)}
                          </span>
                          {clase.horaInicio && (
                            <span>
                              🕐 {clase.horaInicio.slice(0, 5)}
                            </span>
                          )}
                          <span>
                            📋 Sesión {clase.numeroSesion}
                          </span>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
