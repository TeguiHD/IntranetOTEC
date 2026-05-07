import { CheckCircle, ClipboardList, Star } from "lucide-react";

import {
  enviarEncuestaDocenteFormAction,
  listarEncuestasDisponiblesAlumno,
} from "@/actions/encuestas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { SurveyCard, SurveyShell } from "@/components/shared/surveys/SurveyShell";
import { PREGUNTAS_DOCENTE, PREGUNTAS_OTEC } from "@/lib/encuestaConstants";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  encuesta_submitted: { tone: "success", text: "Encuesta enviada correctamente. ¡Gracias por tu participación!" },
  already_submitted: { tone: "error", text: "Ya respondiste esta encuesta." },
  encuesta_disabled: { tone: "error", text: "La encuesta no está habilitada en este momento." },
  not_enrolled: { tone: "error", text: "No tienes matrícula activa en esta asignatura." },
  invalid_input: { tone: "error", text: "Datos inválidos. Asegúrate de responder todas las preguntas." },
  submit_failed: { tone: "error", text: "No fue posible enviar la encuesta. Intenta nuevamente." },
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Props = {
  searchParams?: Promise<{ state?: string; asignaturaId?: string }>;
};

function LikertRow({ name, label, scale }: { name: string; label: string; scale: 7 }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
      <p className="mb-3 text-sm font-medium text-text-primary dark:text-gray-200">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs text-text-secondary dark:text-gray-400">Muy en desacuerdo</span>
        {Array.from({ length: scale }, (_, i) => i + 1).map((val) => (
          <label key={val} className="flex cursor-pointer flex-col items-center gap-1">
            <input
              type="radio"
              name={name}
              value={String(val)}
              required
              className="peer sr-only" inputMode="text"
            />
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-sm font-bold text-text-secondary transition-[background-color,border-color,color,box-shadow,opacity,transform] peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white hover:border-primary/50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-400 dark:peer-checked:border-primary dark:peer-checked:bg-primary dark:peer-checked:text-white">
              {val}
            </span>
          </label>
        ))}
        <span className="text-xs text-text-secondary dark:text-gray-400">Muy de acuerdo</span>
      </div>
    </div>
  );
}

export const metadata = { title: "Evaluar Docente y OTEC" };

export default async function AlumnoEncuestaDocentePage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string; asignaturaId?: string }));
  const encuestas = await listarEncuestasDisponiblesAlumno();
  const pendientes = encuestas.filter((e) => !e.yaRespondio).length;
  const respondidas = encuestas.length - pendientes;

  const selectedIdRaw = typeof params?.asignaturaId === "string" ? params.asignaturaId : undefined;
  const selectedId =
    selectedIdRaw && UUID_REGEX.test(selectedIdRaw)
      ? selectedIdRaw
      : encuestas.find((e) => !e.yaRespondio)?.asignaturaId ?? encuestas[0]?.asignaturaId;

  const selected = encuestas.find((e) => e.asignaturaId === selectedId);

  return (
    <SurveyShell
      icon={ClipboardList}
      title="Evaluacion Docente y OTEC"
      description="Evalua a tu docente y al servicio OTEC con escala del 1 al 7. Tus respuestas ayudan a mejorar la calidad academica."
      stats={[
        { label: "Cursos con encuesta", value: encuestas.length, tone: "primary" },
        { label: "Pendientes", value: pendientes, tone: "amber" },
        { label: "Respondidas", value: respondidas, tone: "emerald" },
      ]}
    >
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      {encuestas.length === 0 ? (
        <SurveyCard className="p-8 text-center">
          <Star className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-text-secondary dark:text-gray-400">
            No tienes encuestas disponibles en este momento.
          </p>
          <p className="mt-1 text-xs text-text-muted dark:text-gray-500">
            Las encuestas se habilitan al finalizar cada curso.
          </p>
        </SurveyCard>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {encuestas.map((e) => (
              <a
                key={e.asignaturaId}
                href={`/alumno/encuesta-docente?asignaturaId=${encodeURIComponent(e.asignaturaId)}`}
                className={`group rounded-xl border px-4 py-3 text-sm transition-[background-color,border-color,color,box-shadow,opacity,transform] ${
                  e.asignaturaId === selectedId
                    ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10 dark:bg-primary/20"
                    : "border-gray-200 bg-white text-text-secondary hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/[0.04] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-primary/10"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {e.asignaturaNombre}
                    </p>
                    <p className="mt-0.5 text-xs opacity-80">
                      {e.asignaturaCodigo ? `[${e.asignaturaCodigo}]` : "Sin codigo"}
                    </p>
                  </div>
                  {e.yaRespondio && <CheckCircle className="h-4 w-4 shrink-0 text-success" />}
                </div>
                <p className="mt-2 text-xs font-medium opacity-80">
                  {e.yaRespondio ? "Respondida" : "Pendiente"}
                </p>
              </a>
            ))}
          </div>

          {selected?.yaRespondio ? (
            <SurveyCard className="border-success/30 bg-success/5 p-6 text-center">
              <CheckCircle className="mx-auto mb-2 h-10 w-10 text-success" />
              <p className="font-semibold text-success">Ya respondiste la encuesta de este curso.</p>
              <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">Gracias por tu participación.</p>
            </SurveyCard>
          ) : selected ? (
            <form action={enviarEncuestaDocenteFormAction} className="space-y-5">
              <input type="hidden" name="asignaturaId" value={selected.asignaturaId} />

              {/* Sección Docente */}
              <SurveyCard className="p-5 sm:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
                  <span className="rounded-lg bg-primary/10 p-1.5 text-primary">👩‍🏫</span>
                  Evaluación del Docente
                </h2>
                <p className="mb-4 text-xs text-text-secondary dark:text-gray-400">
                  Evalúa cada afirmación con una escala de 1 (Muy en desacuerdo) a 7 (Muy de acuerdo).
                </p>
                <div className="space-y-3">
                  {PREGUNTAS_DOCENTE.map((pregunta, idx) => (
                    <LikertRow
                      key={`d${idx + 1}`}
                      name={`d${idx + 1}`}
                      label={`${idx + 1}. ${pregunta}`}
                      scale={7}
                    />
                  ))}
                </div>
              </SurveyCard>

              {/* Sección OTEC */}
              <SurveyCard className="p-5 sm:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
                  <span className="rounded-lg bg-amber-100 p-1.5 dark:bg-amber-900/30">🏫</span>
                  Evaluación de la OTEC
                </h2>
                <p className="mb-4 text-xs text-text-secondary dark:text-gray-400">
                  Evalúa cada afirmación con una escala de 1 (Muy en desacuerdo) a 7 (Muy de acuerdo).
                </p>
                <div className="space-y-3">
                  {PREGUNTAS_OTEC.map((pregunta, idx) => (
                    <LikertRow
                      key={`o${idx + 1}`}
                      name={`o${idx + 1}`}
                      label={`${idx + 1}. ${pregunta}`}
                      scale={7}
                    />
                  ))}
                </div>
              </SurveyCard>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark px-8 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-[background-color,border-color,color,box-shadow,opacity,transform] hover:shadow-lg active:scale-[0.98] sm:w-auto"
                >
                  <Star className="h-4 w-4" />
                  Enviar Evaluación
                </button>
              </div>
            </form>
          ) : null}
        </>
      )}
    </SurveyShell>
  );
}
