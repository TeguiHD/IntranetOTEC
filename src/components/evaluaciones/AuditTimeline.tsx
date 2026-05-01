import type { AuditoriaEventoLegible } from "@/actions/evaluaciones";

type AuditTimelineProps = {
  eventos: AuditoriaEventoLegible[];
};

const TIPO_DOT: Record<AuditoriaEventoLegible["tipo"], string> = {
  info: "bg-blue-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
};

function formatFechaAudit(value: Date | null): string {
  if (!value) return "–";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function AuditTimeline({ eventos }: AuditTimelineProps) {
  if (eventos.length === 0) return null;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <h3 className="mb-4 text-sm font-semibold text-text-primary dark:text-white">
        Historial de actividad
      </h3>
      <ol className="relative space-y-4 border-l-2 border-gray-100 pl-5 dark:border-gray-800">
        {eventos.map((ev) => (
          <li key={ev.id} className="relative">
            <span
              className={`absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900 ${TIPO_DOT[ev.tipo]}`}
            />
            <p className="text-sm text-text-primary dark:text-white">{ev.descripcion}</p>
            <p className="mt-0.5 text-xs text-text-muted dark:text-gray-500">
              {formatFechaAudit(ev.fecha)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
