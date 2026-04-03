import { listarPeriodosParaReportes, reporteDistribucionNotas } from "@/actions/reportes";
import { getDb } from "@/db";
import { asignaturas } from "@/db/schema";
import { isNull } from "drizzle-orm";

type PageProps = {
  searchParams: Promise<{ asignaturaId?: string; periodoId?: string }>;
};

export default async function ReporteNotasPage({ searchParams }: PageProps) {
  const { asignaturaId, periodoId } = await searchParams;
  const exportQs = new URLSearchParams({ tipo: "notas" });
  if (periodoId) exportQs.set("periodoId", periodoId);
  if (asignaturaId) exportQs.set("asignaturaId", asignaturaId);
  const exportBase = `/api/reportes/export?${exportQs.toString()}`;

  const db = getDb();
  const [periodos, todasAsignaturas, filas] = await Promise.all([
    listarPeriodosParaReportes(),
    db.select({ id: asignaturas.id, nombre: asignaturas.nombre })
      .from(asignaturas)
      .where(isNull(asignaturas.eliminadoAt))
      .orderBy(asignaturas.nombre),
    reporteDistribucionNotas(asignaturaId, periodoId),
  ]);

  const total = filas.reduce((acc, f) => acc + f.cantidad, 0);

  const RANGOS_ORDER = ["6.0-7.0", "5.0-5.9", "4.0-4.9", "3.0-3.9", "1.0-2.9"];
  const RANGO_COLORS: Record<string, string> = {
    "6.0-7.0": "bg-emerald-500",
    "5.0-5.9": "bg-blue-500",
    "4.0-4.9": "bg-amber-500",
    "3.0-3.9": "bg-orange-500",
    "1.0-2.9": "bg-red-500",
  };

  const filasOrdenadas = RANGOS_ORDER.map((rango) => {
    const fila = filas.find((f) => f.rango.trim() === rango);
    return { rango, cantidad: fila?.cantidad ?? 0 };
  });

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Distribución de Notas
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Histograma de notas por rango.
          </p>
        </div>

        {todasAsignaturas.length > 0 && (
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
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todos los periodos</option>
                {periodos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <select
                name="asignaturaId"
                defaultValue={asignaturaId ?? ""}
                className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Todas las secciones</option>
                {todasAsignaturas.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              <button type="submit" className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-white hover:bg-primary-dark">
                Filtrar
              </button>
            </form>
          </div>
        )}
      </header>

      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        {total === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay notas registradas.
          </p>
        ) : (
          <div className="space-y-3">
            {filasOrdenadas.map(({ rango, cantidad }) => {
              const pct = total > 0 ? (cantidad / total) * 100 : 0;
              const barColor = RANGO_COLORS[rango] ?? "bg-gray-400";
              return (
                <div key={rango} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-sm font-medium text-text-primary dark:text-gray-200 tabular-nums">
                    {rango}
                  </span>
                  <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" style={{ height: 20 }}>
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                      role="progressbar"
                      aria-valuenow={Math.round(pct)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Rango ${rango}: ${cantidad} notas (${pct.toFixed(1)}%)`}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-sm text-text-secondary dark:text-gray-400 tabular-nums">
                    {cantidad} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
            <p className="pt-2 text-right text-xs text-text-muted dark:text-gray-500">
              Total de notas: {total}
            </p>
          </div>
        )}
      </article>
    </section>
  );
}
