import Link from "next/link";

import { ClipboardList, Eye, Plus, ShieldCheck, ShieldOff } from "lucide-react";

import { listarAsignaturasDocente } from "@/actions/docente";
import {
  cambiarEstadoEvaluacionesAsignaturaFormAction,
  despublicarEvaluacionFormAction,
  listarEvaluacionesByAsignatura,
  publicarEvaluacionFormAction,
} from "@/actions/evaluaciones";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { normalizarTextoVisible } from "@/lib/displayText";

export const metadata = {
  title: "Pruebas",
};

const formatDate = (date: Date | null): string =>
  date
    ? new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    : "Sin fecha";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  evaluacion_published: { tone: "success", text: "Prueba habilitada para alumnos." },
  evaluacion_unpublished: { tone: "success", text: "Prueba deshabilitada para alumnos." },
  evaluaciones_enabled_all: { tone: "success", text: "Todas las pruebas de la asignatura quedaron habilitadas." },
  evaluaciones_disabled_all: { tone: "success", text: "Todas las pruebas de la asignatura quedaron deshabilitadas." },
  error: { tone: "error", text: "No fue posible completar la accion." },
};

export default async function DocentePruebasPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const asignaturas = await listarAsignaturasDocente();
  const evaluacionesPorAsignatura = await Promise.all(
    asignaturas.map(async (asignatura) => ({
      asignatura,
      evaluaciones: await listarEvaluacionesByAsignatura(asignatura.id),
    })),
  );

  const totalPruebas = evaluacionesPorAsignatura.reduce(
    (total, item) => total + item.evaluaciones.length,
    0,
  );
  const totalPublicadas = evaluacionesPorAsignatura.reduce(
    (total, item) => total + item.evaluaciones.filter((evaluacion) => evaluacion.publicada).length,
    0,
  );
  const totalRespuestas = evaluacionesPorAsignatura.reduce(
    (total, item) =>
      total + item.evaluaciones.reduce((subtotal, evaluacion) => subtotal + evaluacion.totalRespondidas, 0),
    0,
  );
  const createHref = asignaturas[0]
    ? `/docente/asignaturas/${asignaturas[0].id}/evaluaciones`
    : "/docente/asignaturas";

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Pruebas
          </h1>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Crea, habilita, deshabilita y revisa respuestas por asignatura.
          </p>
        </div>
        <Link
          href={createHref}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Crear prueba
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-primary">{totalPruebas}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Pruebas creadas</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-emerald-500">{totalPublicadas}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Habilitadas para alumnos</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-2xl font-bold text-violet-500">{totalRespuestas}</p>
          <p className="text-xs text-text-secondary dark:text-gray-400">Alumnos con respuestas</p>
        </div>
      </div>

      {evaluacionesPorAsignatura.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-900">
          <ClipboardList className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm font-semibold text-text-primary dark:text-white">
            No tienes asignaturas asignadas.
          </p>
        </article>
      ) : (
        <div className="grid gap-4">
          {evaluacionesPorAsignatura.map(({ asignatura, evaluaciones }) => (
            <article
              key={asignatura.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary dark:text-white">
                    {normalizarTextoVisible(asignatura.nombre)}
                  </h2>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    {asignatura.codigo ?? "Sin codigo"} - {evaluaciones.length} prueba{evaluaciones.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Link
                    href={`/docente/asignaturas/${asignatura.id}/evaluaciones`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
                  >
                    <Plus className="h-4 w-4" />
                    Crear/editar pruebas
                  </Link>
                  {evaluaciones.length > 0 ? (
                    <div className="grid w-full gap-2 sm:grid-cols-2">
                      <form action={cambiarEstadoEvaluacionesAsignaturaFormAction}>
                        <input type="hidden" name="asignaturaId" value={asignatura.id} />
                        <input type="hidden" name="publicada" value="true" />
                        <input type="hidden" name="redirectTo" value="/docente/pruebas" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Habilitar todo
                        </button>
                      </form>
                      <form action={cambiarEstadoEvaluacionesAsignaturaFormAction}>
                        <input type="hidden" name="asignaturaId" value={asignatura.id} />
                        <input type="hidden" name="publicada" value="false" />
                        <input type="hidden" name="redirectTo" value="/docente/pruebas" />
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                          Deshabilitar todo
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>

              {evaluaciones.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-gray-200 p-5 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
                  Sin pruebas creadas para esta asignatura.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                  {evaluaciones.slice(0, 5).map((evaluacion) => (
                    <div
                      key={evaluacion.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary dark:text-white">
                          {normalizarTextoVisible(evaluacion.titulo)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
                          <span>{evaluacion.totalPreguntas} preguntas</span>
                          <span>{evaluacion.totalRespondidas} respuestas</span>
                          <span>Limite: {formatDate(evaluacion.fechaLimite)}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {evaluacion.publicada ? (
                          <form action={despublicarEvaluacionFormAction}>
                            <input type="hidden" name="evaluacionId" value={evaluacion.id} />
                            <input type="hidden" name="asignaturaId" value={asignatura.id} />
                            <input type="hidden" name="redirectTo" value="/docente/pruebas" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-800/60 dark:bg-amber-900/20 dark:text-amber-300"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Deshabilitar
                            </button>
                          </form>
                        ) : (
                          <form action={publicarEvaluacionFormAction}>
                            <input type="hidden" name="evaluacionId" value={evaluacion.id} />
                            <input type="hidden" name="asignaturaId" value={asignatura.id} />
                            <input type="hidden" name="redirectTo" value="/docente/pruebas" />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Habilitar
                            </button>
                          </form>
                        )}
                        <Link
                          href={`/docente/asignaturas/${asignatura.id}/evaluaciones?evaluacionId=${evaluacion.id}&tab=resultados`}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-text-secondary transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                          aria-label={`Ver respuestas de ${normalizarTextoVisible(evaluacion.titulo)}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
