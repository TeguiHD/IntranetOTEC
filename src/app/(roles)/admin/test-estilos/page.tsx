import { Brain, Eye, Headphones, Hand, Users } from "lucide-react";

import { listarResultadosTestEstilos } from "@/actions/encuestas";
import { DonutChart } from "@/components/charts/DonutChart";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { StatCard } from "@/components/charts/StatCard";
import { formatearRut } from "@/lib/rut";

const ESTILO_CONFIG: Record<string, { label: string; badge: string; Icon: typeof Eye; color: string; fillColor: string; strokeHex: string }> = {
  visual: {
    label: "Visual",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    Icon: Eye,
    color: "bg-blue-500",
    fillColor: "fill-blue-500",
    strokeHex: "#3B82F6",
  },
  auditivo: {
    label: "Auditivo",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    Icon: Headphones,
    color: "bg-emerald-500",
    fillColor: "fill-emerald-500",
    strokeHex: "#10B981",
  },
  kinestesico: {
    label: "Kinestésico",
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
    Icon: Hand,
    color: "bg-violet-500",
    fillColor: "fill-violet-500",
    strokeHex: "#8B5CF6",
  },
};

const formatRut = (rut: string | null): string => {
  if (!rut) return "-";
  return rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut);
};

export const metadata = { title: "Test de Estilos de Aprendizaje" };

export default async function AdminTestEstilosPage() {
  const resultados = await listarResultadosTestEstilos();

  // Aggregate stats
  const totals = { visual: 0, auditivo: 0, kinestesico: 0 };
  for (const r of resultados) {
    if (r.estiloPreferente && r.estiloPreferente in totals) {
      totals[r.estiloPreferente as keyof typeof totals]++;
    }
  }
  const uniqueAlumnos = new Set(resultados.map((r) => r.alumnoRut)).size;

  // Average scores
  const avgVisual = resultados.length > 0
    ? Math.round(resultados.reduce((s, r) => s + (Number(r.puntajeVisual) || 0), 0) / resultados.length * 10) / 10
    : 0;
  const avgAuditivo = resultados.length > 0
    ? Math.round(resultados.reduce((s, r) => s + (Number(r.puntajeAuditivo) || 0), 0) / resultados.length * 10) / 10
    : 0;
  const avgKinestesico = resultados.length > 0
    ? Math.round(resultados.reduce((s, r) => s + (Number(r.puntajeKinestesico) || 0), 0) / resultados.length * 10) / 10
    : 0;

  // Dominant style
  const dominantStyle = totals.visual >= totals.auditivo && totals.visual >= totals.kinestesico
    ? "visual"
    : totals.auditivo >= totals.kinestesico
      ? "auditivo"
      : "kinestesico";

  return (
    <section className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
          <Brain className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Test de Estilos de Aprendizaje
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Resultados del test completados por los alumnos (máximo 2 intentos por alumno).
          </p>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Alumnos evaluados"
          value={uniqueAlumnos}
          sublabel={`${resultados.length} respuestas totales`}
          Icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        {(["visual", "auditivo", "kinestesico"] as const).map((estilo) => {
          const config = ESTILO_CONFIG[estilo];
          const count = totals[estilo];
          return (
            <StatCard
              key={estilo}
              label={config.label}
              value={count}
              sublabel={resultados.length > 0 ? `${Math.round((count / resultados.length) * 100)}% del total` : "0%"}
              Icon={config.Icon}
              iconColor={`text-${estilo === "visual" ? "blue" : estilo === "auditivo" ? "emerald" : "violet"}-600`}
              iconBg={`bg-${estilo === "visual" ? "blue" : estilo === "auditivo" ? "emerald" : "violet"}-100 dark:bg-${estilo === "visual" ? "blue" : estilo === "auditivo" ? "emerald" : "violet"}-900/30`}
            />
          );
        })}
      </div>

      {/* Charts row */}
      {resultados.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          {/* Donut distribution */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-semibold text-text-primary dark:text-white">Distribución de Estilos</h3>
            <DonutChart
              segments={[
                { label: "Visual", value: totals.visual, color: "fill-blue-500", strokeColor: "#3B82F6" },
                { label: "Auditivo", value: totals.auditivo, color: "fill-emerald-500", strokeColor: "#10B981" },
                { label: "Kinestésico", value: totals.kinestesico, color: "fill-violet-500", strokeColor: "#8B5CF6" },
              ]}
              size={130}
              strokeWidth={18}
              centerValue={`${resultados.length}`}
              centerLabel="Respuestas"
            />
            <div className="space-y-1 text-[10px]">
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Visual: {totals.visual}
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Auditivo: {totals.auditivo}
              </div>
              <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400">
                <span className="h-2 w-2 rounded-full bg-violet-500" /> Kinestésico: {totals.kinestesico}
              </div>
            </div>
          </div>

          {/* Bars + averages */}
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-text-primary dark:text-white">Proporción por estilo</h3>
              <HorizontalBar
                items={[
                  { label: "Visual", value: totals.visual, color: "bg-blue-500" },
                  { label: "Auditivo", value: totals.auditivo, color: "bg-emerald-500" },
                  { label: "Kinestésico", value: totals.kinestesico, color: "bg-violet-500" },
                ]}
                mode="percent"
              />
              <p className="mt-3 text-xs text-text-secondary dark:text-gray-400">
                Estilo predominante: <strong className={ESTILO_CONFIG[dominantStyle].badge.split(" ")[1]}>{ESTILO_CONFIG[dominantStyle].label}</strong>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-3 text-sm font-semibold text-text-primary dark:text-white">Puntaje promedio por dimensión</h3>
              <HorizontalBar
                items={[
                  { label: `Visual (${avgVisual})`, value: avgVisual, color: "bg-blue-500" },
                  { label: `Auditivo (${avgAuditivo})`, value: avgAuditivo, color: "bg-emerald-500" },
                  { label: `Kinestésico (${avgKinestesico})`, value: avgKinestesico, color: "bg-violet-500" },
                ]}
              />
            </div>
          </div>
        </div>
      )}

      {/* Results table */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Detalle por Alumno
          </h2>
          {resultados.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {resultados.length}
            </span>
          )}
        </div>

        {resultados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Brain className="h-10 w-10 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
            <p className="text-sm font-medium text-text-secondary dark:text-gray-400">
              Aún no hay alumnos que hayan completado el test.
            </p>
            <p className="text-xs text-text-muted dark:text-gray-500">
              Los resultados aparecerán cuando los alumnos completen el test en su portal.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="space-y-3 sm:hidden">
              {resultados.map((r) => {
                const config = r.estiloPreferente ? ESTILO_CONFIG[r.estiloPreferente] : null;
                return (
                  <div key={`${r.alumnoRut}-${r.intento}`} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-text-primary dark:text-white">{r.alumnoNombre} {r.alumnoApellido}</p>
                        <p className="font-mono text-[11px] text-text-muted dark:text-gray-500">{formatRut(r.alumnoRut)} · Intento {r.intento}</p>
                      </div>
                      {config && (
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${config.badge}`}>
                          {config.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex gap-3">
                      <div className="flex-1 rounded-lg bg-blue-50 p-2 text-center dark:bg-blue-950/20">
                        <p className="text-xs text-blue-600 dark:text-blue-400">Visual</p>
                        <p className="font-bold text-blue-700 dark:text-blue-300">{r.puntajeVisual ?? "-"}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-emerald-50 p-2 text-center dark:bg-emerald-950/20">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400">Auditivo</p>
                        <p className="font-bold text-emerald-700 dark:text-emerald-300">{r.puntajeAuditivo ?? "-"}</p>
                      </div>
                      <div className="flex-1 rounded-lg bg-purple-50 p-2 text-center dark:bg-purple-950/20">
                        <p className="text-xs text-purple-600 dark:text-purple-400">Kinest.</p>
                        <p className="font-bold text-purple-700 dark:text-purple-300">{r.puntajeKinestesico ?? "-"}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Alumno</th>
                    <th className="px-3 py-2.5">RUT</th>
                    <th className="px-3 py-2.5 text-center">Int.</th>
                    <th className="px-3 py-2.5 text-center">
                      <span className="text-blue-600 dark:text-blue-400">Visual</span>
                    </th>
                    <th className="px-3 py-2.5 text-center">
                      <span className="text-emerald-600 dark:text-emerald-400">Auditivo</span>
                    </th>
                    <th className="px-3 py-2.5 text-center">
                      <span className="text-purple-600 dark:text-purple-400">Kinestésico</span>
                    </th>
                    <th className="px-3 py-2.5">Estilo preferente</th>
                    <th className="px-3 py-2.5">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {resultados.map((r) => {
                    const config = r.estiloPreferente ? ESTILO_CONFIG[r.estiloPreferente] : null;
                    return (
                      <tr key={`${r.alumnoRut}-${r.intento}`} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                        <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                          {r.alumnoNombre} {r.alumnoApellido}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-text-secondary dark:text-gray-400">
                          {formatRut(r.alumnoRut)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-text-secondary dark:bg-gray-800 dark:text-gray-400">
                            {r.intento}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-blue-50 font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            {r.puntajeVisual ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                            {r.puntajeAuditivo ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-lg bg-purple-50 font-bold text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                            {r.puntajeKinestesico ?? "-"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {config ? (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${config.badge}`}>
                              <config.Icon className="h-3 w-3" />
                              {config.label}
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-text-secondary dark:text-gray-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-CL") : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
