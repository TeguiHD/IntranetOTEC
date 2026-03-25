import { BarChart3, ClipboardCheck, Star, ToggleLeft, ToggleRight, Users } from "lucide-react";

import {
  listarAsignaturasConConfigEncuesta,
  listarResultadosEncuesta,
  obtenerPromediosGlobalesEncuesta,
  toggleEncuestaDocenteFormAction,
} from "@/actions/encuestas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  toggle_ok: { tone: "success", text: "Estado de encuesta actualizado." },
  encuesta_enabled: { tone: "success", text: "Encuesta habilitada." },
  encuesta_disabled: { tone: "success", text: "Encuesta deshabilitada." },
  error: { tone: "error", text: "No fue posible actualizar el estado." },
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  searchParams?: Promise<{ state?: string; asignaturaId?: string }>;
};

const formatRut = (rut: string | null): string => {
  if (!rut) return "-";
  return rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut);
};

export const metadata = { title: "Encuestas Docente" };

export default async function AdminEncuestasPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; asignaturaId?: string }));
  const asignaturas = await listarAsignaturasConConfigEncuesta();

  const selectedIdRaw = typeof params?.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedId =
    selectedIdRaw && UUID_REGEX.test(selectedIdRaw)
      ? selectedIdRaw
      : asignaturas[0]?.id;

  const [resultados, promedios] = await Promise.all([
    selectedId ? listarResultadosEncuesta(selectedId) : Promise.resolve([]),
    selectedId ? obtenerPromediosGlobalesEncuesta(selectedId) : Promise.resolve(null),
  ]);

  const selectedAsig = asignaturas.find((a) => a.id === selectedId);
  const totalRespuestas = promedios ? Number(promedios.totalRespuestas) : 0;

  return (
    <section className="space-y-6">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <Star className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Encuestas de Evaluación
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Gestiona las encuestas docente/OTEC por asignatura y consulta los resultados.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: main content */}
        <div className="space-y-5">
          {/* Selector + Toggle */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <form method="GET" className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <label htmlFor="enc-asig" className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Asignatura
                  </label>
                  <select
                    id="enc-asig"
                    name="asignaturaId"
                    defaultValue={selectedId}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    {asignaturas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.codigo ? `[${a.codigo}] ` : ""}{a.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98] sm:w-auto"
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            </form>

            {/* Toggle card */}
            {selectedId && selectedAsig && (
              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-800 dark:bg-gray-800/40">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text-primary dark:text-white">
                    {selectedAsig.nombre}
                    {selectedAsig.codigo && (
                      <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary dark:bg-primary/20 dark:text-primary-light">
                        {selectedAsig.codigo}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                    Estado encuesta:{" "}
                    <span className={selectedAsig.habilitada ? "font-bold text-success" : "font-bold text-text-muted"}>
                      {selectedAsig.habilitada ? "Habilitada" : "Deshabilitada"}
                    </span>
                  </p>
                </div>
                <form action={toggleEncuestaDocenteFormAction}>
                  <input type="hidden" name="asignaturaId" value={selectedId} />
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97] ${
                      selectedAsig.habilitada
                        ? "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
                        : "border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
                    }`}
                  >
                    {selectedAsig.habilitada ? (
                      <><ToggleRight className="h-5 w-5" /> Deshabilitar</>
                    ) : (
                      <><ToggleLeft className="h-5 w-5" /> Habilitar</>
                    )}
                  </button>
                </form>
              </div>
            )}
          </article>

          {/* Results table */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
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
                <ClipboardCheck className="h-10 w-10 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-secondary dark:text-gray-400">
                  {selectedId ? "Aún no hay respuestas para esta asignatura." : "Selecciona una asignatura para ver resultados."}
                </p>
                <p className="text-xs text-text-muted dark:text-gray-500">
                  Los resultados aparecerán cuando los alumnos completen la encuesta.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      <th className="px-3 py-2.5">Alumno</th>
                      <th className="px-3 py-2.5">RUT</th>
                      <th className="px-3 py-2.5 text-center">Nota Docente</th>
                      <th className="px-3 py-2.5 text-center">Nota OTEC</th>
                      <th className="px-3 py-2.5">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                    {resultados.map((r) => (
                      <tr key={`${r.alumnoRut}-${selectedId}`} className="transition-colors hover:bg-primary/[0.03] dark:hover:bg-primary/5">
                        <td className="px-3 py-3">
                          <p className="font-medium text-text-primary dark:text-gray-100">
                            {r.alumnoNombre} {r.alumnoApellido}
                          </p>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-text-secondary dark:text-gray-400">
                          {formatRut(r.alumnoRut)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.promedioDocente ? (
                            <span className="inline-flex h-8 min-w-[3rem] items-center justify-center rounded-lg bg-emerald-50 font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                              {Number(r.promedioDocente).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {r.promedioOtec ? (
                            <span className="inline-flex h-8 min-w-[3rem] items-center justify-center rounded-lg bg-amber-50 font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                              {Number(r.promedioOtec).toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-text-muted">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs text-text-secondary dark:text-gray-400">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-CL") : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>

        {/* Right: stats sidebar */}
        <aside className="space-y-4">
          {/* Stat cards */}
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-text-primary dark:text-white">Resumen Global</h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-primary/5 px-4 py-3 dark:bg-primary/10">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-text-secondary dark:text-gray-400">Respuestas</span>
                </div>
                <span className="text-lg font-bold text-primary">{totalRespuestas}</span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/20">
                <div>
                  <p className="text-xs font-medium text-text-secondary dark:text-gray-400">Promedio Docente</p>
                  <p className="text-[10px] text-text-muted dark:text-gray-500">Escala 1-7</p>
                </div>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {promedios?.promedioDocente ? Number(promedios.promedioDocente).toFixed(1) : "-"}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
                <div>
                  <p className="text-xs font-medium text-text-secondary dark:text-gray-400">Promedio OTEC</p>
                  <p className="text-[10px] text-text-muted dark:text-gray-500">Escala 1-7</p>
                </div>
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {promedios?.promedioOtec ? Number(promedios.promedioOtec).toFixed(1) : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Info card */}
          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 dark:border-primary/20 dark:bg-primary/10">
            <p className="text-xs leading-relaxed text-text-secondary dark:text-gray-400">
              <strong className="text-text-primary dark:text-white">Evaluación Docente y OTEC</strong><br />
              12 preguntas (6 docente + 6 OTEC) con escala Likert 1-7.
              Las encuestas se habilitan automáticamente al finalizar cada curso.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
