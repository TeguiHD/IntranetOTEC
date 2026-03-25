"use client";

import { useState } from "react";

import { enviarRespuestasFormAction, type PreguntaItem } from "@/actions/evaluaciones";
import { coerceScaleQuestionOptions } from "@/lib/surveyTemplates";

type EvaluacionFormProps = {
  evaluacionId: string;
  preguntas: PreguntaItem[];
};

type OpcionMultipleData = {
  opciones: string[];
  correcta?: number;
  modo?: string;
  escalaMin?: number;
  escalaMax?: number;
  etiquetaMin?: string;
  etiquetaMax?: string;
};

export function EvaluacionForm({ evaluacionId, preguntas }: EvaluacionFormProps) {
  const [pending, setPending] = useState(false);

  return (
    <form
      action={enviarRespuestasFormAction}
      onSubmit={() => setPending(true)}
      className="space-y-6"
    >
      <input type="hidden" name="evaluacionId" value={evaluacionId} />

      {preguntas.map((pregunta, idx) => {
        const fieldName = `respuesta_${pregunta.id}`;

        return (
          <fieldset
            key={pregunta.id}
            className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
          >
            <legend className="sr-only">Pregunta {idx + 1}</legend>
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                {idx + 1}
              </span>
              <p className="text-sm font-medium leading-relaxed text-text-primary dark:text-gray-100">
                {pregunta.enunciado}
              </p>
            </div>

            {pregunta.tipo === "opcion_multiple" &&
              (() => {
                const opts = pregunta.opciones as OpcionMultipleData | null;
                if (!opts?.opciones) return null;

                const scaleOptions = coerceScaleQuestionOptions(opts);
                if (scaleOptions) {
                  return (
                    <div className="ml-10 space-y-3">
                      <div className="flex items-center justify-between text-xs text-text-secondary dark:text-gray-400">
                        <span>
                          {scaleOptions.etiquetaMin ?? `Minimo ${scaleOptions.escalaMin}`}
                        </span>
                        <span>
                          {scaleOptions.etiquetaMax ?? `Maximo ${scaleOptions.escalaMax}`}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {scaleOptions.opciones.map((opcion) => (
                          <label key={opcion} className="cursor-pointer">
                            <input
                              type="radio"
                              name={fieldName}
                              value={opcion}
                              className="peer sr-only"
                              required
                            />
                            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-text-primary transition-all hover:border-primary hover:bg-primary/5 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-primary-light dark:hover:bg-primary/10 dark:peer-checked:border-primary-light dark:peer-checked:bg-primary-light dark:peer-checked:text-gray-900">
                              {opcion}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="ml-10 space-y-2">
                    {opts.opciones.map((opcion, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:border-primary dark:has-[:checked]:bg-primary/10"
                      >
                        <input
                          type="radio"
                          name={fieldName}
                          value={String(optIdx)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                          required
                        />
                        <span className="text-sm text-text-primary dark:text-gray-200">
                          {opcion}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })()}

            {pregunta.tipo === "verdadero_falso" && (
              <div className="ml-10 flex gap-3">
                {["true", "false"].map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:border-primary dark:has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="radio"
                      name={fieldName}
                      value={value}
                      className="h-4 w-4 accent-primary"
                      required
                    />
                    <span className="text-sm font-medium text-text-primary dark:text-gray-200">
                      {value === "true" ? "Verdadero" : "Falso"}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {pregunta.tipo === "respuesta_corta" && (
              <div className="ml-10">
                <textarea
                  name={fieldName}
                  rows={2}
                  required
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            )}

            {pregunta.tipo === "desarrollo" && (
              <div className="ml-10">
                <textarea
                  name={fieldName}
                  rows={5}
                  required
                  placeholder="Desarrolla tu respuesta aquí..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar Respuestas"}
        </button>
      </div>
    </form>
  );
}
