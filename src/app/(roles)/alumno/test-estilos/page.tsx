import { Brain, CheckCircle } from "lucide-react";

import {
  enviarTestEstilosFormAction,
  obtenerIntentosTestEstilos,
  PREGUNTAS_AUDITIVO,
  PREGUNTAS_KINESTESICO,
  PREGUNTAS_VISUAL,
} from "@/actions/encuestas";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  test_submitted: { tone: "success", text: "Test enviado correctamente. Puedes ver tu estilo preferente en los resultados." },
  max_intentos_reached: { tone: "error", text: "Ya completaste el test 2 veces (máximo permitido)." },
  invalid_input: { tone: "error", text: "Datos inválidos. Asegúrate de responder todas las preguntas." },
  submit_failed: { tone: "error", text: "No fue posible guardar el test. Intenta nuevamente." },
};

type Props = {
  searchParams?: Promise<{ state?: string }>;
};

const ESCALA_LABELS: Record<number, string> = {
  1: "Nunca",
  2: "Casi nunca",
  3: "A veces",
  4: "Casi siempre",
  5: "Siempre",
};

function LikertRow5({ name, label }: { name: string; label: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/40">
      <p className="mb-3 text-sm font-medium text-text-primary dark:text-gray-200">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2, 3, 4, 5].map((val) => (
          <label key={val} className="flex cursor-pointer flex-col items-center gap-1">
            <input
              type="radio"
              name={name}
              value={String(val)}
              required
              className="peer sr-only"
            />
            <span className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white text-center transition-all peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white hover:border-primary/50 dark:border-gray-600 dark:bg-gray-900 dark:peer-checked:border-primary dark:peer-checked:bg-primary dark:peer-checked:text-white">
              <span className="text-sm font-bold leading-none">{val}</span>
              <span className="mt-0.5 text-[9px] leading-none opacity-70">{ESCALA_LABELS[val]?.split(" ")[0]}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export const metadata = { title: "Test de Estilos de Aprendizaje" };

export default async function AlumnoTestEstilosPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const intentos = await obtenerIntentosTestEstilos();
  const agotado = intentos >= 2;

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Test de Estilos de Aprendizaje
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Identifica tu forma de aprender. Escala: 1 = Nunca · 5 = Siempre. Puedes realizarlo máximo 2 veces.
        </p>
        {intentos > 0 && (
          <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Intentos realizados: {intentos}/2
          </p>
        )}
      </header>

      {agotado ? (
        <div className="rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-success" />
          <p className="font-semibold text-success">Ya completaste el test el máximo de veces.</p>
          <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
            Consulta tus resultados con tu docente o en administración.
          </p>
        </div>
      ) : (
        <form action={enviarTestEstilosFormAction} className="space-y-5">
          {/* Estilo Visual */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
              <span className="rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/30">👁️</span>
              Estilo Visual
              <span className="text-sm font-normal text-text-secondary dark:text-gray-400">(aprendes viendo)</span>
            </h2>
            <p className="mb-4 text-xs text-text-secondary dark:text-gray-400">
              1 = Nunca &nbsp;·&nbsp; 2 = Casi nunca &nbsp;·&nbsp; 3 = A veces &nbsp;·&nbsp; 4 = Casi siempre &nbsp;·&nbsp; 5 = Siempre
            </p>
            <div className="space-y-3">
              {PREGUNTAS_VISUAL.map((pregunta, idx) => (
                <LikertRow5
                  key={`v${idx + 1}`}
                  name={`v${idx + 1}`}
                  label={`${idx + 1}. ${pregunta}`}
                />
              ))}
            </div>
          </article>

          {/* Estilo Auditivo */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
              <span className="rounded-lg bg-green-100 p-1.5 dark:bg-green-900/30">🎧</span>
              Estilo Auditivo
              <span className="text-sm font-normal text-text-secondary dark:text-gray-400">(aprendes escuchando)</span>
            </h2>
            <p className="mb-4 text-xs text-text-secondary dark:text-gray-400">
              1 = Nunca &nbsp;·&nbsp; 2 = Casi nunca &nbsp;·&nbsp; 3 = A veces &nbsp;·&nbsp; 4 = Casi siempre &nbsp;·&nbsp; 5 = Siempre
            </p>
            <div className="space-y-3">
              {PREGUNTAS_AUDITIVO.map((pregunta, idx) => (
                <LikertRow5
                  key={`a${idx + 1}`}
                  name={`a${idx + 1}`}
                  label={`${idx + 1}. ${pregunta}`}
                />
              ))}
            </div>
          </article>

          {/* Estilo Kinestésico */}
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-text-primary dark:text-white">
              <span className="rounded-lg bg-purple-100 p-1.5 dark:bg-purple-900/30">🤸</span>
              Estilo Kinestésico
              <span className="text-sm font-normal text-text-secondary dark:text-gray-400">(aprendes haciendo)</span>
            </h2>
            <p className="mb-4 text-xs text-text-secondary dark:text-gray-400">
              1 = Nunca &nbsp;·&nbsp; 2 = Casi nunca &nbsp;·&nbsp; 3 = A veces &nbsp;·&nbsp; 4 = Casi siempre &nbsp;·&nbsp; 5 = Siempre
            </p>
            <div className="space-y-3">
              {PREGUNTAS_KINESTESICO.map((pregunta, idx) => (
                <LikertRow5
                  key={`k${idx + 1}`}
                  name={`k${idx + 1}`}
                  label={`${idx + 1}. ${pregunta}`}
                />
              ))}
            </div>
          </article>

          <div className="flex justify-end">
            <button
              type="submit"
              className="flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:bg-primary-dark hover:shadow-lg active:scale-[0.98]"
            >
              <Brain className="h-4 w-4" />
              Enviar Test
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
