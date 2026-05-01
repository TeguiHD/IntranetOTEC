import type { EvaluacionParticipacionItem } from "@/actions/evaluaciones";

type EvaluacionParticipacionPanelProps = {
  participacion: EvaluacionParticipacionItem[];
};

const ESTADO_LABELS: Record<EvaluacionParticipacionItem["estado"], string> = {
  no_iniciado: "No iniciado",
  en_curso: "En curso",
  expirado: "Expirado",
  enviado: "Enviado",
  anulado: "Anulado",
};

const ESTADO_BADGES: Record<EvaluacionParticipacionItem["estado"], string> = {
  no_iniciado: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  en_curso: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  expirado: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  enviado: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  anulado: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
};

const formatDateTime = (value: Date | null): string => {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
};

export function EvaluacionParticipacionPanel({
  participacion,
}: EvaluacionParticipacionPanelProps) {
  if (participacion.length === 0) return null;

  const counts = participacion.reduce(
    (acc, item) => {
      acc[item.estado] += 1;
      return acc;
    },
    {
      no_iniciado: 0,
      en_curso: 0,
      expirado: 0,
      enviado: 0,
      anulado: 0,
    } satisfies Record<EvaluacionParticipacionItem["estado"], number>,
  );
  const requiereAtencion = participacion.filter(
    (item) => item.estado !== "enviado" && item.estado !== "anulado",
  );
  const enviados = counts.enviado;
  const total = participacion.length;
  const avance = total > 0 ? Math.round((enviados / total) * 100) : 0;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary dark:text-white">
            Participación de la evaluación
          </h3>
          <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
            Vista rápida para detectar alumnos sin iniciar, en curso o con intento expirado.
          </p>
        </div>
        <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
          {avance}% enviado
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(["enviado", "en_curso", "expirado", "no_iniciado", "anulado"] as const).map((estado) => (
          <div key={estado} className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
            <p className="text-lg font-bold tabular-nums text-text-primary dark:text-white">
              {counts[estado]}
            </p>
            <p className="mt-0.5 text-xs text-text-secondary dark:text-gray-400">
              {ESTADO_LABELS[estado]}
            </p>
          </div>
        ))}
      </div>

      {requiereAtencion.length > 0 ? (
        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          {requiereAtencion.slice(0, 8).map((item) => (
            <div key={item.matriculaId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-primary dark:text-white">
                  {item.alumnoApellido}, {item.alumnoNombre}
                </p>
                <p className="text-xs text-text-secondary dark:text-gray-400">
                  Intento {item.ultimoIntento ?? "-"} · {formatDateTime(item.ultimaActividadAt)}
                </p>
              </div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_BADGES[item.estado]}`}>
                {ESTADO_LABELS[item.estado]}
              </span>
            </div>
          ))}
          {requiereAtencion.length > 8 ? (
            <p className="pt-3 text-xs text-text-secondary dark:text-gray-400">
              +{requiereAtencion.length - 8} alumnos adicionales requieren seguimiento.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Todos los alumnos activos ya enviaron o tienen el intento resuelto.
        </p>
      )}
    </section>
  );
}
