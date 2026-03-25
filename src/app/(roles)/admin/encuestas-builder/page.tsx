import { ClipboardList, Plus, Users, XCircle, Zap } from "lucide-react";
import Link from "next/link";

import { listarAsignaturasAdmin } from "@/actions/asignaturas";
import { crearEncuestaFormAction, listarEncuestasAdmin } from "@/actions/encuestas-unificadas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

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

  const asignaturas = await listarAsignaturasAdmin({ limit: 100, offset: 0 }, { incluirArchivadas: false });

  const selectedIdRaw = typeof params.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedId =
    selectedIdRaw && UUID_REGEX.test(selectedIdRaw) ? selectedIdRaw : asignaturas[0]?.id;

  const encuestas = selectedId ? await listarEncuestasAdmin(selectedId) : [];

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
            <button type="submit" className="h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98] sm:w-auto">
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {selectedId && (
        <>
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
                {encuestas.map((enc) => (
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
                          <span>{enc.totalCompletados}/{enc.totalAsignados} completadas</span>
                        )}
                      </div>
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
                ))}
              </div>
            )}
          </article>
        </>
      )}
    </section>
  );
}
