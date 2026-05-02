import { IdCard } from "lucide-react";

import { obtenerAccesoDocumentosAlumnoActual } from "@/actions/accesos-documentos";
import {
  listarSolicitudesDocumentosAlumno,
  solicitarDocumentoAlumnoFormAction,
} from "@/actions/solicitudes-documentos";
import { HistorialSolicitudes } from "@/components/solicitudes/HistorialSolicitudes";
import { RouteStateToast } from "@/components/shared/RouteStateToast";

const STATUS_MAP: Record<string, { tone: "success" | "error"; text: string }> = {
  request_created: { tone: "success", text: "Solicitud de credencial enviada. Revisión en 48 horas hábiles." },
  already_pending: { tone: "error", text: "Ya tienes una solicitud de credencial pendiente." },
  invalid_input: { tone: "error", text: "Datos inválidos." },
  access_disabled: { tone: "error", text: "La credencial no está habilitada para tu usuario o curso." },
  forbidden: { tone: "error", text: "No autorizado." },
  error: { tone: "error", text: "No fue posible registrar la solicitud." },
};

type Props = { searchParams?: Promise<{ state?: string }> };

export const metadata = { title: "Solicitud de Credencial" };

export default async function SolicitudCredencialPage({ searchParams }: Props) {
  const params = await (searchParams ?? Promise.resolve({} as { state?: string }));
  const [solicitudes, accesos] = await Promise.all([
    listarSolicitudesDocumentosAlumno(),
    obtenerAccesoDocumentosAlumnoActual(),
  ]);
  const credencialHabilitada = accesos?.credencialHabilitada ?? true;

  return (
    <section className="space-y-5">
      <RouteStateToast state={params?.state} map={STATUS_MAP} />

      <header className="flex items-center gap-3">
        <span className="rounded-xl bg-primary/10 p-2 text-primary">
          <IdCard className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold uppercase text-text-primary dark:text-white sm:text-2xl">
            Credencial de Alumno
          </h1>
          <p className="text-sm text-text-secondary dark:text-gray-400">
            Solicita tu credencial de identificación institucional.
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-base font-semibold text-text-primary dark:text-white">
              Nueva Solicitud
            </h2>
            {credencialHabilitada ? (
              <>
                <p className="mt-1 text-sm text-text-secondary dark:text-gray-400">
                  Solo puedes tener una solicitud pendiente por tipo. El administrador la revisará en 48 horas hábiles.
                </p>
                <form action={solicitarDocumentoAlumnoFormAction} className="mt-4 space-y-4">
                  <input type="hidden" name="tipo" value="credencial" />
                  <div className="space-y-1.5">
                    <label htmlFor="obs-credencial" className="text-sm font-medium text-text-primary dark:text-gray-200">
                      Observación <span className="text-text-muted dark:text-gray-500">(opcional)</span>
                    </label>
                    <textarea
                      id="obs-credencial"
                      name="observacion"
                      rows={3}
                      maxLength={300}
                      placeholder="Ej: Necesito la credencial para acceso institucional"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-text-primary placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-gradient-to-r from-primary to-primary-dark text-sm font-semibold text-white shadow-md shadow-primary/20 transition-all hover:shadow-lg active:scale-[0.98]"
                  >
                    Solicitar Credencial
                  </button>
                </form>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-900/20 dark:text-amber-200">
                La solicitud de credencial no está habilitada para tu usuario o curso. Contacta a administración si necesitas activarla.
              </div>
            )}
          </article>
        </div>

        <article className="rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-base font-semibold text-text-primary dark:text-white">
            Historial de Solicitudes
          </h2>
          <HistorialSolicitudes solicitudes={solicitudes} tipoFiltro="credencial" />
        </article>
      </div>
    </section>
  );
}
