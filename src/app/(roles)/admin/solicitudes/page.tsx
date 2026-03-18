import {
  listarSolicitudesDocumentosAdmin,
  resolverSolicitudAdminFormAction,
} from "@/actions/solicitudes-documentos";
import { RouteStateToast } from "@/components/shared/RouteStateToast";
import { formatearRut } from "@/lib/rut";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  solicitud_aprobada: { tone: "success", text: "Solicitud aprobada correctamente." },
  solicitud_rechazada: { tone: "success", text: "Solicitud rechazada correctamente." },
  already_resolved: { tone: "error", text: "La solicitud ya fue resuelta anteriormente." },
  not_found: { tone: "error", text: "Solicitud no encontrada." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  forbidden: { tone: "error", text: "No autorizado para esta acción." },
  error: { tone: "error", text: "No fue posible completar la acción." },
};

const TIPO_LABELS: Record<string, string> = {
  credencial: "Credencial",
  alumno_regular: "Certificado alumno regular",
  tarjeta_beneficio: "Tarjeta de beneficio",
};

const ESTADO_STYLES: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  aprobada: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  rechazada: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

type AdminSolicitudesPageProps = {
  searchParams?: {
    state?: string;
  };
};

export default async function AdminSolicitudesPage({ searchParams }: AdminSolicitudesPageProps) {
  const solicitudes = await listarSolicitudesDocumentosAdmin();

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const resueltas = solicitudes.filter((s) => s.estado !== "pendiente");

  return (
    <section className="space-y-6">
      <RouteStateToast state={searchParams?.state} map={STATUS_MAP} />

      <header>
        <h1 className="text-2xl font-bold uppercase text-text-primary dark:text-gray-100">
          Solicitudes de Documentos
        </h1>
        <p className="text-sm text-text-secondary dark:text-gray-300">
          Gestiona las solicitudes de credencial, certificado de alumno regular y tarjeta de beneficio.
        </p>
      </header>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Pendientes ({pendientes.length})
        </h2>

        {pendientes.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay solicitudes pendientes.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {pendientes.map((solicitud) => (
              <div
                key={solicitud.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary dark:text-gray-100">
                      {solicitud.alumnoNombre} {solicitud.alumnoApellido}
                    </p>
                    <p className="text-sm text-text-secondary dark:text-gray-300">
                      {solicitud.alumnoRut
                        ? solicitud.alumnoRut.startsWith("EXT-")
                          ? `Ext: ${solicitud.alumnoRut.replace("EXT-", "")}`
                          : formatearRut(solicitud.alumnoRut)
                        : "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-light">
                      {TIPO_LABELS[solicitud.tipo] ?? solicitud.tipo}
                    </span>
                    <p className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                      {solicitud.createdAt
                        ? new Date(solicitud.createdAt).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "-"}
                    </p>
                  </div>
                </div>

                {solicitud.observacion ? (
                  <p className="mt-2 text-sm text-text-secondary dark:text-gray-300">
                    Observación del alumno: {solicitud.observacion}
                  </p>
                ) : null}

                <div className="mt-3 flex gap-2">
                  <form action={resolverSolicitudAdminFormAction}>
                    <input type="hidden" name="solicitudId" value={solicitud.id} />
                    <input type="hidden" name="estado" value="aprobada" />
                    <button
                      type="submit"
                      className="rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-success/90 focus:ring-2 focus:ring-success/50"
                    >
                      Aprobar
                    </button>
                  </form>
                  <form action={resolverSolicitudAdminFormAction}>
                    <input type="hidden" name="solicitudId" value={solicitud.id} />
                    <input type="hidden" name="estado" value="rechazada" />
                    <button
                      type="submit"
                      className="rounded-lg border border-danger/40 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus:ring-2 focus:ring-danger/50 dark:text-red-300"
                    >
                      Rechazar
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-text-primary dark:text-gray-100">
          Historial
        </h2>

        {resueltas.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary dark:text-gray-400">
            No hay solicitudes resueltas aún.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-secondary dark:text-gray-300">
                  <th className="px-3 py-2">Alumno</th>
                  <th className="px-3 py-2">Documento</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Fecha solicitud</th>
                  <th className="px-3 py-2">Fecha resolución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {resueltas.map((s) => (
                  <tr key={s.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-3 py-3 font-medium text-text-primary dark:text-gray-100">
                      {s.alumnoNombre} {s.alumnoApellido}
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                      {TIPO_LABELS[s.tipo] ?? s.tipo}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_STYLES[s.estado] ?? ""}`}>
                        {s.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                      {s.createdAt ? new Date(s.createdAt).toLocaleDateString("es-CL") : "-"}
                    </td>
                    <td className="px-3 py-3 text-text-secondary dark:text-gray-300">
                      {s.resueltoAt ? new Date(s.resueltoAt).toLocaleDateString("es-CL") : "-"}
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
