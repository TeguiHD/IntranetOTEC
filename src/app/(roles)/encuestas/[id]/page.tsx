import { CheckCircle2, ClipboardList, Lock } from "lucide-react";

import {
  enviarRespuestasEncuestaFormAction,
  obtenerEncuestaParaResponder,
} from "@/actions/encuestas-unificadas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_completada: { tone: "success", text: "¡Respuestas enviadas! Gracias por completar la encuesta." },
  already_completed: { tone: "error", text: "Ya habías respondido esta encuesta." },
  error: { tone: "error", text: "No fue posible enviar las respuestas. Inténtalo de nuevo." },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ state?: string }>;
};

export const metadata = { title: "Responder Encuesta" };

export default async function EncuestaResponderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await (searchParams ?? Promise.resolve({} as { state?: string }));

  const encuesta = await obtenerEncuestaParaResponder(id);

  if (!encuesta) {
    return (
      <section className="flex flex-col items-center gap-4 py-20 text-center">
        <Lock className="h-12 w-12 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-lg font-semibold text-text-primary dark:text-white">
          Encuesta no disponible
        </p>
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No tienes acceso a esta encuesta o ya no está activa.
        </p>
      </section>
    );
  }

  const completada = sp.state === "encuesta_completada" || Boolean(encuesta.yaRespondio);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <RouteStateToast state={sp.state} map={STATUS_MAP} />

      {/* Header */}
      <header className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
          <ClipboardList className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-text-primary dark:text-white sm:text-2xl">
            {encuesta.titulo}
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            {encuesta.asignaturaNombre}
          </p>
          {encuesta.instrucciones && (
            <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
              {encuesta.instrucciones}
            </p>
          )}
        </div>
      </header>

      {completada ? (
        /* Already answered */
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 py-12 text-center dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
          <div>
            <p className="text-base font-semibold text-emerald-800 dark:text-emerald-300">
              Encuesta completada
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
              Ya respondiste esta encuesta. Gracias por tu participación.
            </p>
          </div>
        </div>
      ) : (
        /* Survey form */
        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <form action={enviarRespuestasEncuestaFormAction} className="space-y-8">
            <input type="hidden" name="evaluacionId" value={id} />

            {encuesta.preguntas.map((pregunta, idx) => {
              const opts = pregunta.opciones as Record<string, unknown> | null;
              const tipo = pregunta.tipo;

              return (
                <div key={pregunta.id} className="space-y-3">
                  <p className="text-sm font-medium leading-snug text-text-primary dark:text-gray-100">
                    <span className="mr-2 text-xs font-normal text-text-muted dark:text-gray-500">
                      {idx + 1}.
                    </span>
                    {pregunta.enunciado}
                    <span className="ml-1 text-danger">*</span>
                  </p>

                  {tipo === "likert" && opts && (
                    <div className="space-y-1">
                      {typeof opts.etiquetaMin === "string" && (
                        <div className="flex justify-between text-[11px] text-text-muted dark:text-gray-500">
                          <span>{opts.etiquetaMin}</span>
                          <span>{typeof opts.etiquetaMax === "string" ? opts.etiquetaMax : ""}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(opts.opciones) ? opts.opciones : []).map((val: unknown) => (
                          <label
                            key={String(val)}
                            className="flex cursor-pointer flex-col items-center gap-1"
                          >
                            <input
                              type="radio"
                              name={`resp_${pregunta.id}`}
                              value={String(val)}
                              required
                              className="peer sr-only"
                            />
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-text-secondary transition-all peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {String(val)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {tipo === "si_no" && (
                    <div className="flex gap-3">
                      {["Sí", "No"].map((v) => (
                        <label key={v} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="radio"
                            name={`resp_${pregunta.id}`}
                            value={v}
                            required
                            className="peer sr-only"
                          />
                          <span className="flex h-11 items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-6 text-sm font-semibold text-text-secondary transition-all peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            {v}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {tipo === "opcion_multiple" && opts && Array.isArray(opts.opciones) && (
                    <div className="space-y-2">
                      {(opts.opciones as string[]).map((v) => (
                        <label key={v} className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 transition-all hover:border-primary/30 hover:bg-primary/[0.02] dark:border-gray-700">
                          <input
                            type="radio"
                            name={`resp_${pregunta.id}`}
                            value={v}
                            required
                            className="h-4 w-4 accent-primary"
                          />
                          <span className="text-sm text-text-primary dark:text-gray-100">{v}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {tipo === "texto_libre" && (
                    <textarea
                      name={`resp_${pregunta.id}`}
                      required
                      rows={3}
                      placeholder="Escribe tu respuesta..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  )}
                </div>
              );
            })}

            {encuesta.preguntas.length === 0 && (
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Esta encuesta aún no tiene preguntas.
              </p>
            )}

            {encuesta.preguntas.length > 0 && (
              <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
                {encuesta.obligatoria && (
                  <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <Lock className="h-3 w-3" />
                    Esta encuesta es obligatoria. Debes completarla para continuar usando el portal.
                  </p>
                )}
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98]"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Enviar respuestas
                </button>
              </div>
            )}
          </form>
        </article>
      )}
    </section>
  );
}
