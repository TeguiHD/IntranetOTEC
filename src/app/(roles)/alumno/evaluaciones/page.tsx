import { CalendarDays, ClipboardList } from "lucide-react";
import Link from "next/link";

import { listarEvaluacionesAlumno } from "@/actions/evaluaciones";
import {
  EVALUATION_WINDOW_LABELS,
  EVALUATION_WINDOW_TONES,
} from "@/lib/evaluation-status";

const TIPO_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

const TIPO_COLORS: Record<string, string> = {
  formulario: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  tarea: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  examen: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  proyecto: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

export const metadata = {
  title: "Mis Evaluaciones",
};

export default async function AlumnoEvaluacionesPage() {
  let evaluaciones;

  try {
    evaluaciones = await listarEvaluacionesAlumno();
  } catch {
    return (
      <section className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
            Mis Evaluaciones
          </h1>
        </header>
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            No fue posible cargar las evaluaciones. Intenta recargar la página.
          </p>
        </article>
      </section>
    );
  }

  const upcomingCount = evaluaciones.filter(
    (evaluacion) => evaluacion.estadoVentana === "programada",
  ).length;
  const overdueCount = evaluaciones.filter(
    (evaluacion) => evaluacion.estadoVentana === "vencida",
  ).length;
  const availableCount = evaluaciones.filter(
    (evaluacion) => evaluacion.estadoVentana === "disponible",
  ).length;
  const answeredCount = evaluaciones.filter((evaluacion) => evaluacion.respondidaPorAlumno).length;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-white">
          Mis Evaluaciones
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-300">
          Evaluaciones disponibles en tus cursos matriculados.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-4">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Disponibles
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{availableCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Puedes responderlas ahora mismo.
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Próximas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{upcomingCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Quedan preparadas, pero aún no abren.
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Vencidas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{overdueCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Sirven como historial, no admiten nuevos envíos.
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Respondidas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{answeredCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Ya forman parte de tu historial académico.
          </p>
        </article>
      </div>

      {evaluaciones.length === 0 ? (
        <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-3 text-center">
            <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-text-secondary dark:text-gray-400">
              No tienes evaluaciones disponibles en este momento.
            </p>
          </div>
        </article>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {evaluaciones.map((ev) => {
            const isUpcoming = ev.estadoVentana === "programada";
            const isOverdue = ev.estadoVentana === "vencida";
            return (
              <article
                key={ev.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text-primary dark:text-gray-100">
                      {ev.titulo}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-text-secondary dark:text-gray-400">
                      {ev.asignaturaNombre}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      TIPO_COLORS[ev.tipo] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {TIPO_LABELS[ev.tipo] ?? ev.tipo}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      EVALUATION_WINDOW_TONES[ev.estadoVentana]
                    }`}
                  >
                    {EVALUATION_WINDOW_LABELS[ev.estadoVentana]}
                  </span>
                  {ev.respondidaPorAlumno ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                      Respondida
                    </span>
                  ) : null}
                  {ev.notaAlumno ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Nota {ev.notaAlumno}
                    </span>
                  ) : null}
                </div>

                {isUpcoming && ev.fechaInicio && (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-100">
                    Disponible desde{" "}
                    {new Date(ev.fechaInicio).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                )}

                {ev.fechaLimite && (
                  <div
                    className={`mt-3 flex items-center gap-1.5 text-xs ${
                      isOverdue ? "text-danger" : "text-text-secondary dark:text-gray-400"
                    }`}
                  >
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {isOverdue ? "Venció el " : "Límite: "}
                      {new Date(ev.fechaLimite).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                <div className="mt-4">
                  <Link
                    href={`/alumno/evaluaciones/${ev.id}`}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                      isOverdue || isUpcoming
                        ? "border border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        : "bg-primary text-white hover:bg-primary-dark active:scale-[0.98]"
                    }`}
                  >
                    {isUpcoming
                      ? "Aún no disponible"
                      : ev.respondidaPorAlumno || isOverdue
                        ? "Ver historial"
                        : "Responder"}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
