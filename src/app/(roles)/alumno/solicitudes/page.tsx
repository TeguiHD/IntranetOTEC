import {
  listarSolicitudesDocumentosAlumno,
  solicitarDocumentoAlumnoFormAction,
} from "@/actions/solicitudes-documentos";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  request_created: {
    tone: "success",
    text: "Solicitud enviada correctamente.",
  },
  already_pending: {
    tone: "error",
    text: "Ya existe una solicitud pendiente del mismo tipo.",
  },
  invalid_input: {
    tone: "error",
    text: "Datos inválidos en la solicitud.",
  },
  forbidden: {
    tone: "error",
    text: "No autorizado para esta acción.",
  },
  error: {
    tone: "error",
    text: "No fue posible registrar la solicitud. Intenta nuevamente.",
  },
};

const TIPO_LABELS: Record<string, string> = {
  credencial: "Credencial",
  alumno_regular: "Certificado de alumno regular",
  tarjeta_beneficio: "Tarjeta de beneficio",
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-warning/20 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  aprobada: "bg-success/15 text-green-700 dark:bg-green-950 dark:text-green-200",
  rechazada: "bg-danger/15 text-red-700 dark:bg-red-950 dark:text-red-200",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

type AlumnoSolicitudesPageProps = {
  searchParams?: {
    state?: string;
  };
};

export default async function AlumnoSolicitudesPage({
  searchParams,
}: AlumnoSolicitudesPageProps) {
  const solicitudes = await listarSolicitudesDocumentosAlumno();

  return (
    <section className="space-y-6">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-gray-100">
          Solicitudes de Documentos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Solicita credencial, certificado de alumno regular o tarjeta de beneficio.
        </p>
      </header>

      <article className="rounded-xl border border-primary/30 bg-primary/5 p-4 dark:border-primary/50 dark:bg-primary/10">
        <h2 className="text-sm font-semibold text-text-primary dark:text-gray-100">
          Información importante
        </h2>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          <div className="min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Solo puedes tener una solicitud pendiente por tipo de documento.
          </div>
          <div className="min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            El administrador revisará tu solicitud y la aprobará o rechazará.
          </div>
          <div className="min-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            Revisa el estado de tus solicitudes en la tabla inferior.
          </div>
        </div>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Nueva Solicitud
        </h2>

        <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="solicitud-tipo" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Tipo de documento <span className="text-danger">*</span>
            </label>
            <select
              id="solicitud-tipo"
              name="tipo"
              required
              defaultValue="credencial"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-text-primary focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="credencial">Credencial</option>
              <option value="alumno_regular">Certificado de alumno regular</option>
              <option value="tarjeta_beneficio">Tarjeta de beneficio</option>
            </select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label htmlFor="solicitud-observacion" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Observación (opcional)
            </label>
            <textarea
              id="solicitud-observacion"
              name="observacion"
              rows={3}
              maxLength={300}
              placeholder="Ej: Necesito el documento para trámite institucional"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-text-primary placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-11 rounded-lg bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
            >
              Enviar Solicitud
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Mis Solicitudes
        </h2>

        {solicitudes.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            Aún no tienes solicitudes registradas.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {solicitudes.map((solicitud) => (
                  <tr key={solicitud.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                      {TIPO_LABELS[solicitud.tipo] ?? solicitud.tipo}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[solicitud.estado] ?? ""}`}>
                        {ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                      {solicitud.createdAt ? new Date(solicitud.createdAt).toLocaleDateString("es-CL") : "-"}
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                      {solicitud.observacion ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
