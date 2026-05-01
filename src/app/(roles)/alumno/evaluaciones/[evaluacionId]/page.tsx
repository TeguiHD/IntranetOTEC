import { CalendarDays, CheckCircle, ClipboardList, Clock, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import {
  asegurarIntentoEvaluacionActivo,
  listarEvaluacionesAlumno,
  listarPreguntasAlumnoByEvaluacion,
  listarResultadosEvaluacionAlumno,
} from "@/actions/evaluaciones";
import { obtenerEntregasAlumno } from "@/actions/entregas";

import { EvaluacionForm } from "./EvaluacionForm";
import { EntregaSection } from "./EntregaSection";

type AlumnoEvaluacionPageProps = {
  params: Promise<{ evaluacionId: string }>;
  searchParams?: Promise<{ state?: string }>;
};

const TIPO_LABELS: Record<string, string> = {
  formulario: "Formulario",
  tarea: "Tarea",
  examen: "Examen",
  proyecto: "Proyecto",
};

export default async function AlumnoEvaluacionPage({
  params,
  searchParams,
}: AlumnoEvaluacionPageProps) {
  const { evaluacionId } = await params;
  const sp = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const state = sp?.state;

  const evaluaciones = await listarEvaluacionesAlumno();
  const evaluacion = evaluaciones.find((e) => e.id === evaluacionId);

  if (!evaluacion) notFound();

  const esTareaOProyecto = evaluacion.tipo === "tarea" || evaluacion.tipo === "proyecto";

  const [preguntas, entregasPrevias] = await Promise.all([
    listarPreguntasAlumnoByEvaluacion(evaluacionId),
    esTareaOProyecto ? obtenerEntregasAlumno(evaluacionId) : Promise.resolve([]),
  ]);
  const intentoActivo =
    !esTareaOProyecto && evaluacion.duracionMinutos
      ? await asegurarIntentoEvaluacionActivo(evaluacionId)
      : null;
  const isSubmitted = state === "respuestas_enviadas";
  const resultados = isSubmitted
    ? await listarResultadosEvaluacionAlumno(evaluacionId)
    : [];
  const isOverdue = evaluacion.fechaLimite && new Date(evaluacion.fechaLimite) < new Date();
  const hasError = [
    "error",
    "max_intentos_reached",
    "not_enrolled",
    "deadline_passed",
    "not_open_yet",
    "attempt_required",
    "attempt_invalid",
    "attempt_expired",
  ].includes(state ?? "");

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold text-text-primary dark:text-white sm:text-2xl">
              {evaluacion.titulo}
            </h1>
          </div>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            {evaluacion.asignaturaNombre}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {TIPO_LABELS[evaluacion.tipo] ?? evaluacion.tipo}
          </span>
          {evaluacion.ponderacion && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
              {evaluacion.ponderacion}%
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-wrap gap-4 text-sm text-text-secondary dark:text-gray-400">
        {evaluacion.fechaInicio && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Inicio:{" "}
            {new Date(evaluacion.fechaInicio).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
        {evaluacion.fechaLimite && (
          <span className={`flex items-center gap-1.5 ${isOverdue ? "text-danger" : ""}`}>
            <CalendarDays className="h-4 w-4" />
            {isOverdue ? "Venció el " : "Límite: "}
            {new Date(evaluacion.fechaLimite).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <ClipboardList className="h-4 w-4" />
          {evaluacion.totalPreguntas} pregunta{evaluacion.totalPreguntas !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" />
          Intentos máximos: {evaluacion.intentosMax ?? 1}
        </span>
        {evaluacion.duracionMinutos ? (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Tiempo por intento: {evaluacion.duracionMinutos} min
          </span>
        ) : null}
      </div>

      {evaluacion.instrucciones && (
        <article className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-text-secondary dark:border-primary/30 dark:bg-primary/10 dark:text-gray-300">
          {evaluacion.instrucciones}
        </article>
      )}

      {evaluacion.modoSupervision && (
        <article className="rounded-xl border border-cyan-300/60 bg-cyan-50 p-4 text-sm text-cyan-900 dark:border-cyan-700/60 dark:bg-cyan-950/30 dark:text-cyan-100">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">Evaluación supervisada</p>
              <p className="mt-1 text-cyan-800/80 dark:text-cyan-100/75">
                Se registran eventos de integridad como salida de pestaña, pérdida de foco, copia/pega, menú contextual y tiempo aproximado por pregunta.
              </p>
            </div>
          </div>
        </article>
      )}

      {isSubmitted && (
        <article className="rounded-xl border border-success/30 bg-success/5 p-6 dark:border-success/40 dark:bg-success/10">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-success" />
            <div>
              <p className="font-semibold text-success">Respuestas enviadas correctamente</p>
              <p className="mt-0.5 text-sm text-text-secondary dark:text-gray-400">
                Tu evaluación ha sido registrada.
              </p>
            </div>
          </div>
        </article>
      )}

      {isSubmitted && resultados.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-4 text-sm font-semibold text-text-primary dark:text-white">
            Resultados de tu evaluación
          </h2>
          <ol className="space-y-3">
            {resultados.map((r, idx) => (
              <li
                key={r.preguntaId}
                className={`rounded-lg border p-3 ${
                  r.esCorrecta === true
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                    : r.esCorrecta === false
                      ? "border-red-200 bg-red-50/60 dark:border-red-800/50 dark:bg-red-950/20"
                      : "border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/40"
                }`}
              >
                <p className="text-sm font-medium text-text-primary dark:text-white">
                  {idx + 1}. {r.enunciado}
                </p>
                <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                  Tu respuesta:{" "}
                  <span className="font-medium">{r.respuesta ?? "—"}</span>
                </p>
                {r.esCorrecta !== null && (
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      r.esCorrecta
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    }`}
                  >
                    {r.esCorrecta ? "Correcta" : "Incorrecta"}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {hasError && (
        <article className="rounded-xl border border-danger/30 bg-danger/5 p-6 dark:border-danger/40 dark:bg-danger/10">
          <p className="text-sm font-medium text-danger">
            {state === "max_intentos_reached"
              ? "Has alcanzado el número máximo de intentos para esta evaluación."
              : state === "not_enrolled"
                ? "No tienes matrícula en esta asignatura."
              : state === "deadline_passed"
                  ? "La evaluación ya venció y no acepta respuestas."
                  : state === "not_open_yet"
                    ? "La evaluación todavía no se encuentra habilitada."
                    : state === "attempt_required"
                      ? "Debes iniciar un intento válido para responder esta evaluación."
                      : state === "attempt_invalid"
                        ? "Tu intento activo ya no está disponible. Recarga la página para continuar."
                        : state === "attempt_expired"
                          ? "Tu tiempo por intento expiró antes del envío. Puedes continuar solo si aún tienes intentos disponibles."
                    : "No fue posible enviar las respuestas. Intenta nuevamente."}
          </p>
        </article>
      )}

      {!esTareaOProyecto && evaluacion.duracionMinutos && !isSubmitted && !intentoActivo && (
        <article className="rounded-xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
          No hay un intento temporizado disponible ahora mismo. Esto puede ocurrir si agotaste los
          intentos o si un intento previo venció y la evaluación ya no admite otro.
        </article>
      )}

      {/* Sección de entrega de archivo (tarea/proyecto) */}
      {esTareaOProyecto && (
        <EntregaSection
          evaluacionId={evaluacionId}
          entregas={entregasPrevias}
          intentosMax={evaluacion.intentosMax ?? 1}
          fechaLimite={evaluacion.fechaLimite ?? null}
        />
      )}

      {/* Formulario de preguntas (formulario/examen) */}
      {!esTareaOProyecto && !isSubmitted && preguntas.length === 0 && (
        <article className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <p className="text-center text-sm text-text-secondary dark:text-gray-400">
            Esta evaluación no tiene preguntas disponibles aún.
          </p>
        </article>
      )}

      {!esTareaOProyecto &&
        !isSubmitted &&
        preguntas.length > 0 &&
        (!evaluacion.duracionMinutos || intentoActivo) && (
        <EvaluacionForm
          evaluacionId={evaluacionId}
          preguntas={preguntas}
          supervisionEnabled={Boolean(evaluacion.modoSupervision)}
          duracionMinutos={evaluacion.duracionMinutos ?? null}
          intentoActivo={intentoActivo}
        />
      )}
    </section>
  );
}
