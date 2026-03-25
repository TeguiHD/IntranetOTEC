import { BarChart3, ChevronLeft, GripVertical, Lock, Plus, Rocket, Trash2, Users, X, Zap } from "lucide-react";
import Link from "next/link";

import {
  agregarPreguntaEncuestaFormAction,
  cerrarEncuestaFormAction,
  eliminarEncuestaFormAction,
  eliminarPreguntaEncuestaFormAction,
  lanzarEncuestaFormAction,
  obtenerEncuestaDetalle,
  obtenerResultadosEncuesta,
} from "@/actions/encuestas-unificadas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_lanzada: { tone: "success", text: "¡Encuesta lanzada! Los usuarios asignados ya pueden responderla." },
  already_active: { tone: "success", text: "La encuesta ya estaba activa." },
  encuesta_cerrada: { tone: "success", text: "Encuesta cerrada. Ya no acepta respuestas." },
  pregunta_created: { tone: "success", text: "Pregunta agregada correctamente." },
  pregunta_deleted: { tone: "success", text: "Pregunta eliminada." },
  no_preguntas: { tone: "error", text: "Agrega al menos una pregunta antes de lanzar la encuesta." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

const TIPO_LABELS: Record<string, string> = {
  likert: "Escala Likert",
  si_no: "Sí / No",
  texto_libre: "Texto libre",
  opcion_multiple: "Opción múltiple",
};

const formatRut = (rut: string | null): string => {
  if (!rut) return "-";
  return rut.startsWith("EXT-") ? `Ext: ${rut.replace(/^EXT-/, "")}` : formatearRut(rut);
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ state?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const encuesta = await obtenerEncuestaDetalle(id);
  return { title: encuesta?.titulo ?? "Encuesta" };
}

export default async function AdminEncuestaBuilderDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await (searchParams ?? Promise.resolve({} as { state?: string }));

  const encuesta = await obtenerEncuestaDetalle(id);

  if (!encuesta) {
    return (
      <section className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg font-semibold text-text-primary dark:text-white">Encuesta no encontrada</p>
        <Link href="/admin/encuestas-builder" className="text-sm text-primary hover:underline">
          Volver al constructor
        </Link>
      </section>
    );
  }

  const resultados = encuesta.estadoEncuesta !== "borrador"
    ? await obtenerResultadosEncuesta(id)
    : [];

  const isDraft = encuesta.estadoEncuesta === "borrador";
  const isActive = encuesta.estadoEncuesta === "activa";
  const isClosed = encuesta.estadoEncuesta === "cerrada";

  const AUDIENCIA_LABELS: Record<string, string> = {
    alumnos: "Alumnos",
    docentes: "Docentes",
    todos: "Alumnos + Docentes",
  };

  const completados = encuesta.asignaciones.filter((a) => a.completada).length;
  const total = encuesta.asignaciones.length;

  return (
    <section className="space-y-6">
      <RouteStateToast state={sp.state} map={STATUS_MAP} />

      {/* Header */}
      <header className="flex items-start gap-3">
        <Link
          href="/admin/encuestas-builder"
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-text-secondary hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary dark:text-white sm:text-2xl">
              {encuesta.titulo}
            </h1>
            {encuesta.obligatoria && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Zap className="h-3 w-3" />
                Obligatoria
              </span>
            )}
            {isActive && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                Activa
              </span>
            )}
            {isClosed && (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/30 dark:text-red-400">
                Cerrada
              </span>
            )}
            {isDraft && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                Borrador
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            {encuesta.asignaturaNombre}
            {encuesta.audiencia && (
              <> · <Users className="inline h-3 w-3" /> {AUDIENCIA_LABELS[encuesta.audiencia]}</>
            )}
          </p>
          {encuesta.instrucciones && (
            <p className="mt-1 text-xs italic text-text-muted dark:text-gray-500">
              {encuesta.instrucciones}
            </p>
          )}
        </div>
      </header>

      {/* Stats (active/closed) */}
      {!isDraft && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-text-secondary dark:text-gray-400">Asignados</p>
            <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{total}</p>
          </div>
          <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-text-secondary dark:text-gray-400">Completaron</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completados}</p>
          </div>
          <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-medium text-text-secondary dark:text-gray-400">Pendientes</p>
            <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{total - completados}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: questions + actions */}
        <div className="space-y-5">
          {/* Questions list */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <GripVertical className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                Preguntas
              </h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                {encuesta.preguntas.length}
              </span>
            </div>

            {encuesta.preguntas.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Plus className="h-10 w-10 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
                <p className="text-sm text-text-secondary dark:text-gray-400">
                  Agrega la primera pregunta abajo.
                </p>
              </div>
            ) : (
              <ol className="space-y-2">
                {encuesta.preguntas.map((p, idx) => (
                  <li
                    key={p.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-800/40"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                        {p.enunciado}
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-muted dark:text-gray-500">
                        {TIPO_LABELS[p.tipo] ?? p.tipo}
                        {p.tipo === "likert" && p.opciones ? (() => {
                          const opts = p.opciones as { escalaMin?: number; escalaMax?: number; etiquetaMin?: string; etiquetaMax?: string };
                          return ` · ${opts.escalaMin ?? 1}-${opts.escalaMax ?? 5} (${opts.etiquetaMin ?? "min"} → ${opts.etiquetaMax ?? "max"})`;
                        })() : null}
                      </p>
                    </div>
                    {isDraft && (
                      <form action={eliminarPreguntaEncuestaFormAction}>
                        <input type="hidden" name="evaluacionId" value={id} />
                        <input type="hidden" name="preguntaId" value={p.id} />
                        <button
                          type="submit"
                          title="Eliminar pregunta"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </article>

          {/* Add question (draft only) */}
          {isDraft && (
            <article className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.02] p-5 shadow-sm dark:border-primary/20 dark:bg-primary/5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Agregar Pregunta
                </h2>
              </div>
              <form action={agregarPreguntaEncuestaFormAction} className="space-y-4">
                <input type="hidden" name="evaluacionId" value={id} />
                <textarea
                  name="enunciado"
                  required
                  rows={2}
                  placeholder="Escribe la pregunta aquí..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                      Tipo de respuesta
                    </label>
                    <select
                      name="tipo"
                      defaultValue="likert"
                      className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <option value="likert">Escala Likert (numérica)</option>
                      <option value="si_no">Sí / No</option>
                      <option value="texto_libre">Texto libre</option>
                      <option value="opcion_multiple">Opción múltiple</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        Escala mín
                      </label>
                      <input
                        name="escalaMin"
                        type="number"
                        defaultValue={1}
                        min={1}
                        max={10}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        Escala máx
                      </label>
                      <input
                        name="escalaMax"
                        type="number"
                        defaultValue={5}
                        min={2}
                        max={10}
                        className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="etiquetaMin"
                    placeholder="Etiqueta mínimo (ej: Nunca)"
                    className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <input
                    name="etiquetaMax"
                    placeholder="Etiqueta máximo (ej: Siempre)"
                    className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]"
                  >
                    <Plus className="h-4 w-4" />
                    Agregar
                  </button>
                </div>
              </form>
            </article>
          )}

          {/* Results by question */}
          {resultados.length > 0 && (
            <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                  Resultados por Pregunta
                </h2>
              </div>
              <div className="space-y-5">
                {resultados.map((r, idx) => (
                  <div key={r.preguntaId} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                    <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                      <span className="mr-2 text-text-muted dark:text-gray-500">{idx + 1}.</span>
                      {r.enunciado}
                    </p>
                    {r.promedioNumerico !== null && (
                      <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                        Promedio:{" "}
                        <span className="font-bold text-primary">{r.promedioNumerico}</span>
                      </p>
                    )}
                    {r.respuestas.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.respuestas.map(({ valor, count }) => (
                          <span
                            key={valor}
                            className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-text-secondary dark:bg-gray-800 dark:text-gray-300"
                          >
                            {valor}: <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    )}
                    {r.respuestas.length === 0 && (
                      <p className="mt-2 text-xs text-text-muted dark:text-gray-500">Sin respuestas aún.</p>
                    )}
                  </div>
                ))}
              </div>
            </article>
          )}
        </div>

        {/* Right: actions sidebar */}
        <aside className="space-y-4">
          {/* Launch / Close */}
          {isDraft && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <h3 className="mb-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Lanzar encuesta
              </h3>
              <p className="mb-4 text-xs text-emerald-700 dark:text-emerald-400">
                Al lanzar, la encuesta se activa y se asigna automáticamente a los usuarios según la audiencia configurada.
                {encuesta.obligatoria && " Por ser obligatoria, bloqueará el portal hasta que sea completada."}
              </p>
              <form action={lanzarEncuestaFormAction}>
                <input type="hidden" name="evaluacionId" value={id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.97]"
                >
                  <Rocket className="h-4 w-4" />
                  Lanzar Encuesta
                </button>
              </form>
            </div>
          )}

          {isActive && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800/40 dark:bg-red-950/20">
              <h3 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">
                Cerrar encuesta
              </h3>
              <p className="mb-4 text-xs text-red-600 dark:text-red-400">
                Cierra la encuesta para que ya no acepte respuestas. Esta acción no se puede deshacer.
              </p>
              <form action={cerrarEncuestaFormAction}>
                <input type="hidden" name="evaluacionId" value={id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-[0.97] dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                >
                  <X className="h-4 w-4" />
                  Cerrar Encuesta
                </button>
              </form>
            </div>
          )}

          {/* Participants */}
          {encuesta.asignaciones.length > 0 && (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">
                  Participantes ({total})
                </h3>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {encuesta.asignaciones.map((a) => (
                  <div key={a.usuarioId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-text-primary dark:text-gray-200">
                        {a.usuarioNombre} {a.usuarioApellido}
                      </p>
                      <p className="font-mono text-[10px] text-text-muted dark:text-gray-500">
                        {formatRut(a.usuarioRut)}
                      </p>
                    </div>
                    {a.completada ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        Completada
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        Pendiente
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Send / obligatory info */}
          {encuesta.obligatoria && isActive && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Encuesta obligatoria activa</p>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                    Los participantes tienen su portal bloqueado hasta que respondan esta encuesta.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send reminder (placeholder) */}
          {isActive && (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-1 text-sm font-semibold text-text-primary dark:text-white">
                Información
              </h3>
              <p className="text-xs text-text-secondary dark:text-gray-400">
                Los participantes pendientes pueden responder en su portal bajo{" "}
                <strong>Mis Encuestas</strong>.
              </p>
            </div>
          )}

          {/* Delete (draft only) */}
          {isDraft && (
            <form action={eliminarEncuestaFormAction}>
              <input type="hidden" name="evaluacionId" value={id} />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-500 transition-all hover:bg-red-50 active:scale-[0.97] dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar encuesta
              </button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
