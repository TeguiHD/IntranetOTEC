"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  enviarRespuestasFormAction,
  type IntentoEvaluacionActivo,
  registrarEventoSupervisionAction,
  type PreguntaItem,
} from "@/actions/evaluaciones";
import { coerceScaleQuestionOptions } from "@/lib/surveyTemplates";

type EvaluacionFormProps = {
  evaluacionId: string;
  preguntas: PreguntaItem[];
  supervisionEnabled?: boolean;
  duracionMinutos?: number | null;
  intentoActivo?: IntentoEvaluacionActivo | null;
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

export function EvaluacionForm({
  evaluacionId,
  preguntas,
  supervisionEnabled = false,
  duracionMinutos = null,
  intentoActivo = null,
}: EvaluacionFormProps) {
  const [pending, setPending] = useState(false);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    const expiracionAt = intentoActivo?.expiracionAt;
    if (!expiracionAt) return null;
    return Math.max(
      0,
      Math.floor((new Date(expiracionAt).getTime() - Date.now()) / 1000),
    );
  });
  const activeQuestionRef = useRef<string | null>(null);
  const activeStartedAtRef = useRef<number>(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const answeredCount = preguntas.reduce(
    (total, pregunta) => total + (answered[pregunta.id] ? 1 : 0),
    0,
  );
  const progressPercent = preguntas.length > 0
    ? Math.round((answeredCount / preguntas.length) * 100)
    : 0;

  useEffect(() => {
    const expiracionAt = intentoActivo?.expiracionAt;
    if (!expiracionAt) return;

    const tick = () => {
      const next = Math.max(
        0,
        Math.floor((new Date(expiracionAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(next);
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [intentoActivo?.expiracionAt]);

  const logEvent = useCallback(
    (tipo: string, payload?: Record<string, unknown>) => {
      if (!supervisionEnabled) return;
      registrarEventoSupervisionAction({ evaluacionId, tipo, payload }).catch(() => {});
    },
    [evaluacionId, supervisionEnabled],
  );

  const flushQuestionTime = useCallback(
    (reason: string) => {
      const questionId = activeQuestionRef.current;
      if (!questionId) return;
      const now = Date.now();
      const seconds = Math.max(0, Math.round((now - activeStartedAtRef.current) / 1000));
      if (seconds > 0) {
        logEvent("question_time", { questionId, seconds, reason });
      }
      activeStartedAtRef.current = now;
    },
    [logEvent],
  );

  const activateQuestion = useCallback(
    (questionId: string) => {
      if (!supervisionEnabled) return;
      if (activeQuestionRef.current === questionId) return;
      flushQuestionTime("question_change");
      activeQuestionRef.current = questionId;
      activeStartedAtRef.current = Date.now();
    },
    [flushQuestionTime, supervisionEnabled],
  );

  const markAnswered = useCallback((questionId: string, value: FormDataEntryValue | null) => {
    const isAnswered = typeof value === "string" ? value.trim().length > 0 : value !== null;
    setAnswered((current) =>
      current[questionId] === isAnswered ? current : { ...current, [questionId]: isAnswered },
    );
  }, []);

  useEffect(() => {
    if (!supervisionEnabled) return;

    logEvent("supervision_start", {
      questions: preguntas.length,
      userAgent: navigator.userAgent,
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushQuestionTime("page_hidden");
        logEvent("page_hidden", { visibilityState: document.visibilityState });
      }
    };
    const onBlur = () => {
      flushQuestionTime("window_blur");
      logEvent("window_blur");
    };
    const onCopy = () => logEvent("copy");
    const onCut = () => logEvent("cut");
    const onPaste = () => logEvent("paste");
    const onContextMenu = () => logEvent("context_menu");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") {
        logEvent("printscreen_key", {
          note: "Intento parcial; capturas de pantalla no son detectables de forma confiable desde navegador.",
        });
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      flushQuestionTime("unmount");
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [flushQuestionTime, logEvent, preguntas.length, supervisionEnabled]);

  useEffect(() => {
    if (remainingSeconds !== 0) return;
    if (!intentoActivo) return;
    flushQuestionTime("timer_expired");
    logEvent("timer_expired_autosubmit");
    const id = window.setTimeout(() => {
      formRef.current?.requestSubmit();
    }, 300);
    return () => window.clearTimeout(id);
  }, [remainingSeconds, intentoActivo, flushQuestionTime, logEvent]);

  return (
    <form
      ref={formRef}
      action={enviarRespuestasFormAction}
      onSubmit={() => {
        flushQuestionTime("submit");
        logEvent("submit_flush");
        setPending(true);
      }}
      className="space-y-6 pb-24 sm:pb-0"
    >
      <input type="hidden" name="evaluacionId" value={evaluacionId} />
      {intentoActivo ? <input type="hidden" name="intentoId" value={intentoActivo.intentoId} /> : null}

      <div className="sticky top-3 z-10 overflow-hidden rounded-2xl border border-primary/20 bg-white/95 shadow-sm backdrop-blur dark:border-primary/30 dark:bg-gray-950/95">
        {duracionMinutos && intentoActivo && remainingSeconds !== null ? (
          <div className={`border-b px-4 py-3 text-sm ${
            remainingSeconds <= 300
              ? "border-danger/20 bg-danger/5 text-danger"
              : "border-primary/10 bg-primary/5 text-text-primary dark:text-gray-100"
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  Intento {intentoActivo.intento} en curso
                </p>
                <p className="hidden text-xs opacity-80 sm:block">
                  Tiempo estricto de {duracionMinutos} minutos desde la apertura del intento.
                </p>
              </div>
              <p className="shrink-0 text-xl font-bold tabular-nums">
                {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                {String(remainingSeconds % 60).padStart(2, "0")}
              </p>
            </div>
          </div>
        ) : null}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-text-secondary dark:text-gray-400">
            <p>
              {answeredCount}/{preguntas.length} respondidas
            </p>
            <p className="tabular-nums">{progressPercent}%</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <nav
            aria-label="Navegación de preguntas"
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
          >
            {preguntas.map((pregunta, index) => (
              <a
                key={pregunta.id}
                href={`#pregunta-${pregunta.id}`}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  answered[pregunta.id]
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-white text-text-secondary hover:border-primary hover:text-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                }`}
              >
                {index + 1}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div aria-live="polite" className="sr-only">
        {answeredCount} de {preguntas.length} preguntas respondidas.
      </div>

      {preguntas.map((pregunta, idx) => {
        const fieldName = `respuesta_${pregunta.id}`;

        return (
          <fieldset
            id={`pregunta-${pregunta.id}`}
            key={pregunta.id}
            onFocus={() => activateQuestion(pregunta.id)}
            onPointerEnter={() => activateQuestion(pregunta.id)}
            className="scroll-mt-36 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5"
          >
            <legend className="sr-only">Pregunta {idx + 1}</legend>
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary dark:bg-primary/20 dark:text-primary-light">
                {idx + 1}
              </span>
              <p className="min-w-0 text-sm font-medium leading-relaxed text-text-primary dark:text-gray-100">
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
                    <div className="space-y-3 sm:ml-10">
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
                              onChange={(event) => markAnswered(pregunta.id, event.currentTarget.value)}
                              required
                            />
                            <span className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-300 bg-white text-sm font-semibold text-text-primary transition-colors hover:border-primary hover:bg-primary/5 peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-primary-light dark:hover:bg-primary/10 dark:peer-checked:border-primary-light dark:peer-checked:bg-primary-light dark:peer-checked:text-gray-900">
                              {opcion}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2 sm:ml-10">
                    {opts.opciones.map((opcion, optIdx) => (
                      <label
                        key={optIdx}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:border-primary dark:has-[:checked]:bg-primary/10"
                      >
                        <input
                          type="radio"
                          name={fieldName}
                          value={String(optIdx)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                          onChange={(event) => markAnswered(pregunta.id, event.currentTarget.value)}
                          required
                        />
                        <span className="min-w-0 text-sm text-text-primary dark:text-gray-200">
                          {opcion}
                        </span>
                      </label>
                    ))}
                  </div>
                );
              })()}

            {pregunta.tipo === "verdadero_falso" && (
              <div className="grid gap-2 sm:ml-10 sm:flex sm:gap-3">
                {["true", "false"].map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:has-[:checked]:border-primary dark:has-[:checked]:bg-primary/10"
                  >
                    <input
                      type="radio"
                      name={fieldName}
                      value={value}
                      className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onChange={(event) => markAnswered(pregunta.id, event.currentTarget.value)}
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
              <div className="sm:ml-10">
                <textarea
                  name={fieldName}
                  rows={3}
                  required
                  placeholder="Escribe tu respuesta aquí…"
                  onChange={(event) => markAnswered(pregunta.id, event.currentTarget.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            )}

            {pregunta.tipo === "desarrollo" && (
              <div className="sm:ml-10">
                <textarea
                  name={fieldName}
                  rows={6}
                  required
                  placeholder="Desarrolla tu respuesta aquí…"
                  onChange={(event) => markAnswered(pregunta.id, event.currentTarget.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            )}
          </fieldset>
        );
      })}

      <div className="hidden justify-end sm:flex">
        <button
          type="submit"
          disabled={pending || remainingSeconds === 0}
          className="flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-white transition-transform hover:bg-primary-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        >
          {pending
            ? "Enviando…"
            : remainingSeconds === 0 && intentoActivo
              ? "Enviando automáticamente…"
              : "Enviar Respuestas"}
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/95 sm:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-text-primary dark:text-white">
              {answeredCount}/{preguntas.length} respondidas
            </p>
            {remainingSeconds !== null ? (
              <p className={`text-xs tabular-nums ${remainingSeconds <= 300 ? "text-danger" : "text-text-secondary dark:text-gray-400"}`}>
                {String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:
                {String(remainingSeconds % 60).padStart(2, "0")} restantes
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending || remainingSeconds === 0}
            className="shrink-0 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {pending
              ? "Enviando…"
              : remainingSeconds === 0 && intentoActivo
                ? "Enviando…"
                : "Enviar"}
          </button>
        </div>
      </div>
    </form>
  );
}
