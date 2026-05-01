import { BarChart3, CheckCircle2, ChevronLeft, Clock, GripVertical, Lock, Plus, Rocket, Users, X, Zap } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ConfirmDeleteEncuesta } from "./ConfirmDeleteEncuesta";

import {
  agregarPreguntaEncuestaFormAction,
  cerrarEncuestaFormAction,
  eliminarEncuestaFormAction,
  eliminarPreguntaEncuestaFormAction,
  lanzarEncuestaFormAction,
  obtenerEncuestaDetalle,
  obtenerResultadosEncuesta,
} from "@/actions/encuestas-unificadas";
import { DonutChart } from "@/components/charts/DonutChart";
import { HorizontalBar } from "@/components/charts/HorizontalBar";
import { LikertDistribution } from "@/components/charts/LikertDistribution";
import { ProgressRing } from "@/components/charts/ProgressRing";
import { StatCard } from "@/components/charts/StatCard";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { SurveyShell } from "@/components/shared/surveys/SurveyShell";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_lanzada: { tone: "success", text: "¡Encuesta lanzada! Los usuarios asignados ya pueden responderla." },
  already_active: { tone: "success", text: "La encuesta ya estaba activa." },
  encuesta_cerrada: { tone: "success", text: "Encuesta cerrada. Ya no acepta respuestas." },
  pregunta_created: { tone: "success", text: "Pregunta agregada correctamente." },
  pregunta_deleted: { tone: "success", text: "Pregunta eliminada." },
  no_preguntas: { tone: "error", text: "Agrega al menos una pregunta antes de lanzar la encuesta." },
  not_found: { tone: "error", text: "Encuesta no encontrada." },
  invalid_input: { tone: "error", text: "El enunciado de la pregunta no puede estar vacío." },
  pregunta_create_failed: { tone: "error", text: "Error al guardar la pregunta en la base de datos." },
  forbidden: { tone: "error", text: "No tienes permisos para esta acción." },
  already_closed: { tone: "error", text: "La encuesta ya está cerrada." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

const TIPO_LABELS: Record<string, string> = {
  likert: "Escala Likert",
  si_no: "Sí / No",
  texto_libre: "Texto libre",
  opcion_multiple: "Opción múltiple",
};

const AUDIENCIA_LABELS: Record<string, string> = {
  alumnos: "Alumnos",
  docentes: "Docentes",
  todos: "Alumnos + Docentes",
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
        <BarChart3 className="h-12 w-12 text-gray-200 dark:text-gray-700" strokeWidth={1.5} />
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

  const completados = encuesta.asignaciones.filter((a) => a.completada).length;
  const pendientes = encuesta.asignaciones.filter((a) => !a.completada).length;
  const total = encuesta.asignaciones.length;
  const completionPct = total > 0 ? Math.round((completados / total) * 100) : 0;

  // Compute global average across all numeric questions
  const globalAvgs = resultados
    .filter((r) => r.promedioNumerico !== null)
    .map((r) => r.promedioNumerico!);
  const globalAverage = globalAvgs.length > 0
    ? Math.round((globalAvgs.reduce((a, b) => a + b, 0) / globalAvgs.length) * 10) / 10
    : null;

  return (
    <SurveyShell
      icon={BarChart3}
      title={encuesta.titulo}
      description={`${encuesta.asignaturaNombre} · ${AUDIENCIA_LABELS[encuesta.audiencia ?? "alumnos"]}`}
      stats={[
        { label: "Asignados", value: total, tone: "primary" },
        { label: "Completados", value: completados, tone: "emerald" },
        { label: "Pendientes", value: pendientes, tone: "amber" },
        { label: "Participacion", value: `${completionPct}%`, tone: "slate" },
      ]}
      badge={
        <div className="flex items-center gap-1.5">
          {encuesta.obligatoria ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Zap className="h-3 w-3" /> Obligatoria
            </span>
          ) : null}
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Activa
            </span>
          ) : isClosed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
              Cerrada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              Borrador
            </span>
          )}
        </div>
      }
    >
      <Suspense><RouteStateToast state={sp.state} map={STATUS_MAP} /></Suspense>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2 text-xs text-text-secondary shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
        <Link
          href={`/admin/encuestas-builder?asignaturaId=${encuesta.asignaturaId}`}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-text-secondary transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span>{encuesta.createdAt ? `Creada ${new Date(encuesta.createdAt).toLocaleDateString("es-CL")}` : "Creada recientemente"}</span>
        {encuesta.instrucciones ? (
          <span className="rounded-md bg-primary/[0.06] px-2 py-1 text-[11px] text-primary dark:bg-primary/20 dark:text-primary-light">
            {encuesta.instrucciones}
          </span>
        ) : null}
      </div>

      {/* Metrics dashboard (active/closed) */}
      {!isDraft && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Asignados"
            value={total}
            sublabel={`${AUDIENCIA_LABELS[encuesta.audiencia ?? "alumnos"]}`}
            Icon={Users}
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <StatCard
            label="Completaron"
            value={completados}
            sublabel={total > 0 ? `${Math.round((completados / total) * 100)}% del total` : "0%"}
            Icon={CheckCircle2}
            iconColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
          />
          <StatCard
            label="Pendientes"
            value={pendientes}
            sublabel={pendientes === 0 ? "¡Todos respondieron!" : `${pendientes} sin responder`}
            Icon={Clock}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-900/30"
          />
          {globalAverage !== null ? (
            <StatCard
              label="Promedio global"
              value={globalAverage}
              sublabel={`De ${globalAvgs.length} pregunta${globalAvgs.length !== 1 ? "s" : ""} numéricas`}
              Icon={BarChart3}
              iconColor="text-violet-600 dark:text-violet-400"
              iconBg="bg-violet-100 dark:bg-violet-900/30"
            />
          ) : (
            <StatCard
              label="Preguntas"
              value={encuesta.preguntas.length}
              sublabel="En la encuesta"
              Icon={BarChart3}
              iconColor="text-violet-600 dark:text-violet-400"
              iconBg="bg-violet-100 dark:bg-violet-900/30"
            />
          )}
        </div>
      )}

      {/* Completion donut + progress (active/closed with data) */}
      {!isDraft && total > 0 && (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
          <div className="flex items-center justify-center rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <DonutChart
              segments={[
                { label: "Completadas", value: completados, color: "fill-emerald-500", strokeColor: "#10B981" },
                { label: "Pendientes", value: pendientes, color: "fill-amber-500", strokeColor: "#F59E0B" },
              ]}
              size={130}
              strokeWidth={18}
              centerValue={`${Math.round(total > 0 ? (completados / total) * 100 : 0)}%`}
              centerLabel="Participación"
            />
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-text-primary dark:text-white">Progreso de participación</h3>
            <HorizontalBar
              items={[
                { label: "Completadas", value: completados, color: "bg-emerald-500" },
                { label: "Pendientes", value: pendientes, color: "bg-amber-400" },
              ]}
              max={total}
            />
            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-text-muted dark:text-gray-500">
              {completados} de {total} ({completionPct}%)
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Left: questions + results */}
        <div className="space-y-5">
          {/* Questions */}
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
                        <button type="submit" title="Eliminar pregunta" className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </article>

          {/* Add question (draft) */}
          {isDraft && (
            <article className="rounded-2xl border border-dashed border-primary/30 bg-primary/[0.02] p-5 shadow-sm dark:border-primary/20 dark:bg-primary/5 sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white">Agregar Pregunta</h2>
              </div>
              <form action={agregarPreguntaEncuestaFormAction} className="space-y-4">
                <input type="hidden" name="evaluacionId" value={id} />
                <textarea name="enunciado" required rows={2} placeholder="Escribe la pregunta aquí..." className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">Tipo de respuesta</label>
                    <select name="tipo" defaultValue="likert" className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
                      <option value="likert">Escala Likert (numérica)</option>
                      <option value="si_no">Sí / No</option>
                      <option value="texto_libre">Texto libre</option>
                      <option value="opcion_multiple">Opción múltiple</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">Escala mín</label>
                      <input name="escalaMin" type="number" defaultValue={1} min={1} max={10} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">Escala máx</label>
                      <input name="escalaMax" type="number" defaultValue={5} min={2} max={10} className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input name="etiquetaMin" placeholder="Etiqueta mínimo (ej: Nunca)" className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                  <input name="etiquetaMax" placeholder="Etiqueta máximo (ej: Siempre)" className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark active:scale-[0.98]">
                    <Plus className="h-4 w-4" /> Agregar
                  </button>
                </div>
              </form>
            </article>
          )}

          {/* Results by question — PROFESSIONAL */}
          {resultados.length > 0 && (
            <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
                  Resultados por Pregunta
                </h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {completados} respuestas
                </span>
              </div>

              <div className="space-y-6">
                {resultados.map((r, idx) => {
                  const isNumeric = r.promedioNumerico !== null;
                  const totalResp = r.respuestas.reduce((s, v) => s + v.count, 0);

                  return (
                    <div key={r.preguntaId} className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-snug text-text-primary dark:text-gray-100">
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {idx + 1}
                          </span>
                          {r.enunciado}
                        </p>
                        {isNumeric && (
                          <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
                            {r.promedioNumerico!.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Likert-style distribution for numeric */}
                      {isNumeric && r.respuestas.length > 0 && (
                        <LikertDistribution
                          distribution={r.respuestas}
                          scaleMin={Math.min(...r.respuestas.map((v) => Number(v.valor)).filter((n) => !Number.isNaN(n)), 1)}
                          scaleMax={Math.max(...r.respuestas.map((v) => Number(v.valor)).filter((n) => !Number.isNaN(n)), 5)}
                          average={r.promedioNumerico}
                          totalResponses={totalResp}
                        />
                      )}

                      {/* Horizontal bar for non-numeric (si_no, opcion_multiple) */}
                      {!isNumeric && r.respuestas.length > 0 && (
                        <div className="mt-2">
                          <HorizontalBar
                            items={r.respuestas.map((v) => ({ label: v.valor, value: v.count }))}
                            mode="percent"
                          />
                          <p className="mt-2 text-[10px] text-text-muted dark:text-gray-500">
                            {totalResp} respuesta{totalResp !== 1 ? "s" : ""} totales
                          </p>
                        </div>
                      )}

                      {/* Text responses */}
                      {r.tipo === "texto_libre" && r.respuestas.length > 0 && (
                        <div className="mt-3 max-h-40 space-y-1.5 overflow-y-auto">
                          {r.respuestas.map(({ valor, count }) => (
                            <div key={valor} className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2 text-xs text-text-secondary dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400">
                              &quot;{valor}&quot;
                              {count > 1 && <span className="ml-1 text-text-muted">×{count}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {r.respuestas.length === 0 && (
                        <p className="mt-2 text-xs text-text-muted dark:text-gray-500">Sin respuestas aún.</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          )}
        </div>

        {/* Right: actions sidebar */}
        <aside className="space-y-4">
          {/* Completion ring (active/closed) */}
          {!isDraft && total > 0 && (
            <div className="flex flex-col items-center rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <ProgressRing
                value={completados}
                max={total}
                size={80}
                strokeWidth={8}
                color={completados === total ? "#10B981" : "#6366F1"}
                label="Participación"
              />
              <p className="mt-2 text-center text-xs text-text-secondary dark:text-gray-400">
                {completados === total
                  ? "¡Todos respondieron!"
                  : `${pendientes} pendiente${pendientes !== 1 ? "s" : ""}`}
              </p>
            </div>
          )}

          {/* Launch (draft) */}
          {isDraft && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/20">
              <h3 className="mb-1 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Lanzar encuesta</h3>
              <p className="mb-4 text-xs text-emerald-700 dark:text-emerald-400">
                Se activa y asigna automáticamente.
                {encuesta.obligatoria && " Bloqueará el portal."}
              </p>
              <form action={lanzarEncuestaFormAction}>
                <input type="hidden" name="evaluacionId" value={id} />
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.97]">
                  <Rocket className="h-4 w-4" /> Lanzar Encuesta
                </button>
              </form>
            </div>
          )}

          {/* Close (active) */}
          {isActive && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-800/40 dark:bg-red-950/20">
              <h3 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-300">Cerrar encuesta</h3>
              <p className="mb-4 text-xs text-red-600 dark:text-red-400">Ya no acepta respuestas.</p>
              <form action={cerrarEncuestaFormAction}>
                <input type="hidden" name="evaluacionId" value={id} />
                <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-[0.97] dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  <X className="h-4 w-4" /> Cerrar
                </button>
              </form>
            </div>
          )}

          {/* Participants */}
          {encuesta.asignaciones.length > 0 && (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-text-primary dark:text-white">Participantes ({total})</h3>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {encuesta.asignaciones.map((a) => (
                  <div key={a.usuarioId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-text-primary dark:text-gray-200">{a.usuarioNombre} {a.usuarioApellido}</p>
                      <p className="font-mono text-[10px] text-text-muted dark:text-gray-500">{formatRut(a.usuarioRut)}</p>
                    </div>
                    {a.completada ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <CheckCircle2 className="mr-0.5 inline h-2.5 w-2.5" /> Hecho
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        <Clock className="mr-0.5 inline h-2.5 w-2.5" /> Pend.
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Obligatory info */}
          {encuesta.obligatoria && isActive && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
              <div className="flex items-start gap-2">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">Obligatoria activa</p>
                  <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">Portal bloqueado hasta respuesta.</p>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          {isActive && (
            <div className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h3 className="mb-1 text-sm font-semibold text-text-primary dark:text-white">Información</h3>
              <p className="text-xs text-text-secondary dark:text-gray-400">
                Pendientes responden en <strong>Mis Encuestas</strong>.
              </p>
            </div>
          )}

          {/* Delete (draft) */}
          {isDraft && (
            <ConfirmDeleteEncuesta
              evaluacionId={id}
              action={eliminarEncuestaFormAction}
            />
          )}
        </aside>
      </div>
    </SurveyShell>
  );
}
