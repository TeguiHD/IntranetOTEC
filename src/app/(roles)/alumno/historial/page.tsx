import Link from "next/link";
import { BarChart3, CalendarDays, CheckCircle2, Clock3, FileText } from "lucide-react";

import { obtenerHistorialAcademicoAlumno } from "@/actions/historial-academico";
import {
  EVALUATION_WINDOW_LABELS,
  EVALUATION_WINDOW_TONES,
} from "@/lib/evaluation-status";

export const metadata = {
  title: "Historial Académico",
};

function formatDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function AlumnoHistorialPage() {
  const data = await obtenerHistorialAcademicoAlumno();

  if (!data) {
    return null;
  }

  const cards = [
    { label: "Respondidas", value: data.resumen.respondidas, hint: "Intentos ya registrados." },
    { label: "Pendientes", value: data.resumen.pendientes, hint: "Aún disponibles o programadas." },
    { label: "Vencidas", value: data.resumen.vencidas, hint: "Cerradas por fecha o ventana." },
    {
      label: "Promedio",
      value: data.resumen.promedioNotas?.toFixed(1) ?? "—",
      hint: "Solo con notas ya publicadas.",
    },
  ];

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">
              Historial Académico
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Tu avance en evaluaciones, estados y notas registradas.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article
            key={card.label}
            className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">{card.hint}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Evaluaciones y estados
          </h2>
        </div>
        {data.evaluaciones.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
            Todavía no tienes evaluaciones registradas en tu historial.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.evaluaciones.map((row) => (
              <div key={row.evaluacionId} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                      {row.titulo}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EVALUATION_WINDOW_TONES[row.estadoVentana]}`}
                    >
                      {EVALUATION_WINDOW_LABELS[row.estadoVentana]}
                    </span>
                    {row.respondidaPorActor ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Respondida
                      </span>
                    ) : null}
                    {row.notaActor ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                        Nota {row.notaActor}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                    {row.asignaturaNombre}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Inicio {formatDate(row.fechaInicio)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      Límite {formatDate(row.fechaLimite)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {row.totalPreguntas} pregunta(s)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/alumno/evaluaciones/${row.evaluacionId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/30 dark:text-primary-light dark:hover:bg-primary/20"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Ver detalle
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Notas docentes registradas
          </h2>
        </div>
        {data.notasDocente.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
            Aún no tienes notas docentes en este historial.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.notasDocente.map((nota) => (
              <div key={nota.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary dark:text-white">
                    {nota.asignaturaNombre}
                  </p>
                  <p className="text-xs text-text-secondary dark:text-gray-400">
                    {nota.fechaRegistro}
                  </p>
                </div>
                <span className="text-lg font-bold text-primary dark:text-primary-light">
                  {nota.nota}
                </span>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
