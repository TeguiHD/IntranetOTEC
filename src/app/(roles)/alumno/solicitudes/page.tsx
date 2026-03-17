import {
  listarSolicitudesDocumentosAlumno,
  solicitarDocumentoAlumnoFormAction,
} from "@/actions/solicitudes-documentos";

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
  const state = typeof searchParams?.state === "string" ? searchParams.state : undefined;
  const banner = state ? STATUS_MAP[state] ?? STATUS_MAP.error : null;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary dark:text-gray-100">
          Solicitudes de documentos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Solicita credencial, certificado de alumno regular o tarjeta de beneficio.
        </p>
      </header>

      {banner ? (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            banner.tone === "success"
              ? "border-success/30 bg-success/10 text-text-primary dark:border-green-700 dark:bg-green-950 dark:text-green-100"
              : "border-danger/30 bg-danger/10 text-text-primary dark:border-red-700 dark:bg-red-950 dark:text-red-100"
          }`}
          role="status"
        >
          {banner.text}
        </div>
      ) : null}

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Nueva solicitud
        </h2>

        <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="solicitud-tipo" className="text-sm font-medium text-text-primary dark:text-gray-100">
              Tipo de documento
            </label>
            <select
              id="solicitud-tipo"
              name="tipo"
              required
              defaultValue="credencial"
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
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
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-text-primary focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-10 rounded bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Enviar solicitud
            </button>
          </div>
        </form>
      </article>

      <article className="rounded-md border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Mis solicitudes
        </h2>

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
              {solicitudes.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-text-secondary dark:text-gray-300" colSpan={4}>
                    Aún no tienes solicitudes registradas.
                  </td>
                </tr>
              ) : (
                solicitudes.map((solicitud) => (
                  <tr key={solicitud.id}>
                    <td className="px-3 py-2 text-text-primary dark:text-gray-100">
                      {TIPO_LABELS[solicitud.tipo] ?? solicitud.tipo}
                    </td>
                    <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                      {ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
                    </td>
                    <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                      {solicitud.createdAt ? new Date(solicitud.createdAt).toLocaleString("es-CL") : "-"}
                    </td>
                    <td className="px-3 py-2 text-text-secondary dark:text-gray-300">
                      {solicitud.observacion ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
