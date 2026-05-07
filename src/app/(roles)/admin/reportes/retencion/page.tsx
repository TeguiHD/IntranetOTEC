import { listarPeriodosParaReportes, reporteRetencion } from "@/actions/reportes";

type PageProps = {
  searchParams: Promise<{ periodoId?: string }>;
};

export default async function ReporteRetencionPage({ searchParams }: PageProps) {
  const { periodoId } = await searchParams;
  const exportQs = new URLSearchParams({ tipo: "retencion" });
  if (periodoId) exportQs.set("periodoId", periodoId);
  const exportBase = `/api/reportes/export?${exportQs.toString()}`;

  const [periodos, filas] = await Promise.all([
    listarPeriodosParaReportes(),
    reporteRetencion(periodoId),
  ]);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Retención / Deserción
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Estado de los alumnos matriculados por sección.
          </p>
        </div>

        {periodos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`${exportBase}&formato=xlsx`}
              className="h-10 rounded-xl border border-emerald-300 px-3 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              Exportar Excel
            </a>
            <a
              href={`${exportBase}&formato=pdf`}
              className="h-10 rounded-xl border border-blue-300 px-3 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30"
            >
              Exportar PDF
            </a>
            <form method="GET" className="flex items-center gap-2">
            <select
              name="periodoId"
              defaultValue={periodoId ?? ""}
              className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-primary focus:outline-0 focus-visible:ring-2 focus-visible:ring-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos los periodos</option>
              {periodos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark">
              Filtrar
            </button>
            </form>
          </div>
        )}
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {filas.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay datos disponibles.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-4 py-3">Sección</th>
                  <th className="px-4 py-3">Periodo</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Activos</th>
                  <th className="px-4 py-3 text-right">Egresados</th>
                  <th className="px-4 py-3 text-right">Retirados</th>
                  <th className="px-4 py-3 text-right">Retención %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {filas.map((f) => {
                  const retencion = f.total > 0
                    ? (((f.activos + f.egresados) / f.total) * 100).toFixed(1)
                    : "—";
                  const retencionNum = f.total > 0 ? (f.activos + f.egresados) / f.total * 100 : null;
                  const colorRetencion =
                    retencionNum === null
                      ? ""
                      : retencionNum >= 80
                        ? "text-emerald-600 dark:text-emerald-400"
                        : retencionNum >= 60
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400";

                  return (
                    <tr key={f.asignaturaId} className="hover:bg-primary/[0.02] dark:hover:bg-primary/5">
                      <td className="px-4 py-3 font-medium text-text-primary dark:text-gray-100">{f.asignaturaNombre}</td>
                      <td className="px-4 py-3 text-text-secondary dark:text-gray-400">{f.periodoNombre ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-text-secondary dark:text-gray-400">{f.total}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400">{f.activos}</td>
                      <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400">{f.egresados}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">{f.retirados}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${colorRetencion}`}>{retencion}{retencionNum !== null ? "%" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
