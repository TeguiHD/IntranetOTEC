import Link from "next/link";

import { ClipboardCheck, ClipboardList, TrendingUp, Users } from "lucide-react";

import { listarPeriodosParaReportes, obtenerKpisPeriodo } from "@/actions/reportes";
import { PeriodoCursoSeccionPicker } from "@/components/shared/PeriodoCursoSeccionPicker";

type PageProps = {
  searchParams: Promise<{ periodoId?: string }>;
};

export default async function AdminReportesPage({ searchParams }: PageProps) {
  const { periodoId } = await searchParams;

  const [periodos, kpis] = await Promise.all([
    listarPeriodosParaReportes(),
    obtenerKpisPeriodo(periodoId),
  ]);

  const CARDS = [
    {
      href: `/admin/reportes/rendimiento${periodoId ? `?periodoId=${periodoId}` : ""}`,
      Icon: TrendingUp,
      title: "Rendimiento Académico",
      desc: "Promedios de notas por sección, docente y periodo.",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      href: `/admin/reportes/retencion${periodoId ? `?periodoId=${periodoId}` : ""}`,
      Icon: Users,
      title: "Retención / Deserción",
      desc: "Alumnos activos, egresados, retirados y desertores por sección.",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      href: `/admin/reportes/asistencia${periodoId ? `?periodoId=${periodoId}` : ""}`,
      Icon: ClipboardCheck,
      title: "Asistencia",
      desc: "Tasas de presencia, ausencia y tardanzas por sección.",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      href: `/admin/reportes/notas${periodoId ? `?periodoId=${periodoId}` : ""}`,
      Icon: ClipboardList,
      title: "Distribución de Notas",
      desc: "Histograma de notas agrupadas por rangos.",
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
  ];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Reportes y Estadísticas
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Resumen general del rendimiento académico de la OTEC.
          </p>
        </div>

        {periodos.length > 0 && (
          <form method="GET" className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px]">
              <PeriodoCursoSeccionPicker
                asForm={false}
                autoSubmit={false}
                layout="stack"
                periodos={periodos.map((p) => ({ id: p.id, label: p.nombre }))}
                selected={{ periodoId: periodoId ?? undefined }}
                labels={{ periodo: "Periodo" }}
                emptyLabels={{ periodo: "Todos los periodos" }}
                allowClear={{ periodo: true }}
              />
            </div>
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark"
            >
              Filtrar
            </button>
          </form>
        )}
      </header>

      {/* KPIs */}
      {kpis && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Secciones activas", value: kpis.totalSecciones },
            { label: "Matrículas activas", value: kpis.totalAlumnos },
            { label: "Promedio general", value: kpis.promedioNotas ?? "—" },
          ].map(({ label, value }) => (
            <article key={label} className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-text-primary dark:text-white">{value}</p>
            </article>
          ))}
        </div>
      )}

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map(({ href, Icon, title, desc, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
          >
            <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
            <h2 className="text-base font-semibold text-text-primary group-hover:text-primary dark:text-white dark:group-hover:text-primary-light">
              {title}
            </h2>
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">{desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
