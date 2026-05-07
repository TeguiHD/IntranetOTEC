import { CheckCircle2, ClipboardList, Lock, MessageSquare } from "lucide-react";
import Link from "next/link";

import {
  enviarRespuestasEncuestaFormAction,
  obtenerEncuestaParaResponder,
} from "@/actions/encuestas-unificadas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { SurveyCard, SurveyShell } from "@/components/shared/surveys/SurveyShell";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_completada: { tone: "success", text: "¡Respuestas enviadas! Gracias por completar la encuesta." },
  already_completed: { tone: "error", text: "Ya habías respondido esta encuesta." },
  error: { tone: "error", text: "No fue posible enviar las respuestas. Inténtalo de nuevo." },
};

const TIPO_ICONS: Record<string, { label: string; color: string }> = {
  likert: { label: "Escala numérica", color: "text-violet-500" },
  si_no: { label: "Sí / No", color: "text-blue-500" },
  texto_libre: { label: "Texto libre", color: "text-emerald-500" },
  opcion_multiple: { label: "Selección", color: "text-amber-500" },
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
  const totalPreguntas = encuesta.preguntas.length;
  const heroStats: Array<{
    label: string;
    value: string | number;
    tone: "primary" | "emerald" | "amber" | "slate" | "rose";
  }> = [
    { label: "Preguntas", value: totalPreguntas, tone: "primary" },
    {
      label: "Estado",
      value: completada ? "Respondida" : "Pendiente",
      tone: completada ? "emerald" : "slate",
    },
    {
      label: "Tipo",
      value: encuesta.obligatoria ? "Obligatoria" : "Voluntaria",
      tone: encuesta.obligatoria ? "amber" : "primary",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <SurveyShell
        icon={ClipboardList}
        title={encuesta.titulo}
        description={encuesta.asignaturaNombre}
        stats={heroStats}
        badge={
          encuesta.obligatoria ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Lock className="h-3 w-3" />
              Obligatoria
            </span>
          ) : undefined
        }
      >
        <RouteStateToast state={sp.state} map={STATUS_MAP} />

        {encuesta.instrucciones && (
          <SurveyCard className="p-4">
            <p className="flex items-start gap-2 text-sm text-text-secondary dark:text-gray-300">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {encuesta.instrucciones}
            </p>
          </SurveyCard>
        )}

      {completada ? (
        /* Already answered */
        <SurveyCard className="flex flex-col items-center gap-4 border-emerald-200 bg-emerald-50 py-12 text-center dark:border-emerald-800/40 dark:bg-emerald-950/20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
              Encuesta completada
            </p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">
              Ya respondiste esta encuesta. Gracias por tu participación.
            </p>
          </div>
          <Link
            href="/encuestas"
            className="mt-2 rounded-xl border border-emerald-300 bg-white px-5 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            Volver a mis encuestas
          </Link>
        </SurveyCard>
      ) : (
        /* Survey form */
        <form action={enviarRespuestasEncuestaFormAction} className="space-y-4">
          <input type="hidden" name="evaluacionId" value={id} />

          {encuesta.preguntas.map((pregunta, idx) => {
            const opts = pregunta.opciones as Record<string, unknown> | null;
            const tipo = pregunta.tipo;
            const tipoInfo = TIPO_ICONS[tipo] ?? { label: tipo, color: "text-gray-500" };

            return (
              <article
                key={pregunta.id}
                className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug text-text-primary dark:text-gray-100">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    {pregunta.enunciado}
                  </p>
                  <span className={`shrink-0 text-[10px] font-medium ${tipoInfo.color}`}>
                    {tipoInfo.label}
                  </span>
                </div>

                {tipo === "likert" && opts && (
                  <div className="space-y-2">
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
                            className="peer sr-only" inputMode="text"
                          />
                          <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-gray-200 bg-white text-sm font-semibold text-text-secondary transition-[background-color,border-color,color,box-shadow,opacity,transform] peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
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
                          className="peer sr-only" inputMode="text"
                        />
                        <span className="flex h-12 items-center justify-center rounded-xl border-2 border-gray-200 bg-white px-8 text-sm font-semibold text-text-secondary transition-[background-color,border-color,color,box-shadow,opacity,transform] peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white peer-checked:shadow-md peer-checked:shadow-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {v}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {tipo === "opcion_multiple" && opts && Array.isArray(opts.opciones) && (
                  <div className="space-y-2">
                    {(opts.opciones as string[]).map((v) => (
                      <label key={v} className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 transition-[background-color,border-color,color,box-shadow,opacity,transform] has-[:checked]:border-primary has-[:checked]:bg-primary/5 hover:border-primary/30 dark:border-gray-700 dark:bg-gray-800">
                        <input
                          type="radio"
                          name={`resp_${pregunta.id}`}
                          value={v}
                          required
                          className="h-4 w-4 accent-primary" inputMode="text"
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
              </article>
            );
          })}

          {encuesta.preguntas.length === 0 && (
            <SurveyCard className="p-8 text-center">
              <p className="text-sm text-text-secondary dark:text-gray-400">
                Esta encuesta aún no tiene preguntas.
              </p>
            </SurveyCard>
          )}

          {encuesta.preguntas.length > 0 && (
            <SurveyCard className="p-5">
              {encuesta.obligatoria && (
                <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-950/20 dark:text-amber-400">
                  <Lock className="h-3 w-3 shrink-0" />
                  Esta encuesta es obligatoria. Debes completarla para continuar usando el portal.
                </p>
              )}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg active:scale-[0.98]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Enviar respuestas
              </button>
            </SurveyCard>
          )}
        </form>
      )}
      </SurveyShell>
    </div>
  );
}
