import { BookOpen, CalendarCheck, CalendarClock, Clock, GraduationCap, Sparkles } from "lucide-react";

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

function getEstadoClase(fecha: string | null): "pasada" | "hoy" | "proxima" | null {
  if (!fecha) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const claseDate = new Date(fecha + "T12:00:00");
  claseDate.setHours(0, 0, 0, 0);
  const diff = claseDate.getTime() - hoy.getTime();
  const dias = Math.round(diff / (1000 * 60 * 60 * 24));
  if (dias === 0) return "hoy";
  if (dias < 0) return "pasada";
  return "proxima";
}

const ESTADO_BADGE: Record<string, { label: string; cls: string; Icon: typeof Sparkles }> = {
  hoy: {
    label: "Hoy",
    cls: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/60 dark:bg-emerald-900/40 dark:text-emerald-200 dark:ring-emerald-700/60",
    Icon: Sparkles,
  },
  proxima: {
    label: "Próxima",
    cls: "bg-blue-100 text-blue-700 ring-1 ring-blue-300/60 dark:bg-blue-900/40 dark:text-blue-200 dark:ring-blue-700/60",
    Icon: CalendarClock,
  },
  pasada: {
    label: "Realizada",
    cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    Icon: CalendarCheck,
  },
};

export const metadata = {
  title: "Clases",
};

export default async function AlumnoClasesPage() {
  let asignaturas;

  try {
    asignaturas = await listarClasesPorAlumno();
  } catch {
    return (
      <section className="space-y-5">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mis Clases
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

  // Aggregate stats
  const totalClases = asignaturas.reduce((sum, a) => sum + a.clases.length, 0);
  const proximasClases = asignaturas.reduce(
    (sum, a) => sum + a.clases.filter((c) => getEstadoClase(c.fecha) === "proxima").length,
    0,
  );
  const clasesHoy = asignaturas.reduce(
    (sum, a) => sum + a.clases.filter((c) => getEstadoClase(c.fecha) === "hoy").length,
    0,
  );

  return (
    <section className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="rounded-xl bg-primary/10 p-2.5 text-primary dark:bg-primary/20 dark:text-primary-light">
          <GraduationCap className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Mis Clases
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Revisa las clases programadas de tus cursos. Toca cada sesión para ver el detalle.
          </p>
        </div>
      </header>

      {asignaturas.length === 0 ? (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <BookOpen className="mx-auto h-16 w-16 text-gray-300 dark:text-gray-600" strokeWidth={1.2} />
          <h2 className="mt-4 text-lg font-semibold text-text-primary dark:text-white">
            Sin Clases Disponibles
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Cuando te matriculen en un curso con clases programadas, las verás aquí.
          </p>
        </article>
      ) : (
        <>
          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-3">
            <article className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-emerald-100/40 p-3.5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-emerald-900/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200 sm:text-xs">
                Hoy
              </p>
              <p className="mt-1 text-xl font-bold text-emerald-900 dark:text-emerald-100 sm:text-2xl">
                {clasesHoy}
              </p>
            </article>
            <article className="rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50 to-blue-100/40 p-3.5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-blue-900/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-200 sm:text-xs">
                Próximas
              </p>
              <p className="mt-1 text-xl font-bold text-blue-900 dark:text-blue-100 sm:text-2xl">
                {proximasClases}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400 sm:text-xs">
                Total
              </p>
              <p className="mt-1 text-xl font-bold text-text-primary dark:text-white sm:text-2xl">
                {totalClases}
              </p>
            </article>
          </div>

          <div className="space-y-5">
            {asignaturas.map((asig) => {
              const proxima = asig.clases.find((c) => getEstadoClase(c.fecha) === "hoy")
                ?? asig.clases.find((c) => getEstadoClase(c.fecha) === "proxima");
              return (
                <article
                  key={asig.asignaturaId}
                  className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Course header */}
                  <div className="bg-gradient-to-br from-primary/5 via-white to-white p-5 dark:from-primary/10 dark:via-gray-900 dark:to-gray-900 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold text-text-primary dark:text-white sm:text-lg">
                          {asig.asignaturaNombre}
                        </h2>
                        {asig.asignaturaCodigo && (
                          <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                            Código: {asig.asignaturaCodigo}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                        <BookOpen className="h-3.5 w-3.5" />
                        {asig.clases.length} {asig.clases.length === 1 ? "clase" : "clases"}
                      </span>
                    </div>

                    {/* Próxima clase destacada */}
                    {proxima && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-white/80 p-3 backdrop-blur dark:border-primary/40 dark:bg-gray-900/60">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
                          <CalendarClock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary dark:text-primary-light">
                            {getEstadoClase(proxima.fecha) === "hoy" ? "Clase de hoy" : "Próxima clase"}
                          </p>
                          <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                            {proxima.titulo}
                          </p>
                          <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                            {formatFecha(proxima.fecha)}
                            {proxima.horaInicio ? ` · ${proxima.horaInicio.slice(0, 5)}` : ""}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Temario */}
                    {asig.asignaturaDescripcion && (
                      <details className="group/temario mt-4 rounded-xl border border-primary/20 bg-primary/5 dark:border-primary/30 dark:bg-primary/10">
                        <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-text-primary dark:text-white">
                          <span className="flex items-center justify-between gap-2">
                            <span>📚 Temario del Curso</span>
                            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-open/temario:rotate-180">
                              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                            </svg>
                          </span>
                        </summary>
                        <p className="border-t border-primary/20 px-3 py-3 text-sm whitespace-pre-line text-text-secondary dark:border-primary/30 dark:text-gray-300">
                          {asig.asignaturaDescripcion}
                        </p>
                      </details>
                    )}
                  </div>

                  {/* Classes list */}
                  {asig.clases.length === 0 ? (
                    <div className="border-t border-gray-100 p-5 dark:border-gray-800 sm:p-6">
                      <p className="text-sm text-text-secondary dark:text-gray-400">
                        Aún no hay clases publicadas para este curso.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100 border-t border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                      {asig.clases.map((clase) => {
                        const estado = getEstadoClase(clase.fecha);
                        const badge = estado ? ESTADO_BADGE[estado] : null;
                        const Icon = badge?.Icon;
                        const isHoy = estado === "hoy";
                        return (
                          <li key={clase.claseId}>
                            <details className="group" open={isHoy}>
                              <summary className={`flex cursor-pointer items-center gap-3 px-5 py-4 transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5 sm:px-6 ${
                                isHoy ? "bg-emerald-50/40 dark:bg-emerald-950/10" : ""
                              }`}>
                                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                                  isHoy
                                    ? "bg-emerald-500 text-white"
                                    : estado === "proxima"
                                      ? "bg-primary text-white"
                                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                }`}>
                                  {clase.numeroSesion}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold text-text-primary dark:text-white">
                                    {clase.titulo}
                                  </p>
                                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary dark:text-gray-400">
                                    <span className="inline-flex items-center gap-1">
                                      <CalendarCheck className="h-3 w-3" />
                                      {formatFecha(clase.fecha)}
                                    </span>
                                    {clase.horaInicio && (
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {clase.horaInicio.slice(0, 5)}
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {badge && Icon && (
                                  <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:inline-flex ${badge.cls}`}>
                                    <Icon className="h-3 w-3" />
                                    {badge.label}
                                  </span>
                                )}

                                <svg
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                  className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180 dark:text-gray-500"
                                >
                                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                </svg>
                              </summary>

                              <div className="border-t border-gray-100 bg-gray-50/40 px-5 py-4 dark:border-gray-800 dark:bg-gray-800/20 sm:px-6">
                                {/* Badge mobile only */}
                                {badge && Icon && (
                                  <span className={`mb-3 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold sm:hidden ${badge.cls}`}>
                                    <Icon className="h-3 w-3" />
                                    {badge.label}
                                  </span>
                                )}
                                {clase.descripcion ? (
                                  <div className="space-y-1.5">
                                    <h4 className="text-sm font-semibold text-text-primary dark:text-gray-200">
                                      Descripción de la sesión
                                    </h4>
                                    <p className="whitespace-pre-line text-sm leading-relaxed text-text-secondary dark:text-gray-400">
                                      {clase.descripcion}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-sm italic text-text-secondary dark:text-gray-400">
                                    Sin descripción disponible para esta sesión.
                                  </p>
                                )}
                              </div>
                            </details>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
