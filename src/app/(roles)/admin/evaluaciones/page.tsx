import { ClipboardList, Eye, Plus, Trash2 } from "lucide-react";

import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import {
  crearEvaluacionFormAction,
  eliminarEvaluacionFormAction,
  listarEvaluacionesByAsignatura,
  publicarEvaluacionFormAction,
} from "@/actions/evaluaciones";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  evaluacion_created: { tone: "success", text: "Evaluación creada correctamente." },
  evaluacion_published: { tone: "success", text: "Evaluación publicada correctamente." },
  already_published: { tone: "success", text: "La evaluación ya estaba publicada." },
  evaluacion_deleted: { tone: "success", text: "Evaluación eliminada correctamente." },
  already_deleted: { tone: "success", text: "La evaluación ya había sido eliminada." },
  pregunta_created: { tone: "success", text: "Pregunta agregada correctamente." },
  error: {
    tone: "error",
    text: "No fue posible completar la acción. Revisa los datos e intenta nuevamente.",
  },
};

const TIPO_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

type AdminEvaluacionesPageProps = {
  searchParams?: Promise<{
    state?: string;
    asignaturaId?: string;
  }>;
};

export default async function AdminEvaluacionesPage({
  searchParams,
}: AdminEvaluacionesPageProps) {
  const params = await (searchParams ??
    Promise.resolve({} as { state?: string; asignaturaId?: string }));

  const asignaturas = await listarAsignaturasAdmin(
    { limit: 100, offset: 0 },
    { incluirArchivadas: false },
  );

  const selectedAsignaturaIdRaw =
    typeof params?.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedAsignaturaId =
    selectedAsignaturaIdRaw && UUID_REGEX.test(selectedAsignaturaIdRaw)
      ? selectedAsignaturaIdRaw
      : asignaturas[0]?.id;

  const selectedAsignatura =
    asignaturas.find((a) => a.id === selectedAsignaturaId) ?? null;

  const evaluaciones = selectedAsignaturaId
    ? await listarEvaluacionesByAsignatura(selectedAsignaturaId)
    : [];

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <header>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Evaluaciones
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Crea y gestiona evaluaciones por asignatura.
          </p>
        </header>
      </div>

      {/* Asignatura filter */}
      <form
        method="GET"
        className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <label
              htmlFor="eval-asig"
              className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
            >
              Asignatura
            </label>
            <div className="relative">
              <select
                id="eval-asig"
                name="asignaturaId"
                defaultValue={selectedAsignaturaId}
                className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {asignaturas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.codigo ? `[${a.codigo}] ` : ""}
                    {a.nombre}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg
                  className="h-4 w-4 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            {selectedAsignatura?.codigo && (
              <p className="text-[11px] text-text-muted dark:text-gray-500">
                Código:{" "}
                <span className="font-mono font-semibold">{selectedAsignatura.codigo}</span>
              </p>
            )}
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] sm:w-auto"
            >
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {/* Create evaluacion form */}
      {selectedAsignaturaId && (
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Nueva Evaluación
            </h2>
          </div>
          <form action={crearEvaluacionFormAction} className="space-y-4">
            <input type="hidden" name="asignaturaId" value={selectedAsignaturaId} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  htmlFor="ev-titulo"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
                >
                  Título <span className="text-danger">*</span>
                </label>
                <input
                  id="ev-titulo"
                  name="titulo"
                  type="text"
                  required
                  placeholder="Ej: Evaluación Parcial 1"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ev-tipo"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
                >
                  Tipo <span className="text-danger">*</span>
                </label>
                <div className="relative">
                  <select
                    id="ev-tipo"
                    name="tipo"
                    required
                    className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-4 pr-9 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="formulario">Formulario</option>
                    <option value="tarea">Tarea</option>
                    <option value="examen">Examen</option>
                    <option value="proyecto">Proyecto</option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="h-4 w-4 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ev-ponderacion"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
                >
                  Ponderación (%)
                </label>
                <input
                  id="ev-ponderacion"
                  name="ponderacion"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="Ej: 30"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ev-fechaInicio"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
                >
                  Fecha de inicio
                </label>
                <input
                  id="ev-fechaInicio"
                  name="fechaInicio"
                  type="datetime-local"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="ev-fechaLimite"
                  className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
                >
                  Fecha límite
                </label>
                <input
                  id="ev-fechaLimite"
                  name="fechaLimite"
                  type="datetime-local"
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="ev-instrucciones"
                className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400"
              >
                Instrucciones
              </label>
              <textarea
                id="ev-instrucciones"
                name="instrucciones"
                rows={3}
                placeholder="Instrucciones para el alumno..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" />
                Crear Evaluación
              </button>
            </div>
          </form>
        </article>
      )}

      {/* Evaluaciones list */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
            Evaluaciones registradas
          </h2>
          {evaluaciones.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {evaluaciones.length}
            </span>
          )}
        </div>

        {evaluaciones.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-secondary dark:text-gray-400">
            No hay evaluaciones para esta asignatura.{" "}
            {selectedAsignaturaId ? "Crea una usando el formulario anterior." : ""}
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Título
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Tipo
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Preguntas
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Ponderación
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Fecha Límite
                    </th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Estado
                    </th>
                    <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {evaluaciones.map((ev) => (
                    <tr key={ev.id} className="group">
                      <td className="py-3 pr-4 font-medium text-text-primary dark:text-gray-100">
                        {ev.titulo}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary dark:text-gray-400">
                        <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium dark:bg-gray-800">
                          {TIPO_LABELS[ev.tipo] ?? ev.tipo}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text-secondary dark:text-gray-400">
                        {ev.totalPreguntas}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary dark:text-gray-400">
                        {ev.ponderacion ? `${ev.ponderacion}%` : "—"}
                      </td>
                      <td className="py-3 pr-4 text-text-secondary dark:text-gray-400">
                        {ev.fechaLimite
                          ? new Date(ev.fechaLimite).toLocaleDateString("es-CL")
                          : "—"}
                      </td>
                      <td className="py-3">
                        {ev.publicada ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success dark:bg-success/20">
                            <Eye className="h-3 w-3" />
                            Publicada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            Borrador
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!ev.publicada && (
                            <form action={publicarEvaluacionFormAction}>
                              <input
                                type="hidden"
                                name="evaluacionId"
                                value={ev.id}
                              />
                              <input
                                type="hidden"
                                name="asignaturaId"
                                value={selectedAsignaturaId}
                              />
                              <button
                                type="submit"
                                className="flex items-center gap-1 rounded-lg border border-success/30 bg-success/5 px-2.5 py-1.5 text-xs font-medium text-success transition-colors hover:bg-success/10 dark:border-success/40 dark:bg-success/10"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Publicar
                              </button>
                            </form>
                          )}
                          <form action={eliminarEvaluacionFormAction}>
                            <input
                              type="hidden"
                              name="evaluacionId"
                              value={ev.id}
                            />
                            <input
                              type="hidden"
                              name="asignaturaId"
                              value={selectedAsignaturaId}
                            />
                            <button
                              type="submit"
                              className="flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10 dark:border-danger/40 dark:bg-danger/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Eliminar
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {evaluaciones.map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-text-primary dark:text-gray-100">
                        {ev.titulo}
                      </p>
                      <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                        {TIPO_LABELS[ev.tipo] ?? ev.tipo} ·{" "}
                        {ev.totalPreguntas} pregunta
                        {ev.totalPreguntas !== 1 ? "s" : ""}
                        {ev.ponderacion ? ` · ${ev.ponderacion}%` : ""}
                      </p>
                      {ev.fechaLimite && (
                        <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
                          Límite:{" "}
                          {new Date(ev.fechaLimite).toLocaleDateString("es-CL")}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {ev.publicada ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                          <Eye className="h-3 w-3" />
                          Publicada
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          Borrador
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!ev.publicada && (
                      <form action={publicarEvaluacionFormAction}>
                        <input type="hidden" name="evaluacionId" value={ev.id} />
                        <input
                          type="hidden"
                          name="asignaturaId"
                          value={selectedAsignaturaId}
                        />
                        <button
                          type="submit"
                          className="flex items-center gap-1 rounded-lg border border-success/30 bg-success/5 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Publicar
                        </button>
                      </form>
                    )}
                    <form action={eliminarEvaluacionFormAction}>
                      <input type="hidden" name="evaluacionId" value={ev.id} />
                      <input
                        type="hidden"
                        name="asignaturaId"
                        value={selectedAsignaturaId}
                      />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/5 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
