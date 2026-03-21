"use client";

import { useState } from "react";

import { enviarRespuestasFormAction } from "@/actions/evaluaciones";
import type { PreguntaItem } from "@/actions/evaluaciones";

type EvaluacionFormProps = {
  evaluacionId: string;
  preguntas: PreguntaItem[];
};

type OpcionMultipleData = {
  opciones: string[];
  correcta: number;
};

export function EvaluacionForm({ evaluacionId, preguntas }: EvaluacionFormProps) {
  const [pending, setPending] = useState(false);

  const handleSubmit = () => {
    setPending(true);
  };

  return (
    <form action={enviarRespuestasFormAction} onSubmit={handleSubmit} className="space-y-6">
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
                {pregunta.puntaje && Number(pregunta.puntaje) > 0 && (
                  <span className="ml-2 text-xs font-normal text-text-secondary dark:text-gray-400">
                    ({pregunta.puntaje} pto{Number(pregunta.puntaje) !== 1 ? "s" : ""})
                  </span>
                )}
              </p>
            </div>

            {/* Opción múltiple */}
            {pregunta.tipo === "opcion_multiple" && (() => {
              const opts = pregunta.opciones as OpcionMultipleData | null;
              if (!opts?.opciones) return null;
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

            {/* Verdadero / Falso */}
            {pregunta.tipo === "verdadero_falso" && (
              <div className="ml-10 flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:border-primary dark:has-[:checked]:bg-primary/10">
                  <input
                    type="radio"
                    name={fieldName}
                    value="true"
                    className="h-4 w-4 accent-primary"
                    required
                  />
                  <span className="text-sm font-medium text-text-primary dark:text-gray-200">
                    Verdadero
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:border-primary dark:has-[:checked]:bg-primary/10">
                  <input
                    type="radio"
                    name={fieldName}
                    value="false"
                    className="h-4 w-4 accent-primary"
                    required
                  />
                  <span className="text-sm font-medium text-text-primary dark:text-gray-200">
                    Falso
                  </span>
                </label>
              </div>
            )}

            {/* Respuesta corta */}
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

            {/* Desarrollo */}
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
