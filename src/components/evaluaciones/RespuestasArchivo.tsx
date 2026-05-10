import { formatearRut } from "@/lib/rut";
import type { RespuestasArchivoAlumno } from "@/actions/evaluaciones";

type Props = {
  respuestas: RespuestasArchivoAlumno[];
};

const formatDateTime = (value: Date | null): string =>
  value
    ? new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(value)
    : "-";

const formatRespuesta = (respuesta: string | null, opciones: unknown): string => {
  if (!respuesta) return "Sin respuesta";
  const optionIndex = Number.parseInt(respuesta, 10);
  const optionList =
    opciones &&
    typeof opciones === "object" &&
    "opciones" in opciones &&
    Array.isArray((opciones as { opciones?: unknown }).opciones)
      ? (opciones as { opciones: string[] }).opciones
      : null;

  if (optionList && Number.isInteger(optionIndex) && optionList[optionIndex]) {
    return `${String.fromCharCode(65 + optionIndex)}. ${optionList[optionIndex]}`;
  }

  if (respuesta === "true") return "Verdadero";
  if (respuesta === "false") return "Falso";
  return respuesta;
};

export function RespuestasArchivo({ respuestas }: Props) {
  if (respuestas.length === 0) {
    return (
      <article className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-text-secondary shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
        Aun no hay respuestas archivadas para esta evaluacion.
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-text-primary dark:text-white">
          Archivo de respuestas
        </h3>
        <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
          Carpetas por alumno con todas las respuestas guardadas, aunque la prueba se deshabilite.
        </p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {respuestas.map((alumno) => (
          <details key={alumno.matriculaId} className="group">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary dark:text-white">
                  {alumno.alumnoApellido}, {alumno.alumnoNombre}
                </span>
                <span className="block text-xs text-text-secondary dark:text-gray-400">
                  {alumno.alumnoRut ? formatearRut(alumno.alumnoRut) : "Sin RUT"} · {alumno.respuestas.length} respuesta(s)
                </span>
              </span>
              <span className="flex items-center gap-2 text-xs text-text-secondary dark:text-gray-400">
                <span>{formatDateTime(alumno.ultimaRespuestaAt)}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 font-semibold dark:bg-gray-800">
                  {alumno.nota ? `Nota ${alumno.nota}` : "Sin nota"}
                </span>
              </span>
            </summary>
            <div className="space-y-3 px-5 pb-5">
              {alumno.observacion ? (
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                  {alumno.observacion}
                </p>
              ) : null}
              {alumno.respuestas.map((item, index) => (
                <div
                  key={item.respuestaId}
                  className="rounded-lg border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800 dark:bg-gray-800/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm font-medium text-text-primary dark:text-gray-100">
                      {index + 1}. {item.enunciado}
                    </p>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-text-secondary dark:bg-gray-900 dark:text-gray-400">
                      Intento {item.intento ?? 1}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap rounded-md border-l-4 border-primary/30 bg-white px-3 py-2 text-sm text-text-primary dark:bg-gray-900 dark:text-gray-100">
                    {formatRespuesta(item.respuesta, item.opciones)}
                  </p>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </article>
  );
}
