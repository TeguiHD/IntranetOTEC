import Link from "next/link";
import { BarChart3, ClipboardList, ShieldCheck, Users } from "lucide-react";

import { obtenerHistorialAcademicoAdmin } from "@/actions/historial-academico";
import { listarPeriodosParaReportes } from "@/actions/reportes";
import {
  EVALUATION_WINDOW_LABELS,
  EVALUATION_WINDOW_TONES,
} from "@/lib/evaluation-status";

type PageProps = {
  searchParams: Promise<{ periodoId?: string }>;
};

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

export default async function AdminHistorialPage({ searchParams }: PageProps) {
  const { periodoId } = await searchParams;
  const [periodos, data] = await Promise.all([
    listarPeriodosParaReportes(),
    obtenerHistorialAcademicoAdmin(periodoId),
  ]);

  if (!data) return null;

  const cards = [
    { label: "Secciones", value: data.resumen.secciones, hint: "Con actividad en historial." },
    { label: "Docentes", value: data.resumen.docentes, hint: "Con evaluaciones registradas." },
    { label: "Publicadas", value: data.resumen.publicadas, hint: "Actualmente operativas." },
    { label: "Respondidas", value: data.resumen.respondidas, hint: "Con al menos un intento." },
  ];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Historial Académico
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Vista institucional de evaluaciones, cobertura y trazabilidad por periodo y sección.
          </p>
        </div>
        <form method="GET" className="flex items-center gap-2">
          <label htmlFor="periodoId" className="text-sm text-text-secondary dark:text-gray-400">
            Periodo
          </label>
          <select
            id="periodoId"
            name="periodoId"
            defaultValue={periodoId ?? ""}
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="">Todos</option>
            {periodos.map((periodo) => (
              <option key={periodo.id} value={periodo.id}>
                {periodo.nombre}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
          >
            Filtrar
          </button>
        </form>
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
            Evaluaciones por sección
          </h2>
        </div>
        {data.evaluaciones.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay registros en el historial para el filtro actual.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-4 py-3">Evaluación</th>
                  <th className="px-4 py-3">Sección</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Cobertura</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {data.evaluaciones.map((row) => (
                  <tr key={row.evaluacionId} className="hover:bg-primary/[0.02] dark:hover:bg-primary/5">
                    <td className="px-4 py-3 align-top">
                      <p className="font-medium text-text-primary dark:text-white">{row.titulo}</p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {row.tipo} · creada {formatDate(row.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-sm text-text-primary dark:text-gray-100">{row.asignaturaNombre}</p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {row.periodoNombre ?? "Sin periodo"} · {row.docenteNombre ?? "Sin docente"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
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
                      <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                        Límite {formatDate(row.fechaLimite)}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="space-y-1 text-xs text-text-secondary dark:text-gray-400">
                        <p className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {row.totalRespondidas} respuesta(s)
                        </p>
                        <p className="flex items-center gap-1.5">
                          <ClipboardList className="h-3.5 w-3.5" />
                          {row.totalCalificadas} calificada(s)
                        </p>
                        {row.supervisionEventos > 0 ? (
                          <p className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {row.supervisionEventos} evento(s)
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={`/admin/evaluaciones?asignaturaId=${row.asignaturaId}&evaluacionId=${row.evaluacionId}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/30 dark:text-primary-light dark:hover:bg-primary/20"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Abrir gestión
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
