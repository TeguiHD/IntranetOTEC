import { and, eq, isNull } from "drizzle-orm";
import {
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  agregarPreguntaFormAction,
  calificarRespuestaEvaluacionFormAction,
  crearEvaluacionFormAction,
  listarEvaluacionesByAsignatura,
  listarEventosSupervisionByEvaluacion,
  listarPreguntasByEvaluacion,
  listarRespuestasParaCalificar,
  obtenerResultadosEvaluacion,
  type RespuestaPendienteItem,
} from "@/actions/evaluaciones";
import { getDb } from "@/db";
import { asignaturas } from "@/db/schema";
import {
  EVALUATION_WINDOW_LABELS,
  EVALUATION_WINDOW_TONES,
} from "@/lib/evaluation-status";

type PageProps = {
  params: Promise<{ asigId: string }>;
  searchParams: Promise<{ evaluacionId?: string }>;
};

const TIPO_LABELS: Record<string, string> = {
  tarea: "Tarea",
  proyecto: "Proyecto",
  examen: "Examen",
  formulario: "Formulario",
  prueba: "Prueba",
};

const PREGUNTA_LABELS: Record<string, string> = {
  opcion_multiple: "Selección múltiple",
  verdadero_falso: "Verdadero/Falso",
  respuesta_corta: "Respuesta corta",
  desarrollo: "Desarrollo",
};

function formatDateTime(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export default async function DocenteEvaluacionesPage({
  params,
  searchParams,
}: PageProps) {
  const { asigId } = await params;
  const { evaluacionId: requestedEvaluacionId } = await searchParams;
  const db = getDb();

  const [asig] = await db
    .select({
      nombre: asignaturas.nombre,
      estado: asignaturas.estado,
    })
    .from(asignaturas)
    .where(and(eq(asignaturas.id, asigId), isNull(asignaturas.eliminadoAt)))
    .limit(1);

  if (!asig) notFound();

  const evals = await listarEvaluacionesByAsignatura(asigId);
  const selectedEvaluacionId =
    requestedEvaluacionId && evals.some((evaluacion) => evaluacion.id === requestedEvaluacionId)
      ? requestedEvaluacionId
      : evals[0]?.id;
  const selectedEvaluacion =
    evals.find((evaluacion) => evaluacion.id === selectedEvaluacionId) ?? null;

  const [preguntas, resultados, eventosSupervision, respuestasPendientes] = selectedEvaluacionId
    ? await Promise.all([
        listarPreguntasByEvaluacion(selectedEvaluacionId),
        obtenerResultadosEvaluacion(selectedEvaluacionId),
        listarEventosSupervisionByEvaluacion(selectedEvaluacionId),
        listarRespuestasParaCalificar(selectedEvaluacionId),
      ])
    : [[], [], [], [] as RespuestaPendienteItem[]];

  const publishedCount = evals.filter((evaluacion) => evaluacion.publicada).length;
  const answeredCount = evals.reduce(
    (total, evaluacion) => total + evaluacion.totalRespondidas,
    0,
  );
  const supervisedCount = evals.filter((evaluacion) => evaluacion.modoSupervision).length;

  const redirectBase = selectedEvaluacionId
    ? `/docente/asignaturas/${asigId}/evaluaciones?evaluacionId=${selectedEvaluacionId}`
    : `/docente/asignaturas/${asigId}/evaluaciones`;

  return (
    <section className="space-y-5">
      <header>
        <p className="text-sm text-text-secondary dark:text-gray-400">
          {asig.nombre} · {asig.estado}
        </p>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Evaluaciones
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Diseña instrumentos, organiza preguntas y sigue respuestas de tu sección.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Publicadas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{publishedCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Ya visibles para estudiantes matriculados.
          </p>
        </article>
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Respuestas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{answeredCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Intentos acumulados en la sección.
          </p>
        </article>
        <article className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
            Supervisadas
          </p>
          <p className="mt-2 text-2xl font-bold text-text-primary dark:text-white">{supervisedCount}</p>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Trazabilidad activa en integridad.
          </p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-base font-semibold text-text-primary dark:text-white">
            Nueva evaluación
          </h2>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Se crea en borrador. La publicación sigue siendo control de administración.
          </p>
          <form action={crearEvaluacionFormAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="asignaturaId" value={asigId} />
            <input type="hidden" name="redirectTo" value={redirectBase} />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Título
              </label>
              <input
                name="titulo"
                required
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Tipo
              </label>
              <select
                name="tipo"
                defaultValue="examen"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="examen">Examen</option>
                <option value="formulario">Formulario</option>
                <option value="tarea">Tarea</option>
                <option value="proyecto">Proyecto</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Ponderación
              </label>
              <input
                name="ponderacion"
                type="number"
                min="0"
                max="100"
                step="0.01"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Inicio
              </label>
              <input
                name="fechaInicio"
                type="datetime-local"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Límite
              </label>
              <input
                name="fechaLimite"
                type="datetime-local"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Tiempo (min)
              </label>
              <input
                name="tiempoMinutos"
                type="number"
                min="1"
                max="600"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Intentos
              </label>
              <input
                name="intentosMax"
                type="number"
                min="1"
                max="5"
                defaultValue="1"
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                Instrucciones
              </label>
              <textarea
                name="instrucciones"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
              >
                Guardar borrador
              </button>
            </div>
          </form>
        </article>

        <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Historial de la sección
            </h2>
          </div>
          {evals.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
              No hay evaluaciones registradas para esta sección.
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {evals.map((evaluacion) => {
                const href = `/docente/asignaturas/${asigId}/evaluaciones?evaluacionId=${evaluacion.id}`;
                const selected = evaluacion.id === selectedEvaluacionId;

                return (
                  <a
                    key={evaluacion.id}
                    href={href}
                    className={`block px-5 py-4 transition-colors ${
                      selected
                        ? "bg-primary/[0.06] dark:bg-primary/10"
                        : "hover:bg-primary/[0.02] dark:hover:bg-primary/5"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-text-primary dark:text-white">{evaluacion.titulo}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${EVALUATION_WINDOW_TONES[evaluacion.estadoVentana]}`}>
                        {EVALUATION_WINDOW_LABELS[evaluacion.estadoVentana]}
                      </span>
                      {evaluacion.modoSupervision ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Supervisada
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                      {TIPO_LABELS[evaluacion.tipo] ?? evaluacion.tipo} · {evaluacion.totalPreguntas} pregunta(s)
                    </p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-secondary dark:text-gray-400">
                      <span>{evaluacion.totalRespondidas} respuesta(s)</span>
                      <span>{evaluacion.totalCalificadas} calificada(s)</span>
                      {evaluacion.duracionMinutos ? (
                        <span>{evaluacion.duracionMinutos} min</span>
                      ) : null}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </article>
      </div>

      {selectedEvaluacion ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Maquetador de preguntas
                </h2>
                <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                  {selectedEvaluacion.titulo} · {TIPO_LABELS[selectedEvaluacion.tipo] ?? selectedEvaluacion.tipo}
                </p>
              </div>
              <a
                href={`/admin/evaluaciones?asignaturaId=${asigId}&evaluacionId=${selectedEvaluacion.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 dark:border-primary-light/30 dark:text-primary-light dark:hover:bg-primary/20"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                Ver gestión
              </a>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Preguntas
                </p>
                <p className="mt-1 text-xl font-bold text-text-primary dark:text-white">
                  {selectedEvaluacion.totalPreguntas}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Tiempo
                </p>
                <p className="mt-1 text-xl font-bold text-text-primary dark:text-white">
                  {selectedEvaluacion.duracionMinutos ? `${selectedEvaluacion.duracionMinutos} min` : "Libre"}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200/70 bg-gray-50/70 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Límite
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary dark:text-white">
                  {formatDateTime(selectedEvaluacion.fechaLimite)}
                </p>
              </div>
            </div>

            <form action={agregarPreguntaFormAction} className="mt-5 space-y-3">
              <input type="hidden" name="evaluacionId" value={selectedEvaluacion.id} />
              <input type="hidden" name="asignaturaId" value={asigId} />
              <input type="hidden" name="redirectTo" value={redirectBase} />
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                  Enunciado
                </label>
                <textarea
                  name="enunciado"
                  rows={3}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    defaultValue="opcion_multiple"
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="opcion_multiple">Selección múltiple</option>
                    <option value="verdadero_falso">Verdadero/Falso</option>
                    <option value="respuesta_corta">Respuesta corta</option>
                    <option value="desarrollo">Desarrollo</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Puntaje
                  </label>
                  <input
                    name="puntaje"
                    type="number"
                    defaultValue="1"
                    min="0.1"
                    step="0.1"
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Orden
                  </label>
                  <input
                    name="orden"
                    type="number"
                    min="1"
                    defaultValue={preguntas.length + 1}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    name="opcion"
                    placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`}
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    Correcta (0-3 o true/false)
                  </label>
                  <input
                    name="correcta"
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-text-primary dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
                  >
                    Agregar pregunta
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              {preguntas.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-sm text-text-secondary dark:border-gray-700 dark:text-gray-400">
                  Todavía no agregas preguntas a esta evaluación.
                </p>
              ) : (
                preguntas.map((pregunta, index) => (
                  <div key={pregunta.id} className="rounded-xl border border-gray-200/80 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary dark:text-white">
                          {index + 1}. {pregunta.enunciado}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                          {PREGUNTA_LABELS[pregunta.tipo] ?? pregunta.tipo} · Puntaje {pregunta.puntaje ?? "1"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <div className="space-y-5">
            <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Resultados
                </h2>
              </div>
              {resultados.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
                  Aún no hay respuestas registradas.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {resultados.map((resultado) => (
                    <div key={resultado.matriculaId} className="flex items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary dark:text-white">
                          {resultado.alumnoNombre} {resultado.alumnoApellido}
                        </p>
                        <p className="text-xs text-text-secondary dark:text-gray-400">
                          {resultado.alumnoRut ?? "Sin RUT"} · {formatDateTime(resultado.fechaNota)}
                        </p>
                      </div>
                      <span className="text-base font-bold text-primary dark:text-primary-light">
                        {resultado.nota ?? "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            {respuestasPendientes.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-900/20">
                <h3 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Corrección manual ({respuestasPendientes.filter((r) => !r.notaActual).length} pendientes)
                </h3>
                <div className="space-y-4">
                  {respuestasPendientes.map((item) => (
                    <div key={item.respuestaId} className="rounded-lg border border-amber-100 bg-white p-4 dark:border-amber-900/30 dark:bg-gray-900">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-gray-400">
                        {item.alumnoApellido}, {item.alumnoNombre} — {item.alumnoRut}
                      </p>
                      <p className="mt-1 text-sm font-medium text-text-primary dark:text-white">{item.enunciado}</p>
                      <blockquote className="mt-2 rounded-md border-l-4 border-amber-300 bg-amber-50/50 px-3 py-2 text-sm text-text-primary dark:border-amber-700 dark:bg-amber-900/30 dark:text-gray-200">
                        {item.respuesta ?? <em className="text-text-secondary">Sin respuesta</em>}
                      </blockquote>
                      {item.notaActual ? (
                        <p className="mt-2 text-xs text-green-700 dark:text-green-400">
                          Nota: <strong>{item.notaActual}</strong>
                        </p>
                      ) : null}
                      <form action={calificarRespuestaEvaluacionFormAction} className="mt-3 flex flex-wrap items-end gap-3">
                        <input type="hidden" name="evaluacionId" value={selectedEvaluacionId ?? ""} />
                        <input type="hidden" name="matriculaId" value={item.matriculaId} />
                        <input type="hidden" name="redirectTo" value={`/docente/asignaturas/${asigId}/evaluaciones?evaluacionId=${selectedEvaluacionId ?? ""}`} />
                        <div>
                          <label className="block text-xs font-medium text-text-secondary dark:text-gray-400">
                            Nota (1.0–7.0)
                          </label>
                          <input
                            type="number"
                            name="nota"
                            min="1"
                            max="7"
                            step="0.1"
                            defaultValue={item.notaActual ?? ""}
                            required
                            className="mt-1 w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-text-secondary dark:text-gray-400">
                            Observación (opcional)
                          </label>
                          <input
                            type="text"
                            name="observacion"
                            maxLength={500}
                            placeholder="Retroalimentación para el alumno..."
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          />
                        </div>
                        <button
                          type="submit"
                          className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark"
                        >
                          {item.notaActual ? "Actualizar" : "Registrar nota"}
                        </button>
                      </form>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <article className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <h2 className="text-base font-semibold text-text-primary dark:text-white">
                  Supervisión
                </h2>
              </div>
              {eventosSupervision.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-text-secondary dark:text-gray-400">
                  No hay eventos de supervisión para esta evaluación.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {eventosSupervision.slice(-8).reverse().map((evento) => (
                    <div key={evento.id} className="px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-primary dark:text-white">
                          {evento.tipo}
                        </p>
                        <span className="text-xs text-text-secondary dark:text-gray-400">
                          {formatDateTime(evento.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                        {evento.alumnoNombre
                          ? `${evento.alumnoNombre} ${evento.alumnoApellido ?? ""}`
                          : "Alumno no disponible"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}
