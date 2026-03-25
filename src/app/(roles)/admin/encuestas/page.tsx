import { ClipboardCheck, ToggleLeft, ToggleRight } from "lucide-react";

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

const ESTILO_LABEL: Record<string, string> = {
  visual: "Visual",
  auditivo: "Auditivo",
  kinestesico: "Kinestésico",
};

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

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Encuestas de Evaluación
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Habilita o deshabilita la encuesta de evaluación docente/OTEC por asignatura y consulta resultados.
        </p>
      </header>

      {/* Asignatura selector */}
      <form method="GET" className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5">
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
              className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark sm:w-auto"
            >
              Seleccionar
            </button>
          </div>
        </div>
      </form>

      {/* Enable / Disable toggle */}
      {selectedId && selectedAsig && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary dark:text-white">
                {selectedAsig.nombre}
                {selectedAsig.codigo && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                    {selectedAsig.codigo}
                  </span>
                )}
              </h2>
              <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                Estado encuesta:{" "}
                <span className={selectedAsig.habilitada ? "font-semibold text-success" : "font-semibold text-text-secondary"}>
                  {selectedAsig.habilitada ? "Habilitada" : "Deshabilitada"}
                </span>
              </p>
            </div>
            <form action={toggleEncuestaDocenteFormAction}>
              <input type="hidden" name="asignaturaId" value={selectedId} />
              <button
                type="submit"
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                  selectedAsig.habilitada
                    ? "border border-danger/30 bg-danger/5 text-danger hover:bg-danger/10"
                    : "border border-success/30 bg-success/5 text-success hover:bg-success/10"
                }`}
              >
                {selectedAsig.habilitada ? (
                  <><ToggleRight className="h-4 w-4" />Deshabilitar</>
                ) : (
                  <><ToggleLeft className="h-4 w-4" />Habilitar</>
                )}
              </button>
            </form>
          </div>
        </article>
      )}

      {/* Promedios globales */}
      {promedios && Number(promedios.totalRespuestas) > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Respuestas recibidas", value: String(promedios.totalRespuestas), color: "text-primary" },
            { label: "Promedio Docente", value: promedios.promedioDocente ? `${Number(promedios.promedioDocente).toFixed(1)} / 7` : "-", color: "text-success" },
            { label: "Promedio OTEC", value: promedios.promedioOtec ? `${Number(promedios.promedioOtec).toFixed(1)} / 7` : "-", color: "text-amber-600 dark:text-amber-400" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-xs text-text-secondary dark:text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Results table */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Resultados simplificados
          </h2>
        </div>

        {resultados.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary dark:text-gray-400">
            {selectedId ? "Aún no hay respuestas para esta asignatura." : "Selecciona una asignatura para ver resultados."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  <th className="px-3 py-2.5">Alumno</th>
                  <th className="px-3 py-2.5">RUT</th>
                  <th className="px-3 py-2.5">Prom. Docente</th>
                  <th className="px-3 py-2.5">Prom. OTEC</th>
                  <th className="px-3 py-2.5">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {resultados.map((r) => (
                  <tr key={`${r.alumnoRut}-${selectedId}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2.5 font-medium text-text-primary dark:text-gray-100">
                      {r.alumnoNombre} {r.alumnoApellido}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400 font-mono text-xs">
                      {formatRut(r.alumnoRut)}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.promedioDocente ? (
                        <span className="font-semibold text-success">{Number(r.promedioDocente).toFixed(1)}</span>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.promedioOtec ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">{Number(r.promedioOtec).toFixed(1)}</span>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary dark:text-gray-400">
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-CL") : "-"}
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
