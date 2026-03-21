import {
  listarSolicitudesDocumentosAlumno,
  solicitarDocumentoAlumnoFormAction,
} from "@/actions/solicitudes-documentos";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  request_created: {
    tone: "success",
    text: "Solicitud enviada correctamente. Será revisada en las próximas 48 horas hábiles.",
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
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  aprobada: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  rechazada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

type AlumnoSolicitudesPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata = {
  title: "Solicitudes",
};

export default async function AlumnoSolicitudesPage(props: AlumnoSolicitudesPageProps) {
  const searchParams = await props.searchParams;
  const state = searchParams.state as string | undefined;
  const tipoParam = searchParams.tipo as string | undefined;
  const tipoValido = tipoParam === "credencial" || tipoParam === "alumno_regular" || tipoParam === "tarjeta_beneficio"
    ? tipoParam
    : "credencial";
  const solicitudes = await listarSolicitudesDocumentosAlumno();

  return (
    <section className="space-y-5">
      <RouteStateToast state={state} map={STATUS_MAP} />

      <header>
        <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
          Solicitudes de Documentos
        </h1>
        <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
          Solicita credencial, certificado de alumno regular o tarjeta de beneficio.
        </p>
      </header>

      {/* Información importante */}
      <article className="rounded-2xl border border-primary/20 bg-primary/5 p-4 dark:border-primary/30 dark:bg-primary/10">
        <h2 className="text-sm font-semibold text-text-primary dark:text-white">
          Información Importante
        </h2>
        <div className="mt-3 space-y-2 sm:flex sm:gap-3 sm:space-y-0 sm:overflow-x-auto sm:pb-1">
          <div className="rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 sm:min-w-[200px]">
            Solo puedes tener una solicitud pendiente por tipo de documento.
          </div>
          <div className="rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 sm:min-w-[200px]">
            El administrador revisará tu solicitud y la aprobará o rechazará en las próximas 48 horas hábiles.
          </div>
          <div className="rounded-xl border border-gray-200/80 bg-white px-3 py-2.5 text-xs text-text-secondary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 sm:min-w-[200px]">
            Revisa el estado de tus solicitudes en la sección inferior.
          </div>
        </div>
      </article>

      {/* Form: Nueva solicitud */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Nueva Solicitud
        </h2>

        <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="solicitud-tipo" className="text-sm font-medium text-text-primary dark:text-gray-200">
                Tipo de documento <span className="text-danger">*</span>
              </label>
              <select
                id="solicitud-tipo"
                name="tipo"
                required
                defaultValue={tipoValido}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-primary-light dark:focus:ring-primary/30"
              >
                <option value="credencial">Credencial</option>
                <option value="alumno_regular">Certificado de alumno regular</option>
                <option value="tarjeta_beneficio">Tarjeta de beneficio</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="solicitud-observacion" className="text-sm font-medium text-text-primary dark:text-gray-200">
              Observación (opcional)
            </label>
            <textarea
              id="solicitud-observacion"
              name="observacion"
              rows={3}
              maxLength={300}
              placeholder="Ej: Necesito el documento para trámite institucional"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-primary-light dark:focus:ring-primary/30"
            />
          </div>

          <button
            type="submit"
            className="h-12 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark px-6 text-sm font-semibold text-white shadow-md shadow-primary/20 transition-colors hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
          >
            Enviar Solicitud
          </button>
        </form>
      </article>

      {/* List: Mis solicitudes */}
      <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <h2 className="text-base font-semibold text-text-primary dark:text-white sm:text-lg">
          Mis Solicitudes
        </h2>

        {solicitudes.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            Aún no tienes solicitudes registradas.
          </p>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="mt-4 space-y-3 sm:hidden">
              {solicitudes.map((solicitud) => (
                <div key={solicitud.id} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-text-primary dark:text-white">
                      {TIPO_LABELS[solicitud.tipo] ?? solicitud.tipo}
                    </p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[solicitud.estado] ?? ""}`}>
                      {ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                    {solicitud.createdAt ? new Date(solicitud.createdAt).toLocaleDateString("es-CL") : "-"}
                  </p>
                  {solicitud.observacion ? (
                    <p className="mt-2 text-sm text-text-secondary dark:text-gray-400">
                      {solicitud.observacion}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-400">
                    <th className="px-3 py-2.5">Documento</th>
                    <th className="px-3 py-2.5">Estado</th>
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {solicitudes.map((solicitud) => (
                    <tr key={solicitud.id} className="transition-colors hover:bg-primary/3 dark:hover:bg-primary/5">
                      <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                        {TIPO_LABELS[solicitud.tipo] ?? solicitud.tipo}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[solicitud.estado] ?? ""}`}>
                          {ESTADO_LABELS[solicitud.estado] ?? solicitud.estado}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {solicitud.createdAt ? new Date(solicitud.createdAt).toLocaleDateString("es-CL") : "-"}
                      </td>
                      <td className="px-3 py-3 text-text-secondary dark:text-gray-400">
                        {solicitud.observacion ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </article>
    </section>
  );
}
