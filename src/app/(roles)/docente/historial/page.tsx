import Link from "next/link";
import { BarChart3, ClipboardCheck, FileText, ShieldCheck, TimerReset } from "lucide-react";

import { obtenerHistorialAcademicoDocente } from "@/actions/historial-academico";
import {
  EVALUATION_WINDOW_LABELS,
  EVALUATION_WINDOW_TONES,
} from "@/lib/evaluation-status";

export const metadata = {
  title: "Historial Académico",
};

function formatDateTime(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function DocenteHistorialPage() {
  const data = await obtenerHistorialAcademicoDocente();
  if (!data) return null;

  const cards = [
    { label: "Secciones", value: data.resumen.secciones, hint: "Con historial de evaluaciones." },
    { label: "Publicadas", value: data.resumen.publicadas, hint: "Visibles para alumnos." },
    { label: "Pend. corrección", value: data.resumen.pendientesCorreccion, hint: "Respuestas sin nota aún." },
    { label: "Supervisadas", value: data.resumen.supervisionActiva, hint: "Con trazabilidad activa." },
  ];

  return (
    <section className="space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-white" />
          <div>
            <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">
              Historial Docente
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Seguimiento de evaluaciones, respuestas y carga de corrección por tus secciones.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{card.value}</p>
            <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">{card.hint}</p>
          </article>
        ))}
      </div>

      <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Cola académica de evaluaciones
          </h2>
        </div>
        {data.evaluaciones.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay evaluaciones registradas en tus secciones aún.
          </p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.evaluaciones.map((row) => (
              <div key={row.evaluacionId} className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                      {row.titulo}
                    </h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EVALUATION_WINDOW_TONES[row.estadoVentana]}`}>
                      {EVALUATION_WINDOW_LABELS[row.estadoVentana]}
                    </span>
                    {row.modoSupervision ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Supervisada
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                    {row.asignaturaNombre}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary dark:text-gray-400">
                    <span className="flex items-center gap-1.5">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      {row.totalRespondidas} respuesta(s)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      {row.totalCalificadas} calificada(s)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <TimerReset className="h-3.5 w-3.5" />
                      Límite {formatDateTime(row.fechaLimite)}
                    </span>
                    {row.supervisionEventos > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {row.supervisionEventos} evento(s) de supervisión
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/docente/asignaturas/${row.asignaturaId}/evaluaciones?evaluacionId=${row.evaluacionId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/30 dark:text-primary-light dark:hover:bg-primary/20"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Maquetar
                  </Link>
                  <Link
                    href={`/docente/asignaturas/${row.asignaturaId}/evaluaciones?evaluacionId=${row.evaluacionId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Ver resultados
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
