import { CheckCircle2, ClipboardList, Clock, FileText, Plus, Rocket, Users, XCircle, Zap } from "lucide-react";
import Link from "next/link";

import { obtenerAsignaturaAdminById } from "@/actions/asignaturas";
import { crearEncuestaFormAction, listarEncuestasAdmin } from "@/actions/encuestas-unificadas";
import { DonutChart } from "@/components/charts/DonutChart";
import { StatCard } from "@/components/charts/StatCard";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { EncuestasBuilderFiltro } from "./EncuestasBuilderFiltro";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_created: { tone: "success", text: "Encuesta creada. Agrega preguntas y luego lánzala." },
  encuesta_deleted: { tone: "success", text: "Encuesta eliminada." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

const ESTADO_COLORS: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  activa: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  cerrada: "bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400",
};
const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  activa: "Activa",
  cerrada: "Cerrada",
};
const AUDIENCIA_LABELS: Record<string, string> = {
  alumnos: "Alumnos",
  docentes: "Docentes",
  todos: "Todos",
};

type Props = {
  searchParams?: Promise<{ state?: string; asignaturaId?: string }>;
};

export const metadata = { title: "Constructor de Encuestas" };

export default async function AdminEncuestasBuilderPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; asignaturaId?: string }));

  const selectedIdRaw = typeof params.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedId = selectedIdRaw && UUID_REGEX.test(selectedIdRaw) ? selectedIdRaw : undefined;

  const [defaultAsignatura, encuestas] = await Promise.all([
    selectedId ? obtenerAsignaturaAdminById(selectedId) : Promise.resolve(null),
    selectedId ? listarEncuestasAdmin(selectedId) : Promise.resolve([]),
  ]);

  // Aggregate metrics
  const totalEncuestas = encuestas.length;
  const activas = encuestas.filter((e) => e.estadoEncuesta === "activa").length;
  const borradores = encuestas.filter((e) => e.estadoEncuesta === "borrador").length;
  const cerradas = encuestas.filter((e) => e.estadoEncuesta === "cerrada").length;
  const totalAsignados = encuestas.reduce((s, e) => s + (e.totalAsignados ?? 0), 0);
  const totalCompletados = encuestas.reduce((s, e) => s + (e.totalCompletados ?? 0), 0);
  const totalPendientes = totalAsignados - totalCompletados;

  return (
    <section className="space-y-6">
      <RouteStateToast state={params.state} map={STATUS_MAP} />

      {/* Header */}
      <header className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Constructor de Encuestas
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Crea encuestas personalizadas, configura preguntas y lánzalas a alumnos o docentes.
          </p>
        </div>
      </header>

      {/* Asignatura selector */}
      <EncuestasBuilderFiltro defaultAsignatura={defaultAsignatura} />

      {!selectedId && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-700">
          <ClipboardList className="h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400">
            Busca y selecciona una asignatura para ver o crear encuestas.
          </p>
        </div>
      )}

      {selectedId && (
        <>
          {/* Metrics dashboard */}
          {totalEncuestas > 0 && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Total encuestas"
                value={totalEncuestas}
                sublabel={`${activas} activa${activas !== 1 ? "s" : ""}, ${borradores} borrador${borradores !== 1 ? "es" : ""}`}
                Icon={FileText}
                iconColor="text-primary"
                iconBg="bg-primary/10"
              />
              <StatCard
                label="En curso"
                value={activas}
                sublabel={activas > 0 ? "Recibiendo respuestas" : "Ninguna activa"}
                Icon={Rocket}
                iconColor="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              />
              <StatCard
                label="Completadas"
                value={totalCompletados}
                sublabel={totalAsignados > 0 ? `${Math.round((totalCompletados / totalAsignados) * 100)}% de ${totalAsignados} asignados` : "Sin asignaciones"}
                Icon={CheckCircle2}
                iconColor="text-violet-600 dark:text-violet-400"
                iconBg="bg-violet-100 dark:bg-violet-900/30"
              />
              <StatCard
                label="Pendientes"
                value={totalPendientes}
                sublabel={totalPendientes === 0 ? "Todo al día" : `${totalPendientes} sin responder`}
                Icon={Clock}
                iconColor="text-amber-600 dark:text-amber-400"
                iconBg="bg-amber-100 dark:bg-amber-900/30"
              />
            </div>
          )}

          {/* Participation donut (when there are active surveys) */}
          {totalAsignados > 0 && (
            <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
              <div className="flex items-center justify-center rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <DonutChart
                  segments={[
                    { label: "Completadas", value: totalCompletados, color: "fill-emerald-500", strokeColor: "#10B981" },
                    { label: "Pendientes", value: totalPendientes, color: "fill-amber-500", strokeColor: "#F59E0B" },
                    { label: "Cerradas", value: cerradas, color: "fill-rose-500", strokeColor: "#F43F5E" },
                  ]}
                  size={120}
                  strokeWidth={16}
                  centerValue={`${totalAsignados > 0 ? Math.round((totalCompletados / totalAsignados) * 100) : 0}%`}
                  centerLabel="Participación"
                />
              </div>
              <div className="flex flex-col justify-center rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-3 text-sm font-semibold text-text-primary dark:text-white">Participación global</h3>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700 ease-out"
                    style={{ width: `${totalAsignados > 0 ? Math.round((totalCompletados / totalAsignados) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-text-secondary dark:text-gray-400">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{totalCompletados}</span> de {totalAsignados} respuestas recibidas
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-text-muted dark:text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Activas: {activas}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-gray-400" /> Borradores: {borradores}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" /> Cerradas: {cerradas}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Create survey form */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-text-primary dark:text-white">
                Nueva Encuesta
              </h2>
            </div>
            <form action={crearEncuestaFormAction} className="space-y-4">
              <input type="hidden" name="asignaturaId" value={selectedId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="titulo"
                  required
                  placeholder="Título de la encuesta"
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <select
                  name="audiencia"
                  defaultValue="alumnos"
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="alumnos">Solo alumnos</option>
                  <option value="docentes">Solo docentes</option>
                  <option value="todos">Alumnos + Docente</option>
                </select>
              </div>
              <textarea
                name="instrucciones"
                rows={2}
                placeholder="Instrucciones para los encuestados (opcional)..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary dark:text-gray-400">
                  <input type="checkbox" name="obligatoria" value="true" className="h-4 w-4 rounded border-gray-300 accent-primary" />
                  <span>Obligatoria (bloquea el portal hasta que sea respondida)</span>
                </label>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  Crear
                </button>
              </div>
            </form>
          </article>

          {/* Encuestas list */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                Encuestas registradas
              </h2>
              {encuestas.length > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {encuestas.length}
                </span>
              )}
            </div>

            {encuestas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ClipboardList className="h-10 w-10 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
                <p className="text-sm font-medium text-text-secondary dark:text-gray-400">
                  No hay encuestas para esta asignatura.
                </p>
                <p className="text-xs text-text-muted dark:text-gray-500">
                  Crea una encuesta arriba y luego agrégale preguntas.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {encuestas.map((enc) => {
                  const pctComplete = (enc.totalAsignados ?? 0) > 0
                    ? Math.round(((enc.totalCompletados ?? 0) / (enc.totalAsignados ?? 1)) * 100)
                    : 0;

                  return (
                    <div
                      key={enc.id}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-text-primary dark:text-gray-100">
                            {enc.titulo}
                          </p>
                          {enc.obligatoria && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                              <Zap className="h-2.5 w-2.5" />
                              Obligatoria
                            </span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ESTADO_COLORS[enc.estadoEncuesta ?? "borrador"]}`}>
                            {ESTADO_LABELS[enc.estadoEncuesta ?? "borrador"]}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {AUDIENCIA_LABELS[enc.audiencia ?? "alumnos"]}
                          </span>
                          <span>{enc.totalPreguntas} pregunta{enc.totalPreguntas !== 1 ? "s" : ""}</span>
                          {enc.estadoEncuesta === "activa" && (
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {enc.totalCompletados}/{enc.totalAsignados} ({pctComplete}%)
                            </span>
                          )}
                        </div>
                        {/* Mini progress bar for active surveys */}
                        {enc.estadoEncuesta === "activa" && (enc.totalAsignados ?? 0) > 0 && (
                          <div className="mt-2 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${pctComplete}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {enc.estadoEncuesta === "activa" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                            En curso
                          </span>
                        )}
                        {enc.estadoEncuesta === "cerrada" && (
                          <span className="flex items-center gap-1 text-xs font-medium text-red-500 dark:text-red-400">
                            <XCircle className="h-3 w-3" />
                            Cerrada
                          </span>
                        )}
                        <Link
                          href={`/admin/encuestas-builder/${enc.id}`}
                          className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          {enc.estadoEncuesta === "borrador" ? "Editar / Lanzar" : "Ver detalle"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}
